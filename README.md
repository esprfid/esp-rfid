# ESP-RFID Access Control with ESP8266

Access Control demonstration using a cheap RC522 RFID Hardware and Espressif's ESP8266 Microcontroller.

## Features

* Using WebSocket protocol to exchange data between Hardware and Web Browser
* Data is encoded as JSON object
* Time Stamps from NTP Server
* Built-in HTML Editor for making visual changes
* Thanks to ESPAsyncWebServer Library communication is Asyncronous

## TODO

- [ ] Serve pre-compiled binaries
- [ ] Logging access
- [ ] Password Protection or Authentication for Tags instead trusting UID
- [ ] Settings Panel for Wi-Fi, PICC Password, Factory Reset, NTP Client, etc
- [ ] Schecdule User Access
- [ ] Polished web pages
- [ ] Sync Time from Browser if no internet connection

- [ ] Use Sming Framework for Development

## Getting Started

These instructions will get you a copy of the project up and running for development and testing purposes.

* [Arduino IDE](http://www.arduino.cc) - The development IDE
* [ESP8266 Core for Arduino IDE](https://github.com/esp8266/Arduino) - ESP8266 Core
* [ESPAsyncWebServer](https://github.com/me-no-dev/ESPAsyncWebServer) - Asyncrone Web Server with WebSocket Plug-in
* [ESPAsyncTCP](https://github.com/me-no-dev/ESPAsyncTCP) - Mandatory for ESPAsyncWebServer
* [ESPAsyncTCP](https://github.com/arduino-libraries/NTPClient) - NTP Library for Arduino IDE
* [MFRC522](https://github.com/miguelbalboa/rfid) - MFRC522 RFID Hardware Library for Arduino IDE
* [ArduinoJson](https://github.com/bblanchon/ArduinoJson) - JSON Library for Arduino IDE

Unlisted libraries are part of ESP8266 Core for Arduino IDE, so you don't need to download them.

