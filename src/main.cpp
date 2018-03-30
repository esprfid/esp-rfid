/*
    Authors :   Ömer Şiar Baysal
                ESP-RFID Community

   Released to Public Domain

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   THE SOFTWARE.
 */

#include <Arduino.h>

#include <ESP8266WiFi.h>
#include <SPI.h>
#include <ESP8266mDNS.h>
#include <MFRC522.h>
#include <Wiegand.h>
#include <ArduinoJson.h>
#include <FS.h>
#include <ESPAsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <TimeLib.h>
#include <Ticker.h>

#include <Ntp.h>
#include <PN532.h>
#include <AsyncMqttClient.h>

// these are from vendors
#include "webh/glyphicons-halflings-regular.woff.gz.h"
#include "webh/required.css.gz.h"
#include "webh/required.js.gz.h"

// these are from us which can be updated and changed
#include "webh/esprfid.js.gz.h"
#include "webh/esprfid.htm.gz.h"
#include "webh/index.html.gz.h"


#ifdef ESP8266
extern "C" {
#include "user_interface.h"  // Used to get Wifi status information
}
#endif

// #define DEBUG

// Create instance for Wiegand reade
WIEGAND wg;
// Create MFRC522 RFID instance
MFRC522 mfrc522 = MFRC522();

PN532 pn532;

NtpClient NTP;

AsyncMqttClient mqttClient;

Ticker mqttReconnectTimer;

WiFiEventHandler wifiDisconnectHandler;

// Create AsyncWebServer instance on port "80"
AsyncWebServer server(80);
// Create WebSocket instance on URL "/ws"
AsyncWebSocket ws("/ws");



// Variables for whole scope
const char * http_username = "admin";
char *http_pass = NULL;
unsigned long previousMillis = 0;
unsigned long previousLoopMillis = 0;
unsigned long cooldown = 0;
bool shouldReboot = false;
bool activateRelay = false;
bool inAPMode = false;
bool isWifiConnected = false;
int autoRestartIntervalSeconds = 0;
// Variable to hold the last modification datetime
char last_modified[50];

bool wifiDisabled = true;
bool doDisableWifi = false;
bool doEnableWifi = false;
bool timerequest = false;
bool formatreq = false;
int wifiTimeout = -1;
unsigned long wiFiUptimeMillis = 0;
char * deviceHostname = NULL;

int mqttenabled = 0;
char *mqttTopic = NULL;

int rfidss;
int readerType;
int relayPin;
int relayType;
int activateTime;
int timeZone;



/* ------------------ TRIVIAL Functions ------------------- */
String ICACHE_FLASH_ATTR printIP(IPAddress adress) {
    return (String)adress[0] + "." + (String)adress[1] + "." + (String)adress[2] + "." + (String)adress[3];
}

/*
time_t ICACHE_FLASH_ATTR checkTimeSync() {
    if (nextSyncTime <= sysTime) {
        timerequest = true;
        return millis();
    }
    else {
        return now();
    }
}*/

void ICACHE_FLASH_ATTR writeEvent(String type, String src, String desc, String data) {
    DynamicJsonBuffer jsonBuffer44333;
    JsonObject& root = jsonBuffer44333.createObject();
    root["type"] = type;
    root["src"] = src;
    root["desc"] = desc;
    root["data"] = data;
    root["time"] = now();
    File eventlog = SPIFFS.open("/eventlog.json", "a");
    root.printTo(eventlog);
    eventlog.print("\n");
    eventlog.close();
}

void ICACHE_FLASH_ATTR writeLatest(String uid, String username, int acctype) {
    DynamicJsonBuffer jsonBuffer;
    JsonObject& root = jsonBuffer.createObject();
    root["uid"] = uid;
    root["username"] = username;
    root["acctype"] = acctype;
    root["timestamp"] = now();
    File latestlog = SPIFFS.open("/latestlog.json", "a");
    root.printTo(latestlog);
    latestlog.print("\n");
    latestlog.close();
}

void ICACHE_FLASH_ATTR sendEventLog(int page) {
    DynamicJsonBuffer jsonBuffer44332;
    JsonObject& root = jsonBuffer44332.createObject();
    root["command"] = "eventlist";
    root["page"] = page;
    JsonArray& items = root.createNestedArray("list");
    File eventlog = SPIFFS.open("/eventlog.json", "r");
    int first = (page - 1) * 10;
    int last = page * 10;
    int i = 0;
    while (eventlog.available()) {
        String item = String();
        item = eventlog.readStringUntil('\n');
        if (i >= first && i < last) {
            items.add(item);
        }
        i++;
    }
    eventlog.close();
    float pages = i / 10.0;
    root["haspages"] = ceil(pages);
    size_t len = root.measureLength();
    AsyncWebSocketMessageBuffer * buffer = ws.makeBuffer(len); //  creates a buffer (len + 1) for you.
    if (buffer) {
        root.printTo((char *)buffer->get(), len + 1);
        ws.textAll(buffer);
        ws.textAll("{\"command\":\"result\",\"resultof\":\"eventlist\",\"result\": true}");
    }
}

void ICACHE_FLASH_ATTR sendLatestLog(int page) {
    DynamicJsonBuffer jsonBuffer44332;
    JsonObject& root = jsonBuffer44332.createObject();
    root["command"] = "latestlist";
    root["page"] = page;
    JsonArray& items = root.createNestedArray("list");
    File latestlog = SPIFFS.open("/latestlog.json", "r");
    int first = (page - 1) * 10;
    int last = page * 10;
    int i = 0;
    while (latestlog.available()) {
        String item = String();
        item = latestlog.readStringUntil('\n');
        if (i >= first && i < last) {
            items.add(item);
        }
        i++;
    }
    latestlog.close();
    float pages = i / 10.0;
    root["haspages"] = ceil(pages);
    size_t len = root.measureLength();
    AsyncWebSocketMessageBuffer * buffer = ws.makeBuffer(len); //  creates a buffer (len + 1) for you.
    if (buffer) {
        root.printTo((char *)buffer->get(), len + 1);
        ws.textAll(buffer);
        ws.textAll("{\"command\":\"result\",\"resultof\":\"latestlist\",\"result\": true}");
    }
}

