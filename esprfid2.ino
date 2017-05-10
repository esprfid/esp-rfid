

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

#include <ESP8266WiFi.h>
#include <ESP8266mDNS.h>
#include <ArduinoOTA.h>
#include <SPI.h>      // RC522 Module uses SPI protocol
#include <MFRC522.h>  // Library for Mifare RC522 Devices
#include <WiFiUdp.h>
#include <NTPClient.h>
//#include "AsyncJson.h"
#include <ArduinoJson.h>
#include <FS.h>
#include <Hash.h>
#include <ESPAsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <SPIFFSEditor.h>

#define DBG_OUTPUT_PORT Serial

// RC522 Device Pins
#define SS_PIN D8 //Pin on WeMos D1 Mini
#define RST_PIN D3 //Pin on WeMos D1 Mini

#define NTP_OFFSET   60 * 60      // In seconds
#define NTP_INTERVAL 60 * 1000    // In miliseconds
#define NTP_ADDRESS  "europe.pool.ntp.org"




const char* ssid = "ESP-RFID";
const char* password = "33355555";
const char* conssid     = "SMC";
const char* conpassword = "333555555";
const char* hostName = "esp-rfid";
const char* http_username = "admin";
const char* http_password = "admin";

char uidchar[14]; // Stores variable filename

char dir[] = "/PICCS/";

int isKnown = 0;


WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, NTP_ADDRESS, NTP_OFFSET, NTP_INTERVAL);
MFRC522 mfrc522(SS_PIN, RST_PIN);

// SKETCH BEGIN
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");







void setup() {
  delay(1000);
  Serial.begin(115200);
  Serial.println();

  Serial.println(F("ESP RFID AccessControl v0.1"));
  // First connect wi-fi network
  WiFi.begin(conssid, conpassword);

  Serial.print("Connecting");
  unsigned long now = millis();
  while (millis() - now < 15000) {
    if (WiFi.status() == WL_CONNECTED) {
      break;
    }
    else if (!WiFi.status() == WL_CONNECTED) {
      Serial.println("Couldn't connect in given time, falling back to AP Mode");
    }
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Client IP address: ");
  Serial.println(WiFi.localIP());



  SPI.begin();           // MFRC522 Hardware uses SPI protocol
  mfrc522.PCD_Init();    // Initialize MFRC522 Hardware
  mfrc522.PCD_DumpVersionToSerial(); // Show details of PCD - MFRC522 Card Reader details

  //If you set Antenna Gain to Max it will increase reading distance
  //mfrc522.PCD_SetAntennaGain(mfrc522.RxGain_max);

  Serial.print("Configuring access point ...");
  Serial.println(WiFi.softAP(ssid, password) ? "Ready" : "Failed!");

  // Web-Server
  IPAddress myIP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(myIP);

  if (MDNS.begin (hostName)) {
    Serial.println ( "MDNS responder started" );
  }
  MDNS.addService("http", "tcp", 80);
  timeClient.begin();
  SPIFFS.begin();

  ArduinoOTA.setHostname(hostName);
  ArduinoOTA.begin();

  ws.onEvent(onWsEvent);
  server.addHandler(&ws);



  server.addHandler(new SPIFFSEditor(http_username, http_password));

  server.serveStatic("/", SPIFFS, "/").setDefaultFile("index.htm");

  server.onNotFound(NotFound);

  server.begin();
}

void loop() {
  ArduinoOTA.handle();
  timeClient.update();
  rfidloop();
}

void rfidloop() {
  // Handle RFID operations
  if ( ! mfrc522.PICC_IsNewCardPresent()) { //If a new PICC placed to RFID reader continue
    delay(50);
    return;
  }
  if ( ! mfrc522.PICC_ReadCardSerial()) { //Since a PICC placed get Serial and continue
    delay(50);
    return;
  }
  // There are Mifare PICCs which have 4 byte or 7 byte UID
  // Support 7 byte PICCs
  mfrc522.PICC_DumpDetailsToSerial(&(mfrc522.uid)); //dump some details about the card
  Serial.print("Unix Timestamp: ");
  Serial.println(timeClient.getEpochTime());
  byte readCard[7];
  Serial.print("Scanned PICC's UID: ");
  for (int i = 0; i < 7; i++) {  //
    readCard[i] = mfrc522.uid.uidByte[i];
  }
  sprintf(uidchar, "%02x%02x%02x%02x%02x%02x%02x", readCard[0], readCard[1], readCard[2], readCard[3], readCard[4], readCard[5], readCard[6]);
  Serial.println(uidchar);
  mfrc522.PICC_HaltA();
  char filename[26];  // Stores variable filename
  sprintf(filename, "\"%s%s.txt\"", dir, uidchar);
  Serial.println(filename);
  File f = SPIFFS.open(filename, "r");
  isKnown = 0;
  if (f) {
    Serial.println("This is a known PICC");
    f.close(); // Found it close
    isKnown = 1;
  }




  //Send data to Websocket
  sendDataWs();





  /*
    // open file for writing
    File f = SPIFFS.open("/latest.txt", "a");
    if (!f) {
       Serial.println("file open failed");
    }
    Serial.println(" Writing to SPIFFS file");
    f.print(timeClient.getEpochTime());
    f.print(",");
    for ( uint8_t i = 0; i < 4; i++) { //
     f.print(readCard[i]);
    }
    f.println();
    f.close();
  */
}

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


void sendDataWs() {
  DynamicJsonBuffer jsonBuffer;
  JsonObject& root = jsonBuffer.createObject();
  root["epoch"] = timeClient.getEpochTime();
  root["uid"] = uidchar;
  root["known"] = isKnown;
  size_t len = root.measureLength();
  AsyncWebSocketMessageBuffer * buffer = ws.makeBuffer(len); //  creates a buffer (len + 1) for you.
  if (buffer) {
    root.printTo((char *)buffer->get(), len + 1);
    ws.textAll(buffer);
  }
}

void NotFound(AsyncWebServerRequest *request) {
  //Handle Unknown Request
  request->send(404);
}



