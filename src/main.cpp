/*
   Copyright (c) 2017 Omer Siar Baysal
   Copyright (c) 2018 ESP-RFID Community

   Released to Public Domain

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   THE SOFTWARE.

   1. The following table shows the typical pin layout used for MFRC522:

 | Signal        | MFRC522       | WeMos D1 mini  | NodeMcu | Generic      |
 |---------------|:-------------:|:--------------:| :------:|:------------:|
 | RST/Reset     | RST           | NC             | NC      | NC           |
 | SPI SS        | SDA [3]       | D8 [2]         | D8 [2]  | GPIO-15 [2]  |
 | SPI MOSI      | MOSI          | D7             | D7      | GPIO-13      |
 | SPI MISO      | MISO          | D6             | D6      | GPIO-12      |
 | SPI SCK       | SCK           | D5             | D5      | GPIO-14      |

    NC. Not Connected
    2. Configurable via web page
    3. The SDA pin might be labeled SS on some/older MFRC522 boards.

   2. Wiegand based reader's D0 and D1 pins are configurable via settings web page.

 */

#include <Arduino.h>                  // For building out of Arduino IDE

#include <ESP8266WiFi.h>              // Whole thing is about using Wi-Fi networks
#include <SPI.h>                      // RFID MFRC522 Module uses SPI protocol
#include <ESP8266mDNS.h>              // Zero-config Library (Bonjour, Avahi) http://esp-rfid.local
#include <MFRC522.h>                  // Library for Mifare RC522 Devices
#include <Wiegand.h>                  // Library for Wiegand based readers
#include <ArduinoJson.h>              // JSON Library for Encoding and Parsing Json object to send browser. We do that because Javascript has built-in JSON parsing.
#include <FS.h>                       // SPIFFS Library for storing web files to serve to web browsers
#include <ESPAsyncTCP.h>              // Async TCP Library is mandatory for Async Web Server
#include <ESPAsyncWebServer.h>        // Async Web Server with built-in WebSocket Plug-in
// #include <SPIFFSEditor.h>             // This creates a web page on server which can be used to edit text based files.
#include <NtpClientLib.h>             // To timestamp RFID scans we get Unix Time from NTP Server
#include <TimeLib.h>                  // Library for converting epochtime to a date
#include <WiFiUdp.h>                  // Library for manipulating UDP packets which is used by NTP Client to get Timestamps
#include <PubSubClient.h>             // Library to connect to mqtt server

// Include the header file we create with gulp
#include "glyphicons-halflings-regular.woff.gz.h"
#include "index.html.gz.h"
#include "required.css.gz.h"
#include "required.js.gz.h"

#ifdef ESP8266
extern "C" {
#include "user_interface.h"  // Used to get Wifi status information
}
#endif

// Variables for whole scope
const char* http_username = "admin";
char * http_pass = NULL;
unsigned long previousMillis = 0;
unsigned long previousLoopMillis = 0;
unsigned long cooldown = 0;
bool shouldReboot = false;
bool activateRelay = false;
bool inAPMode = false;
bool isWifiConnected = false;
int autoRestartIntervalSeconds = 0;

bool wifiDisabled = true;
bool doDisableWifi = false;
bool doEnableWifi = false;
int wifiTimeout = -1;
unsigned long wiFiUptimeMillis = 0;
char * deviceHostname = NULL;


// MQTT
WiFiClient wifiClient;
IPAddress MQTTserver();
PubSubClient mqttClient(wifiClient);
char *mqttHost = NULL;
uint16_t mqttPort = 0;
bool mqttConnected = false;
char *mqttTopic = NULL;
char *mqttUser = NULL;
char *mqttPwd = NULL;

int readerType;
int relayPin;
int relayType;
int activateTime;
int timeZone;

// Create instance for Wiegand reade
WIEGAND wg;
// Create MFRC522 RFID instance
MFRC522 mfrc522 = MFRC522();
// Create AsyncWebServer instance on port "80"
AsyncWebServer server(80);
// Create WebSocket instance on URL "/ws"
AsyncWebSocket ws("/ws");

