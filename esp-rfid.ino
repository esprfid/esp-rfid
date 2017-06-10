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

  1. Configurable, defined as RST_PIN in sketch/program.
  2. Configurable, defined as SS_PIN in sketch/program.
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
#include <SPIFFSEditor.h>             // This creates a web page on server (http://esp-rfid.local/edit) which can be used to edit text based files.

// Password for AP Mode if there is no connection to Internet
const char * password = "12345678";

// Client's host name for mDNS, OTA, etc. we will add ChipID later
#define HOSTNAME "esp-rfid-"

// Creditentials for Web Editor (http://esp-rfid.local/edit)
const char * http_username = "admin";
const char * http_password = "admin";

// Auth password for OTA Update
const char * otapass = "admin";

// Variables for whole scope
String uid = ""; // Variable for storing UID of last scanned RFID tag
uint8_t isKnown = 0;        // Stores variable data for returning if RFID Tag's UID is known or not

// Create UDP instance for NTP Client
WiFiUDP ntpUDP;

// Configure NTP Client Settings
#define NTP_OFFSET   60 * 60      // In seconds
#define NTP_INTERVAL 60 * 1000    // In miliseconds
#define NTP_ADDRESS  "europe.pool.ntp.org"  // NTP Server to connect

// Create NTP Client instance with below settings
NTPClient timeClient(ntpUDP, NTP_ADDRESS, NTP_OFFSET, NTP_INTERVAL);

// Configure RC522 Device Pins on
#define SS_PIN D8
#define RST_PIN D3

// Create MFRC522 RFID instance with above settings
MFRC522 mfrc522(SS_PIN, RST_PIN);

// Create AsyncWebServer instance on port "80"
AsyncWebServer server(80);
// Create WebSocket instance on URL "/ws"
AsyncWebSocket ws("/ws");

// Set things up
void setup() {
  delay(1000);
  Serial.begin(115200);
  Serial.println();
  Serial.println(F("ESP RFID AccessControl v0.1"));
  Serial.print("Chip ID: 0x");
  Serial.println(ESP.getChipId(), HEX);

  // Set Hostname.
  String hostname(HOSTNAME);
  hostname += String(ESP.getChipId(), HEX);
  WiFi.hostname(hostname);

  // Print hostname.
  Serial.println("Hostname: " + hostname);

  // Start SPIFFS filesystem
  SPIFFS.begin();
  // Get wireless configuration
  File configFile = SPIFFS.open("/cl_conf.txt", "r");
  if (!configFile) {
    Serial.println("Failed to open cl_conf.txt.");
  }
  String content = configFile.readString();
  configFile.close();

  StaticJsonBuffer<110> jsonBuffer;
  JsonObject& root = jsonBuffer.parseObject(content);
  if (!root.success()) {
    Serial.println("parseObject() failed");
    return;
  }
  const char * conssid = root["ssid"];
  const char * conpassword = root["pswd"];

  // First connect to a wi-fi network
  WiFi.begin(conssid, conpassword);
  // Inform user we are trying to connect
  Serial.print(F("Connecting"));
  // We try it for 15 seconds and give up on if we can't connect
  unsigned long now = millis();
  uint8_t timeout = 15; // define when to time out in seconds
  while (millis() - now < timeout * 1000) {
    if (WiFi.status() == WL_CONNECTED) {
      // Print Wi-Fi Client's IP
      Serial.println();
      Serial.print(F("Client IP address: "));
      Serial.println(WiFi.localIP());
      WiFi.mode(WIFI_STA);
      break;
    }
    delay(500);
    Serial.print(F("."));
  }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println();
    Serial.println(F("Couldn't connect in time"));
    // Fallback to AP Mode, so we can connect to ESP if there is no Internet connection
    WiFi.mode(WIFI_AP);
    Serial.print(F("Configuring access point... "));
    Serial.println(WiFi.softAP((const char *)hostname.c_str(), password) ? "Ready" : "Failed!");
    // Access Point IP
    IPAddress myIP = WiFi.softAPIP();
    Serial.println(F("AP IP address: "));
    Serial.println(myIP);
  }

  SPI.begin();           // MFRC522 Hardware uses SPI protocol
  mfrc522.PCD_Init();    // Initialize MFRC522 Hardware
  Serial.print(F("RFID Hardware "));
  mfrc522.PCD_DumpVersionToSerial(); // Show details of PCD - MFRC522 Card Reader details

  // If you set RFID Hardwware Antenna Gain to Max it will increase reading distance
  // mfrc522.PCD_SetAntennaGain(mfrc522.RxGain_max);

  // Start NTP Client if we connected to an AP
  if (WiFi.status() == WL_CONNECTED) {
    timeClient.begin();
  }




  // Start OTA Upload Service
  ArduinoOTA.setHostname((const char *)hostname.c_str());
  ArduinoOTA.setPassword(otapass);
  ArduinoOTA.begin();

  // Start WebSocket Plug-in and handle incoming message on "onWsEvent" function
  ws.onEvent(onWsEvent);
  server.addHandler(&ws);
  // Add Text Editor (/edit) handler
  server.addHandler(new SPIFFSEditor(http_username, http_password));
  // Serve all files in Filesystem and make default file which is served first index.htm
  server.serveStatic("/", SPIFFS, "/").setDefaultFile("index.htm");


  // Handle what happens when requested web file couldn't be found
  server.onNotFound(NotFound);
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
  Serial.print(F("Scanned PICC's UID: "));
  uid = "";
  for (int i = 0; i < mfrc522.uid.size; ++i) {
    uid += String(mfrc522.uid.uidByte[i], HEX);
  }
  Serial.println(uid);
  // We are going to use filesystem to store known UIDs.
  // Check if this UID is known to us
  isKnown = 0;  // First assume we don't know until we got a match
  File f = SPIFFS.open(uid, "r");
  // Check if we could find it above function returns true if the file is exist
  if (f) {
    f.close(); // We found it so close the file
    
    isKnown = 1; // Label it as known
    // We may also want to do something else if we know the UID
    // Open a door lock, turn a servo, etc
    Serial.println("This is a known PICC");
    grantAccess();
  }
  // So far got we got UID of Scanned RFID Tag, checked it if it's on the database
  // Now we need to send this information to Web Client
  sendDataWs(); // This function encodes a JSON object and sends it client
  // We are all done for now
}