void ICACHE_FLASH_ATTR sendUserList(int page, AsyncWebSocketClient * client) {
    DynamicJsonBuffer jsonBuffer443;
    JsonObject& root = jsonBuffer443.createObject();
    root["command"] = "userlist";
    root["page"] = page;
    JsonArray& users = root.createNestedArray("list");
    Dir dir = SPIFFS.openDir("/P/");
    int first = (page - 1) * 15;
    int last = page * 15;
    int i = 0;
    while (dir.next()) {
        if (i >= first && i < last) {
            JsonObject& item = users.createNestedObject();
            String uid = dir.fileName();
            uid.remove(0, 3);
            item["uid"] = uid;
            File f = SPIFFS.open(dir.fileName(), "r");
            size_t size = f.size();
            // Allocate a buffer to store contents of the file.
            std::unique_ptr<char[]> buf(new char[size]);
            // We don't use String here because ArduinoJson library requires the input
            // buffer to be mutable. If you don't use ArduinoJson, you may as well
            // use configFile.readString instead.
            f.readBytes(buf.get(), size);
            DynamicJsonBuffer jsonBuffer2;
            JsonObject& json = jsonBuffer2.parseObject(buf.get());
            if (json.success()) {
                String username = json["user"];
                int AccType = json["acctype"];
                unsigned long validuntil = json["validuntil"];
                item["username"] = username;
                item["acctype"] = AccType;
                item["validuntil"] = validuntil;
            }
        }
        i++;
    }
    float pages = i / 15.0;
    root["haspages"] = ceil(pages);
    size_t len = root.measureLength();
    AsyncWebSocketMessageBuffer * buffer = ws.makeBuffer(len); //  creates a buffer (len + 1) for you.
    if (buffer) {
        root.printTo((char *)buffer->get(), len + 1);
        if (client) {
            client->text(buffer);
            client->text("{\"command\":\"result\",\"resultof\":\"userlist\",\"result\": true}");
        } else {
            ws.textAll("{\"command\":\"result\",\"resultof\":\"userlist\",\"result\": false}");
        }
    }
}

/* ------------------ Other Functions ------------------- */
// Send system status on a WS request
void ICACHE_FLASH_ATTR sendStatus() {
    struct ip_info info;
    FSInfo fsinfo;
    if (!SPIFFS.info(fsinfo)) {
#ifdef DEBUG
        Serial.print(F("[ WARN ] Error getting info on SPIFFS"));
#endif
    }
    DynamicJsonBuffer jsonBuffer567;
    JsonObject& root = jsonBuffer567.createObject();
    root["command"] = "status";

    root["heap"] = ESP.getFreeHeap();
    root["chipid"] = String(ESP.getChipId(), HEX);
    root["cpu"] = ESP.getCpuFreqMHz();
    root["availsize"] = ESP.getFreeSketchSpace();
    root["availspiffs"] = fsinfo.totalBytes - fsinfo.usedBytes;
    root["spiffssize"] = fsinfo.totalBytes;
    root["uptime"] = NTP.getDeviceUptimeString();

    if (inAPMode) {
        wifi_get_ip_info(SOFTAP_IF, &info);
        struct softap_config conf;
        wifi_softap_get_config(&conf);
        root["ssid"] = String(reinterpret_cast<char*>(conf.ssid));
        root["dns"] = printIP(WiFi.softAPIP());
        root["mac"] = WiFi.softAPmacAddress();
    }
    else {
        wifi_get_ip_info(STATION_IF, &info);
        struct station_config conf;
        wifi_station_get_config(&conf);
        root["ssid"] = String(reinterpret_cast<char*>(conf.ssid));
        root["dns"] = printIP(WiFi.dnsIP());
        root["mac"] = WiFi.macAddress();
    }

    IPAddress ipaddr = IPAddress(info.ip.addr);
    IPAddress gwaddr = IPAddress(info.gw.addr);
    IPAddress nmaddr = IPAddress(info.netmask.addr);
    root["ip"] = printIP(ipaddr);
    root["gateway"] = printIP(gwaddr);
    root["netmask"] = printIP(nmaddr);

    size_t len = root.measureLength();
    AsyncWebSocketMessageBuffer * buffer = ws.makeBuffer(len); //  creates a buffer (len + 1) for you.
    if (buffer) {
        root.printTo((char *)buffer->get(), len + 1);
        ws.textAll(buffer);
    }
}

// Send Scanned SSIDs to websocket clients as JSON object
void ICACHE_FLASH_ATTR printScanResult(int networksFound) {
    // sort by RSSI
    int n = networksFound;
    int indices[n];
    int skip[n];
    for (int i = 0; i < networksFound; i++) {
        indices[i] = i;
    }
    for (int i = 0; i < networksFound; i++) {
        for (int j = i + 1; j < networksFound; j++) {
            if (WiFi.RSSI(indices[j]) > WiFi.RSSI(indices[i])) {
                //int temp = indices[j];
                //indices[j] = indices[i];
                //indices[i] = temp;
                std::swap(indices[i], indices[j]);
                std::swap(skip[i], skip[j]);
            }
        }
    }

    DynamicJsonBuffer jsonBuffer78;
    JsonObject& root = jsonBuffer78.createObject();
    root["command"] = "ssidlist";
    JsonArray& scan = root.createNestedArray("list");
    for (int i = 0; i < 5 && i < networksFound ; ++i) {
        JsonObject& item = scan.createNestedObject();
        // Print SSID for each network found
        item["ssid"] = WiFi.SSID(indices[i]);
        item["bssid"] = WiFi.BSSIDstr(indices[i]);
        item["rssi"] = WiFi.RSSI(indices[i]);
        item["channel"] = WiFi.channel(indices[i]);
        item["enctype"] = WiFi.encryptionType(indices[i]);
        item["hidden"] = WiFi.isHidden(indices[i]) ? true : false;
    }
    size_t len = root.measureLength();
    AsyncWebSocketMessageBuffer * buffer = ws.makeBuffer(len); //  creates a buffer (len + 1) for you.
    if (buffer) {
        root.printTo((char *)buffer->get(), len + 1);
        ws.textAll(buffer);
    }
    WiFi.scanDelete();
}