// Define functions first
void setupWebServer();
void enableWifi();
void disableWifi();
void rfidloop();
void LogLatest(String uid, String username, int acctype);
void onWsEvent(AsyncWebSocket * server, AsyncWebSocketClient * client, AwsEventType type, void * arg, uint8_t *data, size_t len);
void sendTime();
void sendUserList(int page, AsyncWebSocketClient * client);
void sendStatus();
String printIP(IPAddress adress);
void printScanResult(int networksFound);
bool startAP(const char * ssid, const char * password);
void fallbacktoAPMode();
void parseBytes(const char* str, char sep, byte* bytes, int maxBytes, int base);
bool loadConfiguration();
void setupMFRC522Reader(int rfidss, int rfidgain);
void setupWiegandReader(int d0, int d1);
bool connectSTA(const char* ssid, const char* password, byte bssid[6]);
void ShowMFRC522ReaderDetails();


/* ------------------ TRIVIAL Functions ------------------- */
String printIP(IPAddress adress) {
        return (String)adress[0] + "." + (String)adress[1] + "." + (String)adress[2] + "." + (String)adress[3];
}

void parseBytes(const char* str, char sep, byte* bytes, int maxBytes, int base) {
        for (int i = 0; i < maxBytes; i++) {
                bytes[i] = strtoul(str, NULL, base); // Convert byte
                str = strchr(str, sep);   // Find next separator
                if (str == NULL || *str == '\0') {
                        break;          // No more separators, exit
                }
                str++;                    // Point to next character after separator
        }
}

void enableWifi() {
        Serial.println("Turn wifi on.");
        if (!loadConfiguration())
                fallbacktoAPMode();
}

void disableWifi() {
        isWifiConnected = false;
        WiFi.disconnect(true);
        Serial.println("Turn wifi off.");
}

bool startAP(const char * ssid, const char * password = NULL) {
        inAPMode = true;
        WiFi.mode(WIFI_AP);
        Serial.print(F("[ INFO ] Configuring access point... "));
        bool success = WiFi.softAP(ssid, password);
        Serial.println(success ? "Ready" : "Failed!");
        // Access Point IP
        IPAddress myIP = WiFi.softAPIP();
        Serial.print(F("[ INFO ] AP IP address: "));
        Serial.println(myIP);
        Serial.printf("[ INFO ] AP SSID: %s\n", ssid);
        isWifiConnected = success;
        return success;
}

// Fallback to AP Mode, so we can connect to ESP if there is no Internet connection
void fallbacktoAPMode() {
        Serial.println(F("[ INFO ] ESP-RFID is running in Fallback AP Mode"));
        uint8_t macAddr[6];
        WiFi.softAPmacAddress(macAddr);
        char ssid[15];
        sprintf(ssid, "ESP-RFID-%02x%02x%02x", macAddr[3], macAddr[4], macAddr[5]);
        isWifiConnected = startAP(ssid);
        //server.serveStatic("/auth/", SPIFFS, "/auth/").setAuthentication("admin", "admin");
}

