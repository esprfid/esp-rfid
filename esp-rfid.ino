/*
  The MIT License (MIT)

  Copyright (c) 2017 Omer Siar Baysal

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.
*/

/*
   Typical pin layout used:
   ------------------------------------
               MFRC522
               Reader/PCD   ESP8266/
   Signal      Pin          Nodemcu
   ------------------------------------
   RST/Reset   RST          GPIO5/D1
   SPI SS      SDA(SS)      GPIO4/D2
   SPI MOSI    MOSI         GPIO13/D7
   SPI MISO    MISO         GPIO12/D6
   SPI SCK     SCK          GPIO14/D5
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

// Creates a Wi-Fi Access Point with these settings
const char* ssid = "ESP-RFID";
const char* password = "33355555";

// Connects a Wi-Fi Access Point with these settings
const char* conssid     = "SMC";
const char* conpassword = "333555555";

// Client's host name (http://esp-rfid.local/) for mDNS, OTA, etc.
const char* hostName = "esp-rfid";

// Creditentials for Web Editor (http://esp-rfid.local/edit)
const char* http_username = "admin";
const char* http_password = "admin";

// Auth password for OTA Update
const char * otapass = "admin";

// Variables for whole scoope
char uidchar[14];           // Stores variable RFID Tag's UID information which can be 4 byte or 7 byte long
char dir[] = "/PICCS/";     // SPIFFS does not support for directories, we need a prefix for separating known RFID Tag's
uint8_t isKnown = 0;        // Stores variable data for returning if RFID Tag's UID is known or not

// Create UDP instance for NTP Client
WiFiUDP ntpUDP;

// Configure NTP Client Settings
#define NTP_OFFSET   60 * 60      // In seconds
#define NTP_INTERVAL 60 * 1000    // In miliseconds
#define NTP_ADDRESS  "europe.pool.ntp.org"  // NTP Server to connect

// Create NTP Client instance with above settings
NTPClient timeClient(ntpUDP, NTP_ADDRESS, NTP_OFFSET, NTP_INTERVAL);

// RC522 Device Pins on
#define SS_PIN D8                     //Pin on WeMos D1 Mini
#define RST_PIN D3                    //Pin on WeMos D1 Mini

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
      break;
    }
    delay(500);
    Serial.print(F("."));
  }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println();
    Serial.println(F("Couldn't connect in time"));
  }
  // Also configure ESP to AP Mode, so we can connect it even there is no internet connection
  Serial.print(F("Configuring access point... "));
  Serial.println(WiFi.softAP(ssid, password) ? "Ready" : "Failed!");

  // Access Point IP
  IPAddress myIP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(myIP);

  // Start mDNS on given hostname
  if (MDNS.begin (hostName)) {
    Serial.println ( "MDNS responder started" );
  }
  // Add service to mDNS Service to propagate
  MDNS.addService("http", "tcp", 80);

  SPI.begin();           // MFRC522 Hardware uses SPI protocol
  mfrc522.PCD_Init();    // Initialize MFRC522 Hardware
  Serial.print(F("RFID Hardware "));
  mfrc522.PCD_DumpVersionToSerial(); // Show details of PCD - MFRC522 Card Reader details

  // If you set RFID Hardwware Antenna Gain to Max it will increase reading distance
  // mfrc522.PCD_SetAntennaGain(mfrc522.RxGain_max);

  // Start NTP Client
  timeClient.begin();

  // Start SPIFFS filesystem
  SPIFFS.begin();

  // Start OTA Upload Service
  ArduinoOTA.setHostname(hostName);
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
  // Get Time from NTP Server on given intervals
  timeClient.update();
  // Another loop for RFID Events, since we are using polling method instead of Interrupt we need to check RFID hardware for events
  rfidloop();
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
  // We are going to support both so PICCs that have 4 byte UID will have appended zeros
  byte readCard[7]; // Variable for storing UID of last scanned RFID tag
  Serial.print(F("Scanned PICC's UID: "));
  for (int i = 0; i < 7; i++) {  //
    readCard[i] = mfrc522.uid.uidByte[i];
  }

  // Store UID information on a String so we can use it for sending to Web Client or for filename or for writing it to text file
  sprintf(uidchar, "%02x%02x%02x%02x%02x%02x%02x", readCard[0], readCard[1], readCard[2], readCard[3], readCard[4], readCard[5], readCard[6]);
  Serial.println(uidchar);

  // We are going to use filesystem to store known UIDs. You can think of it as a database
  // Constructed filename will be 26 char long due to prefixing directory name and extension
  char filename[26];
  // Constract filename
  sprintf(filename, "\"%s%s.txt\"", dir, uidchar);
  Serial.println(filename);

  // Check if this UID is known to us
  isKnown = 0;  // First assume we don't know until we got a match
  File f = SPIFFS.open(filename, "r");
  // Check if we could find it above function returns true if the file is exist
  if (f) {
    f.close(); // We found it so close the file
    isKnown = 1; // Label it as known
    Serial.println(F("This is a known PICC")); // Inform

    // We may also want to do something else if we know the UID
    // Open a door lock, turn a servo, etc
    // digitalWrite(LED, HIGH);
  }

  // So far got we got UID of Scanned RFID Tag, checked it if it's on the database
  // Now we need to send this information to Web Client
  sendDataWs(); // This function encodes a JSON object and sends it client

  // We are all done for now
}

// Encodes JSON Object and Sends it to Client
void sendDataWs() {
  // Check ArduinoJSON Library for details
  DynamicJsonBuffer jsonBuffer;
  JsonObject& root = jsonBuffer.createObject();

  // We send 3 data blocks
  // epoch is Unix Time Stamp
  root["epoch"] = timeClient.getEpochTime();
  // UID of Scanned RFID Tag
  root["uid"] = uidchar;
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
    Serial.printf("ws[%s][%u] connect\n", server->url(), client->id());
  }
  else if (type == WS_EVT_DISCONNECT) {
    Serial.printf("ws[%s][%u] disconnect: %u\n", server->url(), client->id());
  }
  else if (type == WS_EVT_ERROR) {
    Serial.printf("ws[%s][%u] error(%u): %s\n", server->url(), client->id(), *((uint16_t*)arg), (char*)data);
  }
  else if (type == WS_EVT_PONG) {
    Serial.printf("ws[%s][%u] pong[%u]: %s\n", server->url(), client->id(), len, (len) ? (char*)data : "");
  }
  else if (type == WS_EVT_DATA) {
    AwsFrameInfo * info = (AwsFrameInfo*)arg;
    String msg = "";
    if (info->final && info->index == 0 && info->len == len) {
      //the whole message is in a single frame and we got all of it's data
      Serial.printf("ws[%s][%u] %s-message[%llu]: ", server->url(), client->id(), (info->opcode == WS_TEXT) ? "text" : "binary", info->len);


      for (size_t i = 0; i < info->len; i++) {
        msg += (char) data[i];
      }

      Serial.printf("%s\n", msg.c_str());

    }
  }
}



void NotFound(AsyncWebServerRequest *request) {
  //Handle Unknown Request
  request->send(404);
}