void connectToMqtt() {
    mqttClient.connect();
}

void ICACHE_FLASH_ATTR sendTime() {
    DynamicJsonBuffer jsonBuffer231;
    JsonObject& root = jsonBuffer231.createObject();
    root["command"] = "gettime";
    root["epoch"] = now();
    root["timezone"] = timeZone;
    size_t len = root.measureLength();
    AsyncWebSocketMessageBuffer * buffer = ws.makeBuffer(len); //  creates a buffer (len + 1) for you.
    if (buffer) {
        root.printTo((char *)buffer->get(), len + 1);
        ws.textAll(buffer);
    }
}

void ICACHE_FLASH_ATTR parseBytes(const char* str, char sep, byte* bytes, int maxBytes, int base) {
    for (int i = 0; i < maxBytes; i++) {
        bytes[i] = strtoul(str, NULL, base); // Convert byte
        str = strchr(str, sep);   // Find next separator
        if (str == NULL || *str == '\0') {
            break;          // No more separators, exit
        }
        str++;                    // Point to next character after separator
    }
}

void ICACHE_FLASH_ATTR disableWifi() {
    isWifiConnected = false;
    WiFi.disconnect(true);
#ifdef DEBUG
    Serial.println("Turn wifi off.");
#endif
}

bool ICACHE_FLASH_ATTR startAP(const char * ssid, const char * password = NULL, int hid = NULL) {
    inAPMode = true;
    WiFi.mode(WIFI_AP);
    Serial.print(F("[ INFO ] Configuring access point... "));
    bool success;
    if (hid == 1) {
        success = WiFi.softAP(ssid, password, 3, true);
    }
    else {
        success = WiFi.softAP(ssid, password);
    }
    Serial.println(success ? "Ready" : "Failed!");
    if (!success) {ESP.restart();}
    // Access Point IP
    IPAddress myIP = WiFi.softAPIP();
    Serial.print(F("[ INFO ] AP IP address: "));
    Serial.println(myIP);
    Serial.printf("[ INFO ] AP SSID: %s\n", ssid);
    isWifiConnected = success;
    return success;
}

// Fallback to AP Mode, so we can connect to ESP if there is no Internet connection
void ICACHE_FLASH_ATTR fallbacktoAPMode() {
    Serial.println(F("[ INFO ] ESP-RFID is running in Fallback AP Mode"));
    uint8_t macAddr[6];
    WiFi.softAPmacAddress(macAddr);
    char ssid[15];
    sprintf(ssid, "ESP-RFID-%02x%02x%02x", macAddr[3], macAddr[4], macAddr[5]);
    isWifiConnected = startAP(ssid);
}

// Try to connect Wi-Fi
bool ICACHE_FLASH_ATTR connectSTA(const char* ssid, const char* password, byte bssid[6]) {
    WiFi.disconnect(true);
    // First connect to a wi-fi network
    WiFi.begin(ssid, password, 0, bssid);
    // Inform user we are trying to connect
    Serial.print(F("[ INFO ] Trying to connect WiFi: "));
    Serial.print(ssid);
    // We try it for 20 seconds and give up on if we can't connect
    unsigned long now = millis();
    uint8_t timeout = 20; // define when to time out in seconds
    // Wait until we connect or 20 seconds pass
    do {
        if (WiFi.status() == WL_CONNECTED) {
            break;
        }
        delay(500);
        Serial.print(F("."));
    }
    while (millis() - now < timeout * 1000);
    // We now out of the while loop, either time is out or we connected. check what happened
    if (WiFi.status() == WL_CONNECTED) { // Assume time is out first and check
        Serial.println();
        Serial.print(F("[ INFO ] Client IP address: ")); // Great, we connected, inform
        Serial.println(WiFi.localIP());
        isWifiConnected = true;
        String data = ssid;
        data += " " + WiFi.localIP();
        writeEvent("INFO", "wifi", "WiFi is connected", data);
        return true;
    }
    else { // We couln't connect, time is out, inform
        Serial.println();
        Serial.println(F("[ WARN ] Couldn't connect in time"));
        return false;
    }
}

