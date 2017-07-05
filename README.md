# ESP RFID - Access Control with ESP8266, RC522
Access Control demonstration using a cheap RC522 RFID Hardware and Espressif's ESP8266 Microcontroller.

![IP](https://github.com/omersiar/esp-rfid/blob/master/demo/index.png?raw=true)
![SP](https://github.com/omersiar/esp-rfid/blob/master/demo/settings.png?raw=true)

## Features
* Using WebSocket protocol to exchange data between Hardware and Web Browser
* Data is encoded as JSON object
* Records are Timestamped (Time synced from a NTP Server)
* Bootstrap for beautiful Web Pages for both Mobile and Desktop Screens
* Thanks to ESPAsyncWebServer Library communication is Asyncronous

## Getting Started
Latest version is v0.1rc1

### Using Compiled Binaries
Compiled binaries are available in directory /compiledbin.

### Building from Source
Please install Arduino IDE if you didn't already, then add ESP8266 Core (Beware! Install Git Version) on top of it. Additional Library download links are listed below:

* [Arduino IDE](http://www.arduino.cc) - The development IDE
* [ESP8266 Core for Arduino IDE](https://github.com/esp8266/Arduino) - ESP8266 Core
* [ESPAsyncWebServer](https://github.com/me-no-dev/ESPAsyncWebServer) - Asyncrone Web Server with WebSocket Plug-in
* [ESPAsyncTCP](https://github.com/me-no-dev/ESPAsyncTCP) - Mandatory for ESPAsyncWebServer
* [NTPClient](https://github.com/arduino-libraries/NTPClient) - NTP Library for Arduino IDE
* [MFRC522](https://github.com/miguelbalboa/rfid) - MFRC522 RFID Hardware Library for Arduino IDE
* [ArduinoJson](https://github.com/bblanchon/ArduinoJson) - JSON Library for Arduino IDE

You also need to upload web files to your ESP with ESP8266FS Uploader.

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

1. Configurable via settings page.
2. Configurable via settings page.
3. The SDA pin might be labeled SS on some/older MFRC522 boards.

### Known Issues
* Built-in HTML Editor has hard-coded JavaScript that loads from CDN Internet. Text Editor won't work if there is no Internet connection.
* Currently only Git version (2.4.0rc) of ESP8266 Core is supported, due to new function is introduced (WiFi.scanNetworksAsync()).
* Firmware update does not authenticated (until we find a solution).


## TODO
- [ ] Logging access
- [ ] Password Protection or Authentication for Tags instead trusting only to UIDs
- [ ] Settings Panel for Wi-Fi, PICC Password, Factory Reset, NTP Client, etc
- [ ] Schedule User Access
- [ ] Sync Time from Browser if there is no internet connection
- [ ] Sanity check where needed
- [ ] Close security holes
- [X] Polished web pages