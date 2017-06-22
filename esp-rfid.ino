/*
  Copyright (c) 2017 Omer Siar Baysal

  Released to Public Domain

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.

  The following table shows the typical pin layout used:

  | Signal        | MFRC522       | WeMos D1 mini  | NodeMcu | Generic      |
  |---------------|:-------------:|:--------------:| :------:|:------------:|
  | RST/Reset     | RST           | D3 [1]         | D3 [1]  | GPIO-0 [1]   |
  | SPI SS        | SDA [3]       | D8 [2]         | D8 [2]  | GPIO-15 [2]  |
  | SPI MOSI      | MOSI          | D7             | D7      | GPIO-13      |
  | SPI MISO      | MISO          | D6             | D6      | GPIO-12      |
  | SPI SCK       | SCK           | D5             | D5      | GPIO-14      |

  1. Configurable via web page
  2. Configurable via web page
  3. The SDA pin might be labeled SS on some/older MFRC522 boards.

*/

#include <ESP8266WiFi.h>              // Whole thing is about using Wi-Fi networks
#include <ESP8266mDNS.h>              // Zero-config Library (Bonjour, Avahi) for OTA update and Web Server
#include <ArduinoOTA.h>               // For now there is an option to flash ESP module with OTA
#include <SPI.h>                      // RFID MFRC522 Module uses SPI protocol
#include <MFRC522.h>                  // Library for Mifare RC522 Devices
#include <WiFiUdp.h>                  // Library for manipulating UDP packets which is used by NTP Client to get Timestamps
#include <NTPClient.h>                // To timestamp RFID scans we get Unix Time from NTP Server
#include <ArduinoJson.h>              // JSON Library for Encoding and Parsing Json object to send browser. We do that because Javascript has built-in JSON parsing.
#include <FS.h>                       // SPIFFS Library for storing web files to serve to web browsers
#include <Hash.h>                     // For checking integrity of OTA update binary files to make sure it's not corrupted before it is arrived
#include <ESPAsyncTCP.h>              // Async TCP Library is mandatory for Async Web Server
#include <ESPAsyncWebServer.h>        // Async Web Server with built-in WebSocket Plug-in
#include <SPIFFSEditor.h>             // This creates a web page on server which can be used to edit text based files.

#define HTTP_USER     "admin"
#define HTTP_PASS     "1234"
#define HTTP_REALM    "realm"

// Client's host name for mDNS, OTA, etc. we will add ChipID to this
#define HOSTNAME "esp-rfid-"

// Configure NTP Client Settings
#define NTP_OFFSET   60 * 60      // In seconds
#define NTP_INTERVAL 60 * 1000    // In miliseconds
#define NTP_ADDRESS  "europe.pool.ntp.org"  // NTP Server to connect

// Password for AP Mode if there is no connection to Internet
// const char * password = "12345678";

// Variables for whole scope
String filename = "/P/";

// Create UDP instance for NTP Client
WiFiUDP ntpUDP;

// Create NTP Client instance with below settings
NTPClient timeClient(ntpUDP, NTP_ADDRESS, NTP_OFFSET, NTP_INTERVAL);

// Create MFRC522 RFID instance
MFRC522 mfrc522 = MFRC522();

// Create AsyncWebServer instance on port "80"
AsyncWebServer server(80);
// Create WebSocket instance on URL "/ws"
AsyncWebSocket ws("/ws");

// Set things up
void setup() {
  delay(1000);
  Serial.begin(115200);
  Serial.println();
  Serial.println(F("[ INFO ] ESP RFID v0.0.3"));
  Serial.print("[ INFO ] Chip ID: 0x");
  Serial.println(ESP.getChipId(), HEX);
  // Start SPIFFS filesystem
  SPIFFS.begin();
  // Set Hostname.
  String hostname(HOSTNAME);
  hostname += String(ESP.getChipId(), HEX);
  WiFi.hostname(hostname);
  // Print hostname.
  Serial.println("[ INFO ] Hostname: " + hostname);
  // Start SPIFFS filesystem
  SPIFFS.begin();
  if (!loadConfiguration()) {
    fallbacktoAPMode();
  }
  // Start NTP Client if we connected to an AP
  if (WiFi.status() == WL_CONNECTED) {
    timeClient.begin();
  }
  // Start OTA Upload Service
  ArduinoOTA.setHostname((const char *)hostname.c_str());
  ArduinoOTA.begin();
  // Start WebSocket Plug-in and handle incoming message on "onWsEvent" function
  server.addHandler(&ws);
  ws.onEvent(onWsEvent);
  //Configure web server
  // Add Text Editor (/edit) handler
  server.addHandler(new SPIFFSEditor("admin", "admin"));
  // Serve all files in Filesystem and make default file which is served first index.htm
  // send a file when /index is requested
  server.serveStatic("/auth/", SPIFFS, "/auth/").setDefaultFile("settings.htm").setAuthentication("admin", "admin");
  server.serveStatic("/", SPIFFS, "/");
  // Handle what happens when requested web file couldn't be found
  server.onNotFound([](AsyncWebServerRequest *request) {
    request->send(404);
  });

  // Start Web Server
  server.begin();
}