/* ------------------ RFID Functions ------------------- */
// RFID Specific Loop
void ICACHE_FLASH_ATTR rfidloop() {

    String uid = "";
    String type = "";

    // This way of constantly checking the reader type is simply not how it should be.. but leave it for now
    if (readerType == 0) {

        //If a new PICC placed to RFID reader continue
        if ( !mfrc522.PICC_IsNewCardPresent()) {
            delay(50);
            return;
        }
        //Since a PICC placed get Serial (UID) and continue
        if ( !mfrc522.PICC_ReadCardSerial()) {
            delay(50);
            return;
        }
        // We got UID tell PICC to stop responding
        mfrc522.PICC_HaltA();
        cooldown = millis() + 2000;

        // There are Mifare PICCs which have 4 byte or 7 byte UID
        // Get PICC's UID and store on a variable
        Serial.print(F("[ INFO ] PICC's UID: "));
        for (int i = 0; i < mfrc522.uid.size; ++i) {
            uid += String(mfrc522.uid.uidByte[i], HEX);
        }
        Serial.print(uid);
        // Get PICC type
        MFRC522::PICC_Type piccType = mfrc522.PICC_GetType(mfrc522.uid.sak);
        type = mfrc522.PICC_GetTypeName(piccType);
        Serial.print(" " + type);


    } else if (readerType == 1) {
        if (wg.available()) {
            Serial.print(F("[ INFO ] PICC's UID: "));
            Serial.println(wg.getCode());
            uid = String(wg.getCode(), HEX);
            type = String(wg.getWiegandType(), HEX);
            cooldown = millis() + 2000;
        } else {
            return;
        }
    } else if (readerType == 2) {
        bool found = false;
        byte pnuid[8] = {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
        eCardType e_CardType;

        byte     u8_UidLength = 0x00;   // UID = 4 or 7 bytes

        found = pn532.ReadPassiveTargetID(pnuid, &u8_UidLength, &e_CardType);

        if (found && u8_UidLength >= 4) {
            Serial.print(F("[ INFO ] PICC's UID: "));
            for (uint8_t i = 0; i < u8_UidLength; i++) {
                uid += String(pnuid[i], HEX);
            }
            Serial.print(uid);
            cooldown = millis() + 2000;
        } else {
            delay(50);
            return;
        }
    }
    if (mqttenabled == 1) {
        const char * topic = mqttTopic;
        mqttClient.publish(topic, 0, true, uid.c_str());
    }

    // We are going to use filesystem to store known UIDs.
    // If we know the PICC we need to know if its User have an Access
    int AccType = 0; // First assume User do not have access
    // Prepend /P/ on filename so we distinguish UIDs from the other files
    String filename = "/P/";
    filename += uid;

    File f = SPIFFS.open(filename, "r");
    // Check if we could find it above function returns true if the file is exist
    if (f) {
        // Now we need to read contents of the file to parse JSON object contains Username and Access Status
        size_t size = f.size();
        // Allocate a buffer to store contents of the file.
        std::unique_ptr<char[]> buf(new char[size]);
        // We don't use String here because ArduinoJson library requires the input
        // buffer to be mutable. If you don't use ArduinoJson, you may as well
        // use configFile.readString instead.
        f.readBytes(buf.get(), size);
        DynamicJsonBuffer jsonBuffer613;
        JsonObject& json = jsonBuffer613.parseObject(buf.get());
        // Check if we succesfully parse JSON object
        if (json.success()) {
            // Get username Access Status
            String username = json["user"];
            AccType = json["acctype"];
#ifdef DEBUG
            Serial.println(" = known PICC");
            Serial.print("[ INFO ] User Name: ");

            if (username == "undefined")
                Serial.print(uid);
            else
                Serial.print(username);
#endif

            // Check if user have an access
            if (AccType == 1) {
                activateRelay = true; // Give user Access to Door, Safe, Box whatever you like
                previousMillis = millis();
#ifdef DEBUG
                Serial.println(" have access");
#endif
            }
            else if (AccType == 99)
            {
                previousMillis = millis();
                doEnableWifi = true;
                activateRelay = true; // Give user Access to Door, Safe, Box whatever you like
#ifdef DEBUG
                Serial.println(" have admin access, enable wifi");
#endif
            }
            else {
#ifdef DEBUG
                Serial.println(" does not have access");
#endif
            }
            writeLatest(uid, username, AccType);
            // Also inform Administrator Portal
            // Encode a JSON Object and send it to All WebSocket Clients
            DynamicJsonBuffer jsonBuffer2222;
            JsonObject& root = jsonBuffer2222.createObject();
            root["command"] = "piccscan";
            // UID of Scanned RFID Tag
            root["uid"] = uid;
            // Type of PICC
            root["type"] = type;
            root["known"] = 1;
            root["acctype"] = AccType;
            // Username
            root["user"] = username;
            size_t len = root.measureLength();
            AsyncWebSocketMessageBuffer * buffer = ws.makeBuffer(len); //  creates a buffer (len + 1) for you.
            if (buffer) {
                root.printTo((char *)buffer->get(), len + 1);
                ws.textAll(buffer);
            }
        }
        else {
            Serial.println("");
            Serial.println(F("[ WARN ] Failed to parse User Data"));
        }
        f.close();

    }
    else {
        // If we don't know the UID, inform Administrator Portal so admin can give access or add it to database
        String data = String(uid);
        data += " " + String(type);
        writeEvent("WARN", "rfid", "Unknown rfid tag is scanned", data);
        writeLatest(uid, "Unknown", 98);
#ifdef DEBUG
        Serial.println(" = unknown PICC");
#endif
        DynamicJsonBuffer jsonBuffer2344;
        JsonObject& root = jsonBuffer2344.createObject();
        root["command"] = "piccscan";
        // UID of Scanned RFID Tag
        root["uid"] = uid;
        // Type of PICC
        root["type"] = type;
        root["known"] = 0;
        size_t len = root.measureLength();
        AsyncWebSocketMessageBuffer * buffer = ws.makeBuffer(len); //  creates a buffer (len + 1) for you.
        if (buffer) {
            root.printTo((char *)buffer->get(), len + 1);
            ws.textAll(buffer);
        }
    }
    // So far got we got UID of Scanned RFID Tag, checked it if it's on the database and access status, informed Administrator Portal
}

#ifdef DEBUG
void ICACHE_FLASH_ATTR ShowMFRC522ReaderDetails() {
    // Get the MFRC522 software version
    byte v = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);

    Serial.print(F("[ INFO ] MFRC522 Version: 0x"));
    Serial.print(v, HEX);
    if (v == 0x91)
        Serial.print(F(" = v1.0"));
    else if (v == 0x92)
        Serial.print(F(" = v2.0"));
    else if (v == 0x88)
        Serial.print(F(" = clone"));
    else
        Serial.print(F(" (unknown)"));
    Serial.println("");
    // When 0x00 or 0xFF is returned, communication probably failed
    if ((v == 0x00) || (v == 0xFF)) {
        Serial.println(F("[ WARN ] Communication failure, check if MFRC522 properly connected"));
    }
}
#endif

void ICACHE_FLASH_ATTR setupWiegandReader(int d0, int d1) {
    wg.begin(d0, d1);
}

// Configure RFID Hardware
void ICACHE_FLASH_ATTR setupMFRC522Reader(int rfidss, int rfidgain) {
    SPI.begin();     // MFRC522 Hardware uses SPI protocol
    mfrc522.PCD_Init(rfidss, UINT8_MAX); // Initialize MFRC522 Hardware
    // Set RFID Hardware Antenna Gain
    // This may not work with some boards
    mfrc522.PCD_SetAntennaGain(rfidgain);
#ifdef DEBUG
    Serial.printf("[ INFO ] RFID SS_PIN: %u and Gain Factor: %u", rfidss, rfidgain);
    Serial.println("");
#endif
#ifdef DEBUG
    ShowMFRC522ReaderDetails(); // Show details of PCD - MFRC522 Card Reader details
#endif
}


