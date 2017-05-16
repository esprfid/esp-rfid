# ESP-RFID Access Control with ESP8266

Access Control demonstration using a cheap RC522 RFID Hardware and Espressif's ESP8266 Microcontroller.

## Features

* Using WebSocket protocol to exchange data between Hardware and Web Browser
* Data is encoded as JSON object
* Records are Timestamped (Time synced from a NTP Server)
* Bootstrap for beautiful Web Pages
* Built-in HTML Editor
* Thanks to ESPAsyncWebServer Library communication is Asyncronous

## TODO

[ ] Serve pre-compiled binaries
[ ] Logging access
[ ] Password Protection or Authentication for Tags instead trusting UID
[ ] Settings Panel for Wi-Fi, PICC Password, Factory Reset, NTP Client, etc
[ ] Schedule User Access
[ ] Polished web pages
[ ] Sync Time from Browser if no internet connection

[ ] Use Sming Framework for Development

## Getting Started

Please install Arduino IDE if you don't already, then add ESP8266 Core on top of it. Additional Library download links are listed below:

* [Arduino IDE](http://www.arduino.cc) - The development IDE
* [ESP8266 Core for Arduino IDE](https://github.com/esp8266/Arduino) - ESP8266 Core
* [ESPAsyncWebServer](https://github.com/me-no-dev/ESPAsyncWebServer) - Asyncrone Web Server with WebSocket Plug-in
* [ESPAsyncTCP](https://github.com/me-no-dev/ESPAsyncTCP) - Mandatory for ESPAsyncWebServer
* [NTPClient](https://github.com/arduino-libraries/NTPClient) - NTP Library for Arduino IDE
* [MFRC522](https://github.com/miguelbalboa/rfid) - MFRC522 RFID Hardware Library for Arduino IDE
* [ArduinoJson](https://github.com/bblanchon/ArduinoJson) - JSON Library for Arduino IDE

Unlisted libraries are part of ESP8266 Core for Arduino IDE, so you don't need to download them.

