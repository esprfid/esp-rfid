# ESP-RFID Access Control with ESP8266

Access Control demonstration using a cheap RC522 RFID Hardware and Espressif's ESP8266 Microcontroller.

![SH](https://image.ibb.co/hc7nmQ/Screenshot_2017_05_17_13_01_34.png)

## Features

* Using WebSocket protocol to exchange data between Hardware and Web Browser
* Data is encoded as JSON object
* Records are Timestamped (Time synced from a NTP Server)
* Bootstrap for beautiful Web Pages for both Mobile and Desktop Screens
* Built-in HTML Editor
* Thanks to ESPAsyncWebServer Library communication is Asyncronous

## Getting Started

Please install Arduino IDE if you didn't already, then add ESP8266 Core on top of it. Additional Library download links are listed below:

* [Arduino IDE](http://www.arduino.cc) - The development IDE
* [ESP8266 Core for Arduino IDE](https://github.com/esp8266/Arduino) - ESP8266 Core
* [ESPAsyncWebServer](https://github.com/me-no-dev/ESPAsyncWebServer) - Asyncrone Web Server with WebSocket Plug-in
* [ESPAsyncTCP](https://github.com/me-no-dev/ESPAsyncTCP) - Mandatory for ESPAsyncWebServer
* [NTPClient](https://github.com/arduino-libraries/NTPClient) - NTP Library for Arduino IDE
* [MFRC522](https://github.com/miguelbalboa/rfid) - MFRC522 RFID Hardware Library for Arduino IDE
* [ArduinoJson](https://github.com/bblanchon/ArduinoJson) - JSON Library for Arduino IDE

You may also need 

* [ESP8266FS Uploader](https://github.com/esp8266/arduino-esp8266fs-plugin) - Arduino ESP8266 filesystem uploader

Unlisted libraries are part of ESP8266 Core for Arduino IDE, so you don't need to download them.

### Pin Layout

The following table shows the typical pin layout used:

| Signal        | MFRC522       | WeMos D1 mini  | NodeMcu | Generic      |
|---------------|:-------------:|:--------------:| :------:|:------------:|
| RST/Reset     | RST           | D3 [1]         | D3 [1]  | GPIO-0 [1]   |
| SPI SS        | SDA [3]       | D8 [2]         | D8 [2]  | GPIO-15 [2]  |
| SPI MOSI      | MOSI          | D7             | D7      | GPIO-13      |
| SPI MISO      | MISO          | D6             | D6      | GPIO-12      |
| SPI SCK       | SCK           | D5             | D5      | GPIO-14      |

1. Configurable, typically defined as RST_PIN in sketch/program.
2. Configurable, typically defined as SS_PIN in sketch/program.
3. The SDA pin might be labeled SS on some/older MFRC522 boards.

### Known Issues

* Built-in HTML Editor has hard-coded JavaScript that loads from CDN Internet
* AP mode is being tested, connect to Internet where available, Text Editor won't work if there is no Internet connection
* Currently only Git version (2.4.0rc) of ESP8266 Core is supported, due to new function is introduced (WiFi.scanNetworksAsync())
* Currently we are serving all SPIFFS Files on webserver, exposing config.txt confidential data.
* Chrome complains about password on URL


## TODO

- [ ] Logging access
- [ ] Password Protection or Authentication for Tags instead trusting only to UIDs
- [ ] Settings Panel for Wi-Fi, PICC Password, Factory Reset, NTP Client, etc
- [ ] Schedule User Access
- [ ] Polished web pages
- [ ] Sync Time from Browser if there is no internet connection
- [ ] Sanity check where needed

- [ ] Use Sming Framework for Development
- [ ] Abandon "String" usage
- [ ] Close security holes