void ICACHE_FLASH_ATTR setupPN532Reader(int rfidss) {
    // init controller
    pn532.InitSoftwareSPI(14, 12, 13, rfidss, 0);
    do // pseudo loop (just used for aborting with break;)
    {
        // Reset the PN532
        pn532.begin(); // delay > 400 ms

        byte IC, VersionHi, VersionLo, Flags;
        if (!pn532.GetFirmwareVersion(&IC, &VersionHi, &VersionLo, &Flags))
            break;
#ifdef DEBUG
        char Buf[80];
        sprintf(Buf, "Chip: PN5%02X, Firmware version: %d.%d\r\n", IC, VersionHi, VersionLo);
        Utils::Print(Buf);
        sprintf(Buf, "Supports ISO 14443A:%s, ISO 14443B:%s, ISO 18092:%s\r\n", (Flags & 1) ? "Yes" : "No",
                (Flags & 2) ? "Yes" : "No",
                (Flags & 4) ? "Yes" : "No");
        Utils::Print(Buf);
#endif
        // Set the max number of retry attempts to read from a card.
        // This prevents us from waiting forever for a card, which is the default behaviour of the PN532.
        if (!pn532.SetPassiveActivationRetries())
            break;

        // configure the PN532 to read RFID tags
        if (!pn532.SamConfig())
            break;


    }
    while (false);
}





// Handles WebSocket Events
void ICACHE_FLASH_ATTR onWsEvent(AsyncWebSocket * server, AsyncWebSocketClient * client, AwsEventType type, void * arg, uint8_t *data, size_t len) {
    if (type == WS_EVT_ERROR) {
#ifdef DEBUG
        Serial.printf("[ WARN ] WebSocket[%s][%u] error(%u): %s\r\n", server->url(), client->id(), *((uint16_t*)arg), (char*)data);
#endif
    }
    else if (type == WS_EVT_DATA) {

        AwsFrameInfo * info = (AwsFrameInfo*)arg;
        String msg = "";

        if (info->final && info->index == 0 && info->len == len) {
            //the whole message is in a single frame and we got all of it's data
            for (size_t i = 0; i < info->len; i++) {
                msg += (char) data[i];
            }

            // We should always get a JSON object (stringfied) from browser, so parse it
            DynamicJsonBuffer jsonBuffer413;
            JsonObject& root = jsonBuffer413.parseObject(msg);
            if (!root.success()) {
#ifdef DEBUG
                Serial.println(F("[ WARN ] Couldn't parse WebSocket message"));
#endif
                return;

            }

            // Web Browser sends some commands, check which command is given
            const char * command = root["command"];

            // Check whatever the command is and act accordingly
            if (strcmp(command, "remove")  == 0) {
                const char* uid = root["uid"];
                String filename = "/P/";
                filename += uid;
                SPIFFS.remove(filename);
            }
            else if (strcmp(command, "configfile")  == 0) {
                File f = SPIFFS.open("/config.json", "w+");
                if (f) {
                    root.prettyPrintTo(f);
                    //f.print(msg);
                    f.close();
                    ESP.restart();
                }
            }
            else if (strcmp(command, "userlist")  == 0) {
                int page = root["page"];
                sendUserList(page, client);
            }
            else if (strcmp(command, "status")  == 0) {
                sendStatus();
            }
            else if (strcmp(command, "restart")  == 0) {
                shouldReboot = true;
            }
            else if (strcmp(command, "destroy")  == 0) {
                formatreq = true;
            }
            else if (strcmp(command, "geteventlog")  == 0) {
                int page = root["page"];
                sendEventLog(page);
            }
            else if (strcmp(command, "getlatestlog")  == 0) {
                int page = root["page"];
                sendLatestLog(page);
            }
            else if (strcmp(command, "clearevent")  == 0) {
                SPIFFS.remove("/eventlog.json");
                writeEvent("WARN", "sys", "Event log cleared!", "");
            }
            else if (strcmp(command, "clearlatest")  == 0) {
                SPIFFS.remove("/latestlog.json");
                writeEvent("WARN", "sys", "Latest Access log cleared!", "");
            }
            else if (strcmp(command, "userfile")  == 0) {
                const char* uid = root["uid"];
                String filename = "/P/";
                filename += uid;
                File f = SPIFFS.open(filename, "w+");
                // Check if we created the file
                if (f) {
                    f.print(msg);
                }
                f.close();
                ws.textAll("{\"command\":\"result\",\"resultof\":\"userfile\",\"result\": true}");
            }
            else if (strcmp(command, "testrelay")  == 0) {
                activateRelay = true;
                previousMillis = millis();
            }
            else if (strcmp(command, "scan")  == 0) {
                WiFi.scanNetworksAsync(printScanResult, true);
            }
            else if (strcmp(command, "gettime")  == 0) {
                timerequest = true;

            }
            else if (strcmp(command, "settime")  == 0) {
                time_t t = root["epoch"];
                setTime(t);
                timerequest = true;
            }
            else if (strcmp(command, "getconf")  == 0) {
                File configFile = SPIFFS.open("/config.json", "r");
                if (configFile) {
                    size_t len = configFile.size();
                    AsyncWebSocketMessageBuffer * buffer = ws.makeBuffer(len); //  creates a buffer (len + 1) for you.
                    if (buffer) {
                        configFile.readBytes((char *)buffer->get(), len + 1);
                        ws.textAll(buffer);
                    }
                    configFile.close();
                }
            }
        }
    }
}

