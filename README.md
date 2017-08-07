# ESP RFID - Access Control with ESP8266, RC522
Access Control demonstration using a cheap MFRC522 RFID Hardware and Espressif's ESP8266 Microcontroller.

[![Chat at https://gitter.im/esp-rfid/Lobby](https://badges.gitter.im/esp-rfid.svg)](https://gitter.im/esp-rfid/Lobby) Join community chat

Its easy to use web based interface makes everything smooth. Once you setup your hardware, you can associate RFID tags to "Users" (or just label them), give them ability to unlock a electric controlled door or whatever you want give access.

You can connect to Web UI anytime to give users access or take it back. Web UI accessible via Wi-Fi network, if your Wi-Fi Access Point is connected to Internet, you can sync Time from NTP Server to timestamp User's access. 

Use case scenarios can be expanded. There are several things I want to implement. (such as limited time access, logging, record user's enter exit time, etc.)

![IP](https://github.com/omersiar/esp-rfid/blob/master/demo/index.png?raw=true)
![SP](https://github.com/omersiar/esp-rfid/blob/master/demo/settings.png?raw=true)
![UP](https://github.com/omersiar/esp-rfid/blob/master/demo/users.png?raw=true)

## Features
* Using WebSocket protocol to exchange data between Hardware and Web Browser
* Data is encoded as JSON object
* Records are Timestamped (Time synced from a NTP Server) (tested but not implemented yet)
* Bootstrap for beautiful Web Pages for both Mobile and Desktop Screens
* Thanks to ESPAsyncWebServer Library communication is Asyncronous

## Getting Started
This project still in its development phase. New features (and also bugs) are introduced often and some functions may become deprecated. Please feel free to comment or give feedback.
* Latest version is v0.2rc1a
* See [Known Issues](https://github.com/omersiar/esp-rfid#known-issues) before starting right away.
* See [ChangeLog](https://github.com/omersiar/esp-rfid/blob/master/CHANGELOG.md)
* See [To Do](https://github.com/omersiar/esp-rfid#to-do) for what to expect in future.

### Steps
* First, flash firmware to your ESP either using Arduino IDE or with your favourite flash tool
* Flash webfiles data to SPIFFS either using ESP8266FS Uploader tool or with your favourite flash tool
* (optional) Fire up your serial monitor to get informed
* Power on your ESP
* Search for Wireless Network "esp-rfid" and connect to it (It should be an open network and does not reqiure password)
* Open your browser and type either "http://192.168.4.1" or "http://esp-rfid.local" (.local needs Bonjour installed on your computer) on address bar.
* Log on to ESP, password is "admin" (for now, you can only change it from source) 
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

### Using Compiled Binaries
Compiled binaries are available in directory /compiledbin. You can use any flashing tool and do the flashing manually. The flashing process itself has been described at numerous places on Internet.


### Building from Source
Please install Arduino IDE if you didn't already, then add ESP8266 Core (Beware! Install Git Version) on top of it. Additional Library download links are listed below:

* [Arduino IDE](http://www.arduino.cc) - The development IDE
* [ESP8266 Core for Arduino IDE](https://github.com/esp8266/Arduino) - ESP8266 Core
* [ESPAsyncWebServer](https://github.com/me-no-dev/ESPAsyncWebServer) - Asyncrone Web Server with WebSocket Plug-in
* [ESPAsyncTCP](https://github.com/me-no-dev/ESPAsyncTCP) - Mandatory for ESPAsyncWebServer
* [MFRC522](https://github.com/miguelbalboa/rfid) - MFRC522 RFID Hardware Library for Arduino IDE
* [ArduinoJson](https://github.com/bblanchon/ArduinoJson) - JSON Library for Arduino IDE

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

### Known Issues
* Built-in HTML Editor has hard-coded JavaScript that loads from CDN Internet. Text Editor won't work if there is no Internet connection.
* Currently only Git version (2.4.0rc) of ESP8266 Core is supported, due to new function is introduced (WiFi.scanNetworksAsync()).
* Firmware update does not authenticated (until we find a solution).
* When you connect to ESP via mDNS url Browsers make a DNS Query for WebSocket link, it takes long time to resolve.

### Time
We are syncing time from a NTP Server (in Client -aka infrastructure- Mode). This will require ESP to have an Internet connection. Additionaly your ESP can also work without Internet connection too (Access Point -aka Ad-Hoc- Mode),  without giving up functionality.
This will require you to do syncing manually. ESP can store and hold time for you approximately 51 days without a major issue, device time can drift from actual time depending on usage, temprature, etc.
So you have to login to settings page and sync it in a timely fashion.

## Scalability
Since we are limited on both flash and ram size things may get ugly at some point in the future. You can find out some test results below.

### Tests

#### How many RFID Tag can be handled?
Write some user data on File System worth: 

* 100 seperate "userfile"
* random 4 Bytes long UID and
* "Test Name Test Surname Label" as User Name and
* each have access status integer "1" or "0". 

Total 4,284 Bytes

At least 100 unique User (RFID Tag) can be handled, the test were performed on WeMos D1 mini.

#### Additional testing is needed:

* Logging needs testing. How long should it need to log access? What if a Boss needs whole year log?
* Realiability on Flash (these NOR Flash have limited write cycle on their cells). It depends on manufacturer choice of Flash Chip and usage.

## Contributions
Thanks to the community, these features are come to alive with their great effort:

- [X] Added captive portal. [by @rneurink](https://github.com/omersiar/esp-rfid/issues/7)


## To Do
- [X] Backup / Restore Settings, PICC files, everything
- [X] Polished web pages
- [ ] Adapt to use case scenarios such as every entered user also need to exit and do not allow re-entry unless user exited before. (this needs multiple device RFID or ESP)
- [ ] Log Access Time of Users
- [ ] Password Protection or Authentication for Tags instead of relying to only UIDs
- [ ] Settings Panel for Wi-Fi, IP, Hostname, PICC Password, Factory Reset, NTP Client, etc
- [ ] Globalization (language support, time zone support, etc)
- [ ] Schedule User Access
- [ ] Use Value Blocks to check if user have enough credits for access
- [ ] Sync Time from Browser if there is no internet connection
- [ ] Sanity check where needed (min WPA password lenght, return status of commands to WebSocket, etc)
- [ ] Close security holes (there are many, for example WebSocket communication is not Authenticated at all)
- [ ] rBoot for secondary recovery program? to flash main firmware maybe?
- [ ] Find a way to speed up DNS query for WebSocket. Takes a lot of time
- [ ] Switch to Async JSON. This may allow much larger transfers from ESP to Browser


## Donations
If this project helps you in a way, you can buy me a beer. PayPal is not allowed in my country (what a shame) you can donate via Bitcoin however, to this address: 166XWuSAmGAurR7jvS3Nui65QkKKKcsr8R
