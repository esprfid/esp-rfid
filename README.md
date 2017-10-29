# ESP RFID - Access Control with ESP8266, RC522
Access Control demonstration using a cheap MFRC522 RFID Hardware and Espressif's ESP8266 Microcontroller.

[![Chat at https://gitter.im/esp-rfid/Lobby](https://badges.gitter.im/esp-rfid.svg)](https://gitter.im/esp-rfid/Lobby) Join community chat

Its easy to use web based interface makes everything smooth. Once you setup your hardware, you can associate RFID tags to "Users" (or just label them), give them ability to unlock a electric controlled door or whatever you want give access.

You can connect to Web UI anytime to give users access or take it back. Web UI accessible via Wi-Fi network, if your Wi-Fi Access Point is connected to Internet, you can sync Time from NTP Server to timestamp User's access. 

Use case scenarios can be expanded. There are several things I want to implement. (such as limited time access, logging, record user's enter exit time, etc.)

![IP](https://github.com/omersiar/esp-rfid/raw/master/demo/index.png)
![SP](https://github.com/omersiar/esp-rfid/raw/master/demo/settings.png)
![UP](https://github.com/omersiar/esp-rfid/raw/master/demo/users.png)
![LP](https://github.com/omersiar/esp-rfid/raw/master/demo/logs.png)

## Features
### For Users
* Minimal effort for setting up your Access Control system
* Capable of managing up to 1.000 Users (even more is possible)
* Great for Maker Spaces, Labs, Schools, etc
* Cheap to build and easy to maintain
### For Tinkerers 
* Open Source (minimum amount of hardcoded variable, this means more freedom)
* Using WebSocket protocol to exchange data between Hardware and Web Browser
* Data is encoded as JSON object
* Records are Timestamped (Time synced from a NTP Server)
* Bootstrap, jQuery, FooTables for beautiful Web Pages for both Mobile and Desktop Screens
* Thanks to ESPAsyncWebServer Library communication is Asyncronous

## Getting Started
This project still in its development phase. New features (and also bugs) are introduced often and some functions may become deprecated. Please feel free to comment or give feedback.
* Latest development version is v0.3beta
* Latest released compiled binaries are from v0.3beta and can be found in directory "/compiledbin"
* See [Known Issues](https://github.com/omersiar/esp-rfid#known-issues) before starting right away.
* See [ChangeLog](https://github.com/omersiar/esp-rfid/blob/master/CHANGELOG.md)
* See [To Do](https://github.com/omersiar/esp-rfid#to-do) for what to expect in future.

### What You Will Need 
### Hardware
* An ESP8266 module or development board like WeMos or NodeMcu with at least 32Mbit Flash (equals to 4MBytes)(ESP32 does not supported at this time)
* A MFRC522 RFID PCD Module
* A Relay Module (or you can build your own circuit)
* n quantity of Mifare Classic 1KB (recommended due to available code base) PICCs (RFID Tags) equivalent to User Number

### Software

#### Using Compiled Binaries
Compiled binaries and a helper for flashing are available in directory /compiledbin. On Windows you can use "flash.bat" it will ask you which COM port that ESP is connected and then flashes it. You can use any flashing tool and do the flashing manually. The flashing process itself has been described at numerous places on Internet.

#### Building From Source
Please install Arduino IDE if you didn't already, then add ESP8266 Core (Beware! Install Git Version) on top of it. Additional Library download links are listed below:

* [Arduino IDE](http://www.arduino.cc) - The development IDE
* [ESP8266 Core for Arduino IDE](https://github.com/esp8266/Arduino) - ESP8266 Core
* [ESPAsyncWebServer](https://github.com/me-no-dev/ESPAsyncWebServer) - Asyncrone Web Server with WebSocket Plug-in
* [ESPAsyncTCP](https://github.com/me-no-dev/ESPAsyncTCP) - Mandatory for ESPAsyncWebServer
* [MFRC522](https://github.com/miguelbalboa/rfid) - MFRC522 RFID Hardware Library for Arduino IDE
* [ArduinoJson](https://github.com/bblanchon/ArduinoJson) - JSON Library for Arduino IDE
* [NTPClientLib](https://github.com/gmag11/NtpClient/) - NTP Client Library for Arduino IDE
* [TimeLib](https://github.com/PaulStoffregen/Time) - Mandatory for NTP Client Library

You also need to upload web files to your ESP with ESP8266FS Uploader.

* [ESP8266FS Uploader](https://github.com/esp8266/arduino-esp8266fs-plugin) - Arduino ESP8266 filesystem uploader

Unlisted libraries are part of ESP8266 Core for Arduino IDE, so you don't need to download them.

### Pin Layout
The following table shows the typical pin layout used for connecting MFRC522 hardware to ESP:

| Signal        | MFRC522       | WeMos D1 mini  | NodeMcu | Generic      |
|---------------|:-------------:|:--------------:| :------:|:------------:|
| RST/Reset     | RST           | N/C [1]        | N/C [1] | N/C [1]      |
| SPI SS        | SDA [3]       | D8 [2]         | D8 [2]  | GPIO-15 [2]  |
| SPI MOSI      | MOSI          | D7             | D7      | GPIO-13      |
| SPI MISO      | MISO          | D6             | D6      | GPIO-12      |
| SPI SCK       | SCK           | D5             | D5      | GPIO-14      |

1. Not Connected. Hard-reset no longer needed.
2. Configurable via settings page.
3. The SDA pin might be labeled SS on some/older MFRC522 boards.

### Steps
* First, flash firmware (you can use /compiledbin/flash.bat on Windows) to your ESP either using Arduino IDE or with your favourite flash tool
* Flash webfiles data to SPIFFS (ignore this step if you used flash.bat for flashing) either using ESP8266FS Uploader tool or with your favourite flash tool 
* (optional) Fire up your serial monitor to get informed
* Power on your ESP
* Search for Wireless Network "esp-rfid" and connect to it (It should be an open network and does not reqiure password)
* Open your browser and type either "http://192.168.4.1" or "http://esp-rfid.local" (.local needs Bonjour installed on your computer) on address bar.
* Log on to ESP, default password is "admin"
* Go to "Settings" page
* Configure your amazing access control device. Push "Scan" button to join your wireless network, configure RFID hardware, Relay Module.
* Save settings, when rebooted your ESP will try to join your wireless network.
* Check your new IP address from serial monitor and connect to your ESP again. (You can also connect to "http://esp-rfid.local")
* Go to "Users" page
* Scan a PICC (RFID Tag) then it should glimpse on your Browser's screen.
* Type "User Name" or "Label" for the PICC you scanned.
* Choose "Allow Access" if you want to
* Click "Add"
* Congratulations, everything went well, if you encounter any issue feel free to ask help on GitHub.

### Known Issues
* You need to download https://github.com/omersiar/ESPAsyncWebServer version of ESPAsyncWebServer Library until the fix is merged to origin.
* MFRC522 RFID Hardware should be connected to ESP or you will likely get a WDT Reset (boot loop) [#13](https://github.com/omersiar/esp-rfid/issues/13).
* Currently only Git version (2.4.0rc) of ESP8266 Core is supported, due to new function is introduced (WiFi.scanNetworksAsync()).
* When you connect to ESP via mDNS url Browsers make a DNS Query for WebSocket link, it takes long time to resolve.

#### Time
We are syncing time from a NTP Server (in Client -aka infrastructure- Mode). This will require ESP to have an Internet connection. Additionaly your ESP can also work without Internet connection too (Access Point -aka Ad-Hoc- Mode),  without giving up functionality.
This will require you to do syncing manually. ESP can store and hold time for you approximately 51 days without a major issue, device time can drift from actual time depending on usage, temprature, etc.
So you have to login to settings page and sync it in a timely fashion.

## Scalability
Since we are limited on both flash and ram size things may get ugly at some point in the future. You can find out some test results below.

### Tests

#### How many RFID Tag can be handled?
Restore some [randomly generated](https://github.com/omersiar/esp-rfid/raw/master/demo/demo-users-data.json) user data on File System worth: 

* 1000 seperate "userfile"
* random 4 Bytes long UID and
* random User Names and
* 4 bytes random Unix Time Stamp
* each have "access type" 1 byte integer "1" or "0". 

Total 122,880 Bytes

At least 1000 unique User (RFID Tag) can be handled, the test were performed on WeMos D1 mini.

#### Additional testing is needed:

* Logging needs testing. How long should it need to log access? What if a Boss needs whole year log?
* Realiability on Flash (these NOR Flash have limited write cycle on their cells). It depends on manufacturer choice of Flash Chip and usage.

## Contributions
Thanks to the community, these features are come to alive with their great effort:

- [X] Added captive portal. [by @rneurink](https://github.com/omersiar/esp-rfid/issues/7)
- [X] Available SPIFFS storage [by @rneurink](https://github.com/rneurink/esp-rfid/commit/5b962538bbf1c3234c05cea9ec8bf24f81ad6561)
- [X] Device Status in AP Mode [by @rneurink](https://github.com/rneurink/esp-rfid)
- [X] Colorize progress bars depending on percentage [by @rneurink](https://github.com/rneurink/esp-rfid)

See [ChangeLog](https://github.com/omersiar/esp-rfid/blob/master/CHANGELOG.md)

## To Do
- [X] Backup / Restore Settings, PICC files, everything
- [X] Polished web pages
- [X] Settings Panel for Wi-Fi, IP, Hostname, NTP Client, etc
- [X] Sync Time from Browser if there is no internet connection
- [X] Log Access Time of Users
- [X] WebSocket Basic Authentication 
- [ ] Password Protection or Authentication for Tags instead of relying to only UIDs (PICC Password)
- [ ] Globalization (language support, time zone support, etc)
- [ ] Schedule User Access
- [ ] Use Value Blocks to check if user have enough credits for access
- [ ] Sanity check where needed (min WPA password lenght, return status of commands to WebSocket, etc)
- [ ] Find a way to speed up DNS query for WebSocket. Takes a lot of time
- [ ] Factory Reset via pin or settings page
- [ ] SPIFFS Update from Web
- [ ] Adapt to use case scenarios such as every entered user also need to exit and do not allow re-entry unless user exited before. (this needs multiple device RFID or ESP)
- [ ] rBoot for secondary recovery program? to flash main firmware maybe?


## Donations
If this project helps you in a way, you can buy me a beer.
PayPal is not allowed in my country (what a shame)
You can donate via Bitcoin Cash however, to this address: 
(only Bitcoin Cash, do not send legacy Bitcoin coins to this address)
1F94BCWahzKw56dpg6zMCcEGcTHJcA8XTB

Also you can make a donation to the ESP-RFID community with [Bountysource](https://salt.bountysource.com/teams/esp-rfid)

#### Donators
2017-10-03 [steinar-t](https://github.com/steinar-t)

Thank you for your contributions.