// Main Loop
void loop() {
  // Handle OTA updates
  ArduinoOTA.handle();
  // Get Time from NTP Server on given intervals if we connected to an AP
  if (WiFi.status() == WL_CONNECTED) {
    timeClient.update();
  }
  // Another loop for RFID Events, since we are using polling method instead of Interrupt we need to check RFID hardware for events
  rfidloop();
}

void grantAccess() {
  // do something if scanned PICC is known
}

// RFID Specific Loop
void rfidloop() {
  //If a new PICC placed to RFID reader continue
  if ( ! mfrc522.PICC_IsNewCardPresent()) {
    delay(50);
    return;
  }
  //Since a PICC placed get Serial (UID) and continue
  if ( ! mfrc522.PICC_ReadCardSerial()) {
    delay(50);
    return;
  }
  // We got UID tell PICC to stop responding to not get that again
  mfrc522.PICC_HaltA();
  // There are Mifare PICCs which have 4 byte or 7 byte UID
  Serial.print(F("[ INFO ] PICC's UID: "));

  String uid = "";
  for (int i = 0; i < mfrc522.uid.size; ++i) {
    uid += String(mfrc522.uid.uidByte[i], HEX);
  }
  Serial.print(uid);
  MFRC522::PICC_Type piccType = mfrc522.PICC_GetType(mfrc522.uid.sak);
  String type = mfrc522.PICC_GetTypeName(piccType);
  // We are going to use filesystem to store known UIDs.
  // Check if this UID is known to us
  int isKnown = 0;  // First assume we don't know until we got a match
  filename = "/P/";
  filename += uid;
  File f = SPIFFS.open(filename, "r");
  // Check if we could find it above function returns true if the file is exist
  if (f) {
    f.close(); // We found it so close the file
    isKnown = 1; // Label it as known
    // We may also want to do something else if we know the UID
    // Open a door lock, turn a servo, etc
    Serial.println(" = known PICC");
    grantAccess();
  }
  else {
    Serial.println(" = unknown PICC");
  }
  // So far got we got UID of Scanned RFID Tag, checked it if it's on the database
  // Now we need to send this information to Web Client
  sendDataWs(uid, type, isKnown); // This function encodes a JSON object and sends it client
  // We are all done for now
}