void onMqttDisconnect(AsyncMqttClientDisconnectReason reason) {
    String reasonstr = "";
    switch (reason) {
        case (AsyncMqttClientDisconnectReason::TCP_DISCONNECTED):
            reasonstr = "TCP_DISCONNECTED";
            break;
        case (AsyncMqttClientDisconnectReason::MQTT_UNACCEPTABLE_PROTOCOL_VERSION):
            reasonstr = "MQTT_UNACCEPTABLE_PROTOCOL_VERSION";
            break;
        case (AsyncMqttClientDisconnectReason::MQTT_IDENTIFIER_REJECTED):
            reasonstr = "MQTT_IDENTIFIER_REJECTED";
            break;
        case (AsyncMqttClientDisconnectReason::MQTT_SERVER_UNAVAILABLE):
            reasonstr = "MQTT_SERVER_UNAVAILABLE";
            break;
        case (AsyncMqttClientDisconnectReason::MQTT_MALFORMED_CREDENTIALS):
            reasonstr = "MQTT_MALFORMED_CREDENTIALS";
            break;
        case (AsyncMqttClientDisconnectReason::MQTT_NOT_AUTHORIZED):
            reasonstr = "MQTT_NOT_AUTHORIZED";
            break;
        case (AsyncMqttClientDisconnectReason::ESP8266_NOT_ENOUGH_SPACE):
            reasonstr = "ESP8266_NOT_ENOUGH_SPACE";
            break;
        default:
            reasonstr = "Unknown";
            break;
    }
    writeEvent("WARN", "mqtt", "Disconnected from MQTT server", reasonstr);
    if (WiFi.isConnected()) {
        mqttReconnectTimer.once(2, connectToMqtt);
    }
}

void onMqttPublish(uint16_t packetId) {
    writeEvent("INFO", "mqtt", "MQTT publish acknowledged", String(packetId));
}

void onMqttConnect(bool sessionPresent) {
    if (sessionPresent == true) {
        writeEvent("INFO", "mqtt", "Connected to MQTT Server", "Session Present");
    }
}



bool ICACHE_FLASH_ATTR loadConfiguration() {
    File configFile = SPIFFS.open("/config.json", "r");
    if (!configFile) {
        Serial.println(F("[ WARN ] Failed to open config file"));
        return false;
    }
    size_t size = configFile.size();
    // Allocate a buffer to store contents of the file.
    std::unique_ptr<char[]> buf(new char[size]);
    // We don't use String here because ArduinoJson library requires the input
    // buffer to be mutable. If you don't use ArduinoJson, you may as well
    // use configFile.readString instead.
    configFile.readBytes(buf.get(), size);
    DynamicJsonBuffer jsonBuffer98;
    JsonObject& json = jsonBuffer98.parseObject(buf.get());
    if (!json.success()) {
        Serial.println(F("[ WARN ] Failed to parse config file"));
        return false;
    }

    Serial.println(F("[ INFO ] Config file found"));
    json.prettyPrintTo(Serial);
    Serial.println();

    JsonObject& network = json["network"];
    JsonObject& hardware = json["hardware"];
    JsonObject& general = json["general"];
    JsonObject& mqtt = json["mqtt"];
    JsonObject& ntp = json["ntp"];
#ifdef DEBUG
    Serial.print(F("[ INFO ] Trying to setup RFID Hardware :"));
#endif
    readerType = hardware["readerType"];

    if ( readerType == 1 ) {
        int wgd0pin = hardware["wgd0pin"];
        int wgd1pin = hardware["wgd1pin"];
        setupWiegandReader(wgd0pin, wgd1pin); // also some other settings like weather to use keypad or not, LED pin, BUZZER pin, Wiegand 26/34 version
    } else if ( readerType == 0 ) {
        rfidss = 15;
        if (hardware.containsKey("sspin")) {
            rfidss = hardware["sspin"];
        }
        int rfidgain = hardware["rfidgain"];
        setupMFRC522Reader(rfidss, rfidgain);
    } else if ( readerType == 2) {
        rfidss = hardware["sspin"];
        setupPN532Reader(rfidss);
    }

    autoRestartIntervalSeconds = general["restart"].as<int>();
    wifiTimeout = network["offtime"].as<int>();

    const char * bssidmac = network["bssid"];
    byte bssid[6];
    parseBytes(bssidmac, ':', bssid, 6, 16);

    deviceHostname = strdup(general["hostnm"]);
    // Set Hostname.
    WiFi.hostname(deviceHostname);

    // Start mDNS service so we can connect to http://esp-rfid.local (if Bonjour installed on Windows or Avahi on Linux)
    if (!MDNS.begin(deviceHostname)) {
#ifdef DEBUG
        Serial.println("Error setting up MDNS responder!");
#endif
    }
    // Add Web Server service to mDNS
    MDNS.addService("http", "tcp", 80);

    const char * ntpserver = ntp["server"];
    int ntpinter = ntp["interval"];
    timeZone = ntp["timezone"];

    activateTime = hardware["rtime"];
    relayPin = hardware["rpin"];
    relayType = hardware["rtype"];
    pinMode(relayPin, OUTPUT);
    digitalWrite(relayPin, relayType);

    const char * ssid = network["ssid"];
    const char * password = network["pswd"];
    int wmode = network["wmode"];

    http_pass = strdup(general["pswd"]);

    ws.setAuthentication("admin", http_pass);

    if (wmode == 1) {
        int hid = network["hide"].as<int>();
        Serial.println(F("[ INFO ] ESP-RFID is running in AP Mode "));
        return startAP(ssid, password, hid);
    }
    else {
        if (network["dhcp"] == "0") {
            WiFi.mode(WIFI_STA);

            const char * clientipch = network["ip"];
            const char * subnetch = network["subnet"];
            const char * gatewaych = network["gateway"];
            const char * dnsch = network["dns"];

            IPAddress clientip;
            IPAddress subnet;
            IPAddress gateway;
            IPAddress dns;

            clientip.fromString(clientipch);
            subnet.fromString(subnetch);
            gateway.fromString(gatewaych);
            dns.fromString(dnsch);

            WiFi.config(clientip, gateway, subnet, dns);
        }
        if (!connectSTA(ssid, password, bssid)) {
            return false;
        }
    }





    IPAddress timeserverip;
    WiFi.hostByName(ntpserver, timeserverip);
    String ip = printIP(timeserverip);
    writeEvent("INFO", "ntp", "Connecting NTP Server", ip);
    NTP.Ntp(ntpserver, timeZone, ntpinter * 60);

    const char * mhs = mqtt["host"];
    int mport = mqtt["port"];
    const char * muser = mqtt["user"];
    const char * mpas = mqtt["pswd"];

    mqttenabled = mqtt["enabled"].as<int>();
    if (mqttenabled == 1) {
        mqttTopic = strdup(mqtt["topic"]);
        mqttClient.setServer(mhs, mport);
        mqttClient.setCredentials(muser, mpas);
        mqttClient.onDisconnect(onMqttDisconnect);
        mqttClient.onPublish(onMqttPublish);
        mqttClient.onConnect(onMqttConnect);
        connectToMqtt();
    }



    Serial.println(F("[ INFO ] Configuration done."));
    return true;
}