// Encodes JSON Object and Sends it to All WebSocket Clients
void sendDataWs() {
  // Check ArduinoJSON Library for details
  DynamicJsonBuffer jsonBuffer;
  JsonObject& root = jsonBuffer.createObject();
  // We send 3 data blocks
  // epoch is Unix Time Stamp
  root["epoch"] = timeClient.getEpochTime();
  // UID of Scanned RFID Tag
  root["uid"] = uid;
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
  if (type == WS_EVT_CONNECT) {
    Serial.printf("ws[%s][%u] connected\r\n", server->url(), client->id());
  }
  else if (type == WS_EVT_DISCONNECT) {
    Serial.printf("ws[%s][%u] disconnected\r\n", server->url(), client->id());
  }
  else if (type == WS_EVT_ERROR) {
    Serial.printf("ws[%s][%u] error(%u): %s\r\n", server->url(), client->id(), *((uint16_t*)arg), (char*)data);
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
      StaticJsonBuffer<200> jsonBuffer;
      JsonObject& root = jsonBuffer.parseObject(msg);
      if (!root.success()) {
        Serial.println("parseObject() failed");
        return;
      }

      // Web Browser sends some commands, check which command is given
      uid = root["uid"].as<String>();
      const char * command = root["command"];
      if (strcmp(command, "add")  == 0) {
        File f = SPIFFS.open(uid, "a+");
        // Check if we created the file
        if (f) {
          f.close(); // We found it, close the file
        }
      }
      else if (strcmp(command, "remove")  == 0) {
        SPIFFS.remove(uid);
      }
      else if (strcmp(command, "setssid")  == 0) {
        const char * ssid = root["ssid"];
        const char * password = root["pswd"];
        DynamicJsonBuffer jsonBuffer;
        JsonObject& root = jsonBuffer.createObject();
        root["ssid"] = ssid;
        root["pswd"] = password;
        size_t len = root.measureLength();
        AsyncWebSocketMessageBuffer * buffer = ws.makeBuffer(len); //  creates a buffer (len + 1) for you.
        if (buffer) {
          File f = SPIFFS.open("/cl_conf.txt", "w+");
          if (!f) {
            Serial.println("Failed to open for write cl_conf.txt.");
          }
          root.printTo(f);
          f.close();
          Serial.println("Joining new network");
          ESP.restart();
        }
      }
      else if (strcmp(command, "scan")  == 0) {
        Serial.println("Wi-Fi Scan Start");
        WiFi.scanNetworksAsync(printScanResult);
      }
    }
  }
}

// Send a JSON object to websocket client that has nearby SSIDs
void printScanResult(int networksFound) {
  DynamicJsonBuffer jsonBuffer;
  JsonObject& root = jsonBuffer.createObject();
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


void NotFound(AsyncWebServerRequest * request) {
  //Handle Unknown Request
  request->send(404);
}