// Encodes JSON Object and Sends it to All WebSocket Clients
void sendDataWs(String uid, String type, int isKnown) {
  // Check ArduinoJSON Library for details
  DynamicJsonBuffer jsonBuffer;
  JsonObject& root = jsonBuffer.createObject();
  root["command"] = "piccscan";
  // We send 3 data blocks
  // epoch is Unix Time Stamp
  root["epoch"] = timeClient.getEpochTime();
  // UID of Scanned RFID Tag
  root["uid"] = uid;
  root["type"] = type;
  // And a boolean 1 for known tags 0 for unknown
  root["known"] = isKnown;
  size_t len = root.measureLength();
  AsyncWebSocketMessageBuffer * buffer = ws.makeBuffer(len); //  creates a buffer (len + 1) for you.
  if (buffer) {
    root.printTo((char *)buffer->get(), len + 1);
    ws.textAll(buffer);
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
      // We got a JSON object from browser, parse it
      DynamicJsonBuffer jsonBuffer;
      JsonObject& root = jsonBuffer.parseObject(msg);
      if (!root.success()) {
        Serial.println(F("[ WARN ] Couldn't parse WebSocket message"));
        return;
      }
      // Web Browser sends some commands, check which command is given
      const char * command = root["command"];
      if (strcmp(command, "add")  == 0) {
        const char* uid = root["uid"];
        filename = "/P/";
        filename += uid;
        File f = SPIFFS.open(filename, "a+");
        // Check if we created the file
        if (f) {
          f.close(); // We found it, close the file
        }
      }
      else if (strcmp(command, "remove")  == 0) {
        const char* uid = root["uid"];
        filename = "/P/";
        filename += uid;
        SPIFFS.remove(filename);
      }
      else if (strcmp(command, "configfile")  == 0) {
        File f = SPIFFS.open("/auth/config.json", "w+");
        if (!f) {
          Serial.println("Failed to open for write config.json.");
        }
        f.print(msg);
        f.close();
        ESP.reset();
      }
      else if (strcmp(command, "picclist")  == 0) {
        sendPICClist();
      }
      else if (strcmp(command, "scan")  == 0) {
        WiFi.scanNetworksAsync(printScanResult);
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

void sendPICClist() {
  Dir dir = SPIFFS.openDir("/P/");
  DynamicJsonBuffer jsonBuffer;
  JsonObject& root = jsonBuffer.createObject();
  root["command"] = "picclist";
  // We send 3 data blocks
  // epoch is Unix Time Stamp
  JsonArray& data = root.createNestedArray("piccs");
  while (dir.next()) {
    data.add(dir.fileName());
  }
  size_t len = root.measureLength();
  AsyncWebSocketMessageBuffer * buffer = ws.makeBuffer(len); //  creates a buffer (len + 1) for you.
  if (buffer) {
    root.printTo((char *)buffer->get(), len + 1);
    ws.textAll(buffer);
  }
}


// Send Scanned SSIDs to websocket clients as JSON object
void printScanResult(int networksFound) {
  DynamicJsonBuffer jsonBuffer;
  JsonObject& root = jsonBuffer.createObject();
  root["command"] = "ssidlist";
  JsonArray& data = root.createNestedArray("ssid");
  for (int i = 0; i < networksFound; ++i) {
    // Print SSID for each network found
    data.add(WiFi.SSID(i));
  }
  size_t len = root.measureLength();
  AsyncWebSocketMessageBuffer * buffer = ws.makeBuffer(len); //  creates a buffer (len + 1) for you.
  if (buffer) {
    root.printTo((char *)buffer->get(), len + 1);
    ws.textAll(buffer);
  }
  WiFi.scanDelete();
}


// Fallback to AP Mode, so we can connect to ESP if there is no Internet connection
void fallbacktoAPMode() {
  WiFi.mode(WIFI_AP);
  Serial.print(F("[ INFO ] Configuring access point... "));
  Serial.println(WiFi.softAP("ESP-RFID") ? "Ready" : "Failed!");
  // Access Point IP
  IPAddress myIP = WiFi.softAPIP();
  Serial.print(F("[ INFO ] AP IP address: "));
  Serial.println(myIP);
}

bool loadConfiguration() {
  File configFile = SPIFFS.open("/auth/config.json", "r");
  if (!configFile) {
    Serial.println("[ WARN ] Failed to open config file");
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
    Serial.println("[ WARN ] Failed to parse config file");
    return false;
  }
  const char * conssid = json["ssid"];
  const char * conpassword = json["pswd"];
  int rfidss = json["sspin"];
  int rfidrst = json["rstpin"];
  int rfidgain = json["rfidgain"];
  // Configure RFID Hardware
  SPI.begin();           // MFRC522 Hardware uses SPI protocol
  mfrc522.PCD_Init(rfidss, rfidrst);    // Initialize MFRC522 Hardware
  // Set RFID Hardware Antenna Gain
  // This may not work with some boards
  mfrc522.PCD_SetAntennaGain(rfidgain);
  Serial.printf("[ INFO ] RFID SS_PIN: %u RST_PIN: %u and Gain Factor: %u", rfidss, rfidrst, rfidgain);
  Serial.println("");
  ShowReaderDetails(); // Show details of PCD - MFRC522 Card Reader details
  // Configure Wi-Fi
  WiFi.mode(WIFI_STA);
  // First connect to a wi-fi network
  WiFi.begin(conssid, conpassword);
  // Inform user we are trying to connect
  Serial.print(F("[ INFO ] Trying to connect WiFi: "));
  Serial.print(conssid);
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
  }
  else { // We couln't connect, time is out, inform
    Serial.println();
    Serial.println(F("[ WARN ] Couldn't connect in time"));
    return false;
  }
  return true;
}

void ShowReaderDetails() {
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