void ICACHE_FLASH_ATTR enableWifi() {
#ifdef DEBUG
    Serial.println("Turn wifi on.");
#endif
    if (!loadConfiguration())
        fallbacktoAPMode();
}



/* ------------------ BASIC SYSTEM Functions ------------------- */
void ICACHE_FLASH_ATTR setupWebServer() {
    // Start WebSocket Plug-in and handle incoming message on "onWsEvent" function
    server.addHandler(&ws);
    ws.onEvent(onWsEvent);
    // Handle what happens when requested web file couldn't be found
    server.onNotFound([](AsyncWebServerRequest * request) {
        AsyncWebServerResponse * response = request->beginResponse(404, "text/plain", "Not found");
        request->send(response);
    });

    // Simple Firmware Update Handler
    server.on("/update", HTTP_POST, [](AsyncWebServerRequest * request) {
        AsyncWebServerResponse * response = request->beginResponse(200, "text/plain", shouldReboot ? "OK" : "FAIL");
        response->addHeader("Connection", "close");
        request->send(response);
    }, [](AsyncWebServerRequest * request, String filename, size_t index, uint8_t * data, size_t len, bool final) {
        if (!request->authenticate(http_username, http_pass)) {
            return;
        }
        if (!index) {
#ifdef DEBUG
            Serial.printf("[ UPDT ] Firmware update started: %s\n", filename.c_str());
#endif
            Update.runAsync(true);
            if (!Update.begin((ESP.getFreeSketchSpace() - 0x1000) & 0xFFFFF000)) {
                Update.printError(Serial);
            }
        }
        if (!Update.hasError()) {
            if (Update.write(data, len) != len) {
                Update.printError(Serial);
            }
        }
        if (final) {
            if (Update.end(true)) {
#ifdef DEBUG
                Serial.printf("[ UPDT ] Firmware update finished: %uB\n", index + len);
#endif
                shouldReboot = !Update.hasError();
            } else {
                Update.printError(Serial);
            }
        }
    });
    // Bootstrap Fonts hardcode workaround
    // Inspect impact on memory, firmware size.

    server.on("/fonts/glyphicons-halflings-regular.woff", HTTP_GET, [](AsyncWebServerRequest * request) {
        // Check if the client already has the same version and respond with a 304 (Not modified)
        if (request->header("If-Modified-Since").equals(last_modified)) {
            request->send(304);

        } else {
            // Dump the byte array in PROGMEM with a 200 HTTP code (OK)
            AsyncWebServerResponse * response = request->beginResponse_P(200, "font/woff", glyphicons_halflings_regular_woff_gz, glyphicons_halflings_regular_woff_gz_len);
            // Tell the browswer the contemnt is Gzipped
            response->addHeader("Content-Encoding", "gzip");
            // And set the last-modified datetime so we can check if we need to send it again next time or not
            response->addHeader("Last-Modified", last_modified);
            request->send(response);
        }
    });

    server.on("/css/required.css", HTTP_GET, [](AsyncWebServerRequest * request) {
        // Check if the client already has the same version and respond with a 304 (Not modified)
        if (request->header("If-Modified-Since").equals(last_modified)) {
            request->send(304);

        } else {
            // Dump the byte array in PROGMEM with a 200 HTTP code (OK)
            AsyncWebServerResponse * response = request->beginResponse_P(200, "text/css", required_css_gz, required_css_gz_len);
            // Tell the browswer the contemnt is Gzipped
            response->addHeader("Content-Encoding", "gzip");
            // And set the last-modified datetime so we can check if we need to send it again next time or not
            response->addHeader("Last-Modified", last_modified);
            request->send(response);
        }
    });

    server.on("/js/required.js", HTTP_GET, [](AsyncWebServerRequest * request) {
        // Check if the client already has the same version and respond with a 304 (Not modified)
        if (request->header("If-Modified-Since").equals(last_modified)) {
            request->send(304);

        } else {
            // Dump the byte array in PROGMEM with a 200 HTTP code (OK)
            AsyncWebServerResponse * response = request->beginResponse_P(200, "text/javascript", required_js_gz, required_js_gz_len);
            // Tell the browswer the contemnt is Gzipped
            response->addHeader("Content-Encoding", "gzip");
            // And set the last-modified datetime so we can check if we need to send it again next time or not
            response->addHeader("Last-Modified", last_modified);
            request-> send(response);
        }
    });

    server.on("/js/esprfid.js", HTTP_GET, [](AsyncWebServerRequest * request) {
        // Check if the client already has the same version and respond with a 304 (Not modified)
        if (request->header("If-Modified-Since").equals(last_modified)) {
            request->send(304);

        } else {
            // Dump the byte array in PROGMEM with a 200 HTTP code (OK)
            AsyncWebServerResponse * response = request->beginResponse_P(200, "text/javascript", esprfid_js_gz, esprfid_js_gz_len);
            // Tell the browswer the contemnt is Gzipped
            response->addHeader("Content-Encoding", "gzip");
            // And set the last-modified datetime so we can check if we need to send it again next time or not
            response->addHeader("Last-Modified", last_modified);
            request-> send(response);
        }
    });

    server.on("/index.html", HTTP_GET, [](AsyncWebServerRequest * request) {
        // Check if the client already has the same version and respond with a 304 (Not modified)
        if (request->header("If-Modified-Since").equals(last_modified)) {
            request->send(304);

        } else {
            // Dump the byte array in PROGMEM with a 200 HTTP code (OK)
            AsyncWebServerResponse * response = request->beginResponse_P(200, "text/html", index_html_gz, index_html_gz_len);
            // Tell the browswer the contemnt is Gzipped
            response->addHeader("Content-Encoding", "gzip");
            // And set the last-modified datetime so we can check if we need to send it again next time or not
            response->addHeader("Last-Modified", last_modified);
            request->send(response);
        }
    });

    server.on("/esprfid.htm", HTTP_GET, [](AsyncWebServerRequest * request) {
        // Check if the client already has the same version and respond with a 304 (Not modified)
        if (request->header("If-Modified-Since").equals(last_modified)) {
            request->send(304);

        } else {
            // Dump the byte array in PROGMEM with a 200 HTTP code (OK)
            AsyncWebServerResponse * response = request->beginResponse_P(200, "text/html", esprfid_htm_gz, esprfid_htm_gz_len);
            // Tell the browswer the contemnt is Gzipped
            response->addHeader("Content-Encoding", "gzip");
            // And set the last-modified datetime so we can check if we need to send it again next time or not
            response->addHeader("Last-Modified", last_modified);
            request->send(response);
        }
    });

    if (http_pass == NULL) {
        http_pass = strdup("admin");
    }

    // HTTP basic authentication
    server.on("/login", HTTP_GET, [](AsyncWebServerRequest * request) {
        String remoteIP = printIP(request->client()->remoteIP());
        if (!request->authenticate(http_username, http_pass)) {
            writeEvent("WARN", "websrv", "New login attempt", remoteIP);
            return request->requestAuthentication();
        }
        request->send(200, "text/plain", "Success");
        writeEvent("INFO", "websrv", "Login success!", remoteIP);
    });

    server.rewrite("/", "/index.html");

    // Start Web Server
    server.begin();
}