// Try to connect Wi-Fi
bool connectSTA(const char* ssid, const char* password, byte bssid[6]) {
        WiFi.disconnect(true);
        WiFi.mode(WIFI_STA);
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
void rfidloop() {

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
                String type = mfrc522.PICC_GetTypeName(piccType);

        } else if (readerType == 1) {
                if(wg.available()) {
                        Serial.print(F("[ INFO ] PICC's UID: "));
                        Serial.println(wg.getCode());
                        uid = String(wg.getCode(), HEX);
                        type = String(wg.getWiegandType(), HEX);
                } else {
                        return;
                }
        }
        if (mqttClient.connected()) {
            mqttClient.publish(mqttTopic, uid.c_str(), false);
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
                DynamicJsonBuffer jsonBuffer;
                JsonObject& json = jsonBuffer.parseObject(buf.get());
                // Check if we succesfully parse JSON object
                if (json.success()) {
                        // Get username Access Status
                        String username = json["user"];
                        AccType = json["acctype"];
                        Serial.println(" = known PICC");
                        Serial.print("[ INFO ] User Name: ");

                        if (username == "undefined")
                                Serial.print(uid);
                        else
                                Serial.print(username);

                        // Check if user have an access
                        if (AccType == 1) {
                                activateRelay = true; // Give user Access to Door, Safe, Box whatever you like
                                previousMillis = millis();
                                Serial.println(" have access");
                        }
                        else if (AccType == 99)
                        {
                                previousMillis = millis();
                                doEnableWifi = true;
                                activateRelay = true; // Give user Access to Door, Safe, Box whatever you like
                                Serial.println(" have admin access, enable wifi");
                        }
                        else {
                                Serial.println(" does not have access");
                        }
                        LogLatest(uid, username, AccType);
                        // Also inform Administrator Portal
                        // Encode a JSON Object and send it to All WebSocket Clients
                        DynamicJsonBuffer jsonBuffer2;
                        JsonObject& root = jsonBuffer2.createObject();
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
                LogLatest(uid, "Unknown", 3);
                Serial.println(" = unknown PICC");
                DynamicJsonBuffer jsonBuffer;
                JsonObject& root = jsonBuffer.createObject();
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

// Configure RFID Hardware
void setupMFRC522Reader(int rfidss, int rfidgain) {
        SPI.begin();     // MFRC522 Hardware uses SPI protocol
        mfrc522.PCD_Init(rfidss, UINT8_MAX); // Initialize MFRC522 Hardware
        // Set RFID Hardware Antenna Gain
        // This may not work with some boards
        mfrc522.PCD_SetAntennaGain(rfidgain);
        Serial.printf("[ INFO ] RFID SS_PIN: %u and Gain Factor: %u", rfidss, rfidgain);
        Serial.println("");
        ShowMFRC522ReaderDetails(); // Show details of PCD - MFRC522 Card Reader details
}

void setupWiegandReader(int d0, int d1) {
        wg.begin(d0, d0, d1, d1);
}

void ShowMFRC522ReaderDetails() {
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

void LogLatest(String uid, String username, int acctype) {
        File logFile = SPIFFS.open("/auth/latestlog.json", "r");
        if (!logFile) {
                // Can not open file create it.
                File logFile = SPIFFS.open("/auth/latestlog.json", "w");
                DynamicJsonBuffer jsonBuffer3;
                JsonObject& root = jsonBuffer3.createObject();
                root["type"] = "latestlog";
                JsonArray& list = root.createNestedArray("list");
                root.printTo(logFile);
                logFile.close();
        }
        else {
                size_t size = logFile.size();
                std::unique_ptr<char[]> buf (new char[size]);
                logFile.readBytes(buf.get(), size);
                DynamicJsonBuffer jsonBuffer4;
                JsonObject& root = jsonBuffer4.parseObject(buf.get());
                JsonArray& list = root["list"];
                if (!root.success()) {
                        Serial.println("Impossible to read JSON file");
                } else {
                        logFile.close();
                        if ( list.size() >= 15 ) {
                                list.remove(0);
                        }
                        File logFile = SPIFFS.open("/auth/latestlog.json", "w");
                        DynamicJsonBuffer jsonBuffer5;
                        JsonObject& item = jsonBuffer5.createObject();
                        item["uid"] = uid;
                        item["username"] = username;
                        item["timestamp"] = now();
                        item["acctype"] = acctype;
                        list.add(item);
                        root.printTo(logFile);
                }
                logFile.close();
        }
}

// Handles WebSocket Events
void onWsEvent(AsyncWebSocket * server, AsyncWebSocketClient * client, AwsEventType type, void * arg, uint8_t *data, size_t len) {
        if (type == WS_EVT_ERROR) {
                Serial.printf("[ WARN ] WebSocket[%s][%u] error(%u): %s\r\n", server->url(), client->id(), *((uint16_t*)arg), (char*)data);
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
                        DynamicJsonBuffer jsonBuffer;
                        JsonObject& root = jsonBuffer.parseObject(msg);
                        if (!root.success()) {
                                Serial.println(F("[ WARN ] Couldn't parse WebSocket message"));
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
                                File f = SPIFFS.open("/auth/config.json", "w+");
                                if (f) {
                                        root.prettyPrintTo(f);
                                        //f.print(msg);
                                        f.close();
                                        ESP.reset();
                                }
                        }
                        else if (strcmp(command, "userlist")  == 0) {
                                int page = root["page"];
                                sendUserList(page, client);
                        }
                        else if (strcmp(command, "status")  == 0) {
                                sendStatus();
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
                        else if (strcmp(command, "latestlog")  == 0) {
                                File logFile = SPIFFS.open("/auth/latestlog.json", "r");
                                if (logFile) {
                                        size_t len = logFile.size();
                                        AsyncWebSocketMessageBuffer * buffer = ws.makeBuffer(len); //  creates a buffer (len + 1) for you.
                                        if (buffer) {
                                                logFile.readBytes((char *)buffer->get(), len + 1);
                                                ws.textAll(buffer);
                                        }
                                        logFile.close();
                                }
                                else {
                                  ws.textAll("{\"type\":\"result\",\"resultof\":\"latestlog\",\"result\": false}");
                                }
                        }
                        else if (strcmp(command, "scan")  == 0) {
                                WiFi.scanNetworksAsync(printScanResult, true);
                        }
                        else if (strcmp(command, "gettime")  == 0) {
                                sendTime();
                        }
                        else if (strcmp(command, "settime")  == 0) {
                                unsigned long t = root["epoch"];
                                setTime(t);
                                sendTime();
                        }
                        else if (strcmp(command, "getconf")  == 0) {
                                File configFile = SPIFFS.open("/auth/config.json", "r");
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

void sendTime() {
        DynamicJsonBuffer jsonBuffer;
        JsonObject& root = jsonBuffer.createObject();
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

void sendUserList(int page, AsyncWebSocketClient * client) {
        DynamicJsonBuffer jsonBuffer;
        JsonObject& root = jsonBuffer.createObject();
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
void sendStatus() {
        struct ip_info info;
        FSInfo fsinfo;
        if (!SPIFFS.info(fsinfo)) {
                Serial.print(F("[ WARN ] Error getting info on SPIFFS"));
        }
        DynamicJsonBuffer jsonBuffer;
        JsonObject& root = jsonBuffer.createObject();
        root["command"] = "status";

        root["heap"] = ESP.getFreeHeap();
        root["chipid"] = String(ESP.getChipId(), HEX);
        root["cpu"] = ESP.getCpuFreqMHz();
        root["availsize"] = ESP.getFreeSketchSpace();
        root["availspiffs"] = fsinfo.totalBytes - fsinfo.usedBytes;
        root["spiffssize"] = fsinfo.totalBytes;
        root["uptime"] = NTP.getUptimeString();

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
void printScanResult(int networksFound) {
  // sort by RSSI
  int n = networksFound;
int indices[n];
int skip[n];
int loops = 0;
for (int i = 0; i < networksFound; i++) {
    indices[i] = i;
  }
  for (int i = 0; i < networksFound; i++) {
    for (int j = i + 1; j < networksFound; j++) {
      if (WiFi.RSSI(indices[j]) > WiFi.RSSI(indices[i])) {
        loops++;
        //int temp = indices[j];
        //indices[j] = indices[i];
        //indices[i] = temp;
        std::swap(indices[i], indices[j]);
        std::swap(skip[i], skip[j]);
      }
    }
  }

        DynamicJsonBuffer jsonBuffer;
        JsonObject& root = jsonBuffer.createObject();
        root["command"] = "ssidlist";
        JsonArray& scan = root.createNestedArray("list");
        for (int i = 0; i < 5; ++i) {
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

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  if (length == 0) {
    return;
  }
}

void mqttConnect() {
  if (mqttHost != NULL && mqttPort != 0 && mqttTopic != NULL && !mqttClient.connected() ) {
    Serial.print(F("[ INFO ] Trying to connect to MQTT server : "));
    //setCallback();
    unsigned char retries = 0;
    mqttConnected = false;
    while (mqttConnected == false && retries < 20) {
      mqttConnected = mqttClient.connect("ESP-RFID", mqttUser, mqttPwd);
      retries++;
      delay(1000);
      Serial.print(".");
    }
    if (mqttConnected == true) {
      Serial.println(F(" connected to mqttServer"));
    } else {
      Serial.println(F(" MQTT connection error"));
    }
  }
}


bool loadConfiguration() {
        File configFile = SPIFFS.open("/auth/config.json", "r");
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
        DynamicJsonBuffer jsonBuffer;
        JsonObject& json = jsonBuffer.parseObject(buf.get());
        if (!json.success()) {
                Serial.println(F("[ WARN ] Failed to parse config file"));
                return false;
        }

        Serial.println(F("[ INFO ] Config file found"));
        json.prettyPrintTo(Serial);
        Serial.println();
        Serial.print(F("[ INFO ] Trying to setup RFID Hardware :"));
        readerType = json["readerType"];

        if ( readerType == 1 ) {
                int wgd0pin = json["wgd0pin"];
                int wgd1pin = json["wgd1pin"];
                Serial.println(F("Wiegand"));
                setupWiegandReader(wgd0pin, wgd1pin); // also some other settings like weather to use keypad or not, LED pin, BUZZER pin, Wiegand 26/34 version
        } else if ( readerType == 0 ) {
                int rfidss = 15;
                if (json.containsKey("sspin")) {
                        rfidss = json["sspin"];
                }
                int rfidgain = json["rfidgain"];
                Serial.println(F("MFRC522"));
                setupMFRC522Reader(rfidss, rfidgain);
        }

        const char * l_hostname = json["hostnm"];

        autoRestartIntervalSeconds = json["auto_restart_interval_seconds"].as<int>();
        wifiTimeout = json["disable_wifi_after_seconds"].as<int>();

        free(deviceHostname);
        deviceHostname = strdup(l_hostname);

        const char * bssidmac = json["bssid"];
        byte bssid[6];
        parseBytes(bssidmac, ':', bssid, 6, 16);

        // Set Hostname.
        WiFi.hostname(deviceHostname);

        // Start mDNS service so we can connect to http://esp-rfid.local (if Bonjour installed on Windows or Avahi on Linux)
        if (!MDNS.begin(deviceHostname)) {
                Serial.println("Error setting up MDNS responder!");
        }
        // Add Web Server service to mDNS
        MDNS.addService("http", "tcp", 80);

        const char * ntpserver = json["ntpserver"];
        int ntpinter = json["ntpinterval"];
        timeZone = json["timezone"];

        activateTime = json["rtime"];
        relayPin = json["rpin"];
        relayType = json["rtype"];
        pinMode(relayPin, OUTPUT);
        digitalWrite(relayPin, relayType);

        const char * ssid = json["ssid"];
        const char * password = json["pswd"];
        int wmode = json["wmode"];

        http_pass = strdup(json["adminpwd"]);

        // Serve confidential files in /auth/ folder with a Basic HTTP authentication
        // server.serveStatic("/auth/", SPIFFS, "/auth/").setAuthentication("admin", adminpass);
        ws.setAuthentication("admin", http_pass);
        // Add Text Editor (http://esp-rfid.local/edit) to Web Server. This feature likely will be dropped on final release.
        //server.addHandler(new SPIFFSEditor("admin", adminpass));

        if (wmode == 1) {
                Serial.println(F("[ INFO ] ESP-RFID is running in AP Mode "));
                return startAP(ssid, password);
        }
        else if (!connectSTA(ssid, password, bssid)) {
                return false;
        }
        NTP.begin(ntpserver, timeZone);
        NTP.setInterval(ntpinter * 60); // Poll every x minutes
        // mqtt
        if (mqttHost != NULL) {
            free((void *)mqttHost);
        }
        mqttHost = strdup(json["mqtthost"]);
        mqttPort = json["mqttport"];
        if (mqttTopic != NULL) {
            free((void *)mqttTopic);
        }
        mqttTopic = strdup(json["mqtttopic"]);
        if (mqttUser != NULL) {
            free((void *)mqttUser);
        }
        mqttUser = strdup(json["mqttuser"]);
        if (mqttPwd != NULL) {
            free((void *)mqttPwd);
        }
        mqttPwd = strdup(json["mqttpwd"]);
        mqttClient.disconnect();
        mqttClient.setServer(mqttHost, mqttPort);
        mqttConnect();
        return true;
}

/* ------------------ BASIC SYSTEM Functions ------------------- */
void setupWebServer() {
  // Start WebSocket Plug-in and handle incoming message on "onWsEvent" function
  server.addHandler(&ws);
  ws.onEvent(onWsEvent);
  // Serve all files in root folder
  // server.serveStatic("/", SPIFFS, "/");
  // Handle what happens when requested web file couldn't be found
  server.onNotFound([](AsyncWebServerRequest * request) {
    AsyncWebServerResponse * response = request->beginResponse(404, "text/plain", "Not found");
    request->send(response);
  });

  // Simple Firmware Update Handler
  server.on("/update", HTTP_POST, [](AsyncWebServerRequest * request) {
    shouldReboot = !Update.hasError();
    AsyncWebServerResponse * response = request->beginResponse(200, "text/plain", shouldReboot ? "OK" : "FAIL");
    response->addHeader("Connection", "close");
    request->send(response);
  }, [](AsyncWebServerRequest * request, String filename, size_t index, uint8_t * data, size_t len, bool final) {
    if (!index) {
      Serial.printf("[ UPDT ] Firmware update started: %s\n", filename.c_str());
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
        Serial.printf("[ UPDT ] Firmware update finished: %uB\n", index + len);
      } else {
        Update.printError(Serial);
      }
    }
  });
  // Bootstrap Fonts hardcode workaround
  // Inspect impact on memory, firmware size.

  server.on("/fonts/glyphicons-halflings-regular.woff", HTTP_GET, [](AsyncWebServerRequest * request) {
    // Dump the byte array in PROGMEM with a 200 HTTP code (OK)
    AsyncWebServerResponse * response = request->beginResponse_P(200, "font/woff", glyphicons_halflings_regular_woff_gz, glyphicons_halflings_regular_woff_gz_len);
    // Tell the browswer the contemnt is Gzipped
    response->addHeader("Content-Encoding", "gzip");
    request->send(response);
  });

  server.on("/css/required.css", HTTP_GET, [](AsyncWebServerRequest * request) {
    // Dump the byte array in PROGMEM with a 200 HTTP code (OK)
    AsyncWebServerResponse * response = request->beginResponse_P(200, "text/css", required_css_gz, required_css_gz_len);
    // Tell the browswer the contemnt is Gzipped
    response->addHeader("Content-Encoding", "gzip");
    request->send(response);
  });

  server.on("/js/required.js", HTTP_GET, [](AsyncWebServerRequest * request) {
    // Dump the byte array in PROGMEM with a 200 HTTP code (OK)
    AsyncWebServerResponse * response = request->beginResponse_P(200, "text/javascript", required_js_gz, required_js_gz_len);
    // Tell the browswer the contemnt is Gzipped
    response->addHeader("Content-Encoding", "gzip");
    request-> send(response);
  });

  server.on("/index.html", HTTP_GET, [](AsyncWebServerRequest * request) {
    // Dump the byte array in PROGMEM with a 200 HTTP code (OK)
    AsyncWebServerResponse * response = request->beginResponse_P(200, "text/html", index_html_gz, index_html_gz_len);
    // Tell the browswer the contemnt is Gzipped
    response->addHeader("Content-Encoding", "gzip");
    request->send(response);
  });

  // HTTP basic authentication
server.on("/login", HTTP_GET, [](AsyncWebServerRequest *request){
  if(!request->authenticate(http_username, http_pass))
      return request->requestAuthentication();
  request->send(200, "text/plain", "Login Success!");
});

  server.rewrite("/", "/index.html");

  // Start Web Server
  server.begin();
}

// Set things up
void setup() {
        Serial.begin(115200);
        Serial.println();
        Serial.println(F("[ INFO ] ESP RFID v0.5"));

        // Start SPIFFS filesystem
        SPIFFS.begin();

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
}

// Main Loop
void loop() {
        unsigned long currentMillis = millis();
        unsigned long deltaTime = currentMillis - previousLoopMillis;
        unsigned long uptime = NTP.getUptime();
        previousLoopMillis = currentMillis;

        if (autoRestartIntervalSeconds > 0 && uptime > autoRestartIntervalSeconds * 1000) {
                Serial.println(F("[ WARN ] Auto restarting..."));
                shouldReboot = true;
        }

        // check for a new update and restart
        if (shouldReboot) {
                Serial.println(F("[ UPDT ] Rebooting..."));
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
                doDisableWifi = true;
        }
        if (doDisableWifi == true) {
                doDisableWifi = false;
                wiFiUptimeMillis = 0;
                disableWifi();
        }
        else if (doEnableWifi == true) {
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