void onWifiDisconnect(const WiFiEventStationModeDisconnected& event) {
    mqttReconnectTimer.detach(); // ensure we don't reconnect to MQTT while reconnecting to Wi-Fi
}




// Set things up
void ICACHE_FLASH_ATTR setup() {
    // Populate the last modification date based on build datetime
    sprintf(last_modified, "%s %s GMT", __DATE__, __TIME__);
    delay(2000);
    Serial.begin(115200);
    wifiDisconnectHandler = WiFi.onStationModeDisconnected(onWifiDisconnect);

    Serial.println();
    Serial.println(F("[ INFO ] ESP RFID v0.7"));
    // Start SPIFFS filesystem
    if (!SPIFFS.begin()) {
#ifdef DEBUG
        Serial.print(F("[ WARN ] Formatting filesystem..."));
#endif
        if (SPIFFS.format()) {
            writeEvent("WARN", "sys", "Filesystem formatted", "");

#ifdef DEBUG
            Serial.println(F(" completed!"));
#endif
        }
        else {
#ifdef DEBUG
            Serial.println(F(" failed!"));
            Serial.println(F("[ WARN ] Could not format filesystem!"));
#endif
        }
    }


    /* Remove Users Helper
       Dir dir = SPIFFS.openDir("/P/");
       while (dir.next()){
       SPIFFS.remove(dir.fileName());
       }
     */

    // Try to load configuration file so we can connect to an Wi-Fi Access Point
    // Do not worry if no config file is present, we fall back to Access Point mode and device can be easily configured
    if (!loadConfiguration()) {
        fallbacktoAPMode();
    }
    setupWebServer();
    writeEvent("INFO", "sys", "System setup completed, running", "");
}

// Main Loop
void ICACHE_RAM_ATTR loop() {
    if (formatreq) {
#ifdef DEBUG
        Serial.println(F("[ WARN ] Factory reset initiated..."));
#endif
        SPIFFS.end();
        ws.enable(false);
        SPIFFS.format();
        ESP.restart();
    }
    if (timerequest) { sendTime(); timerequest = false;}
    unsigned long currentMillis = millis();
    unsigned long deltaTime = currentMillis - previousLoopMillis;
    unsigned long uptime = NTP.getUptimeSec();
    previousLoopMillis = currentMillis;

    if (autoRestartIntervalSeconds > 0 && uptime > autoRestartIntervalSeconds * 1000) {
        writeEvent("INFO", "sys", "System is going to reboot", "");
#ifdef DEBUG
        Serial.println(F("[ WARN ] Auto restarting..."));
#endif
        shouldReboot = true;
    }

    // check for a new update and restart
    if (shouldReboot) {
#ifdef DEBUG
        Serial.println(F("[ UPDT ] Rebooting..."));
#endif
        delay(100);
        ESP.restart();
    }
    if (currentMillis - previousMillis >= activateTime && activateRelay) {
        activateRelay = false;
        digitalWrite(relayPin, relayType);
    }
    if (activateRelay) {
        digitalWrite(relayPin, !relayType);
    }
    if (isWifiConnected) {
        wiFiUptimeMillis += deltaTime;
    }
    if (wifiTimeout > 0 && wiFiUptimeMillis > (wifiTimeout * 1000) && isWifiConnected == true) {
        writeEvent("INFO", "wifi", "WiFi is going to be disabled", "");
        doDisableWifi = true;
    }
    if (doDisableWifi == true) {
        doDisableWifi = false;
        wiFiUptimeMillis = 0;
        disableWifi();
    }
    else if (doEnableWifi == true) {
        writeEvent("INFO", "wifi", "Enabling WiFi", "");
        doEnableWifi = false;
        if (!isWifiConnected) {
            wiFiUptimeMillis = 0;
            enableWifi();
        }
    }
    // Another loop for RFID Events, since we are using polling method instead of Interrupt we need to check RFID hardware for events
    if (currentMillis >= cooldown) {
        rfidloop();
    }

}
