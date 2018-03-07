# ESP RFID - Access Control with ESP8266, RC522

[![Chat at https://gitter.im/esp-rfid/Lobby](https://badges.gitter.im/esp-rfid.svg)](https://gitter.im/esp-rfid/Lobby) [![Build Status](https://travis-ci.org/omersiar/esp-rfid.svg?branch=stable)](https://travis-ci.org/omersiar/esp-rfid) [![Codacy Badge](https://api.codacy.com/project/badge/Grade/fc424f75d12644da8b6fe248a5e95157)](https://www.codacy.com/app/omersiar/esp-rfid?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=omersiar/esp-rfid&amp;utm_campaign=Badge_Grade) [![Bountysource](https://api.bountysource.com/badge/team?team_id=242217)](https://salt.bountysource.com/checkout/amount?team=esp-rfid)

Access Control demonstration using a cheap MFRC522 RFID Hardware or Wiegand RFID readers and Espressif's ESP8266 Microcontroller. This is a community driven project.

## Features
### For Users
* Minimal effort for setting up your Access Control system, just flash and everything can be configured via Web UI
* Capable of managing up to 1.000 Users (even more is possible)
* Great for Maker Spaces, Labs, Schools, etc
* Cheap to build and easy to maintain
### For Tinkerers
* Open Source (minimum amount of hardcoded variable, this means more freedom)
* Using WebSocket protocol to exchange data between Hardware and Web Browser
* Data is encoded as JSON object
* Records are Timestamped (Time synced from a NTP Server)
* MQTT enabled
* Bootstrap, jQuery, FooTables for beautiful Web Pages for both Mobile and Desktop Screens
* Thanks to ESPAsyncWebServer Library communication is Asyncronous

## Getting Started
This project still in its development phase. New features (and also bugs) are introduced often and some functions may become deprecated. Please feel free to comment or give feedback.

* Get the latest release from [here.](https://github.com/omersiar/esp-rfid/releases)
* See [Known Issues](https://github.com/omersiar/esp-rfid#known-issues) before starting right away.
* See [Security](https://github.com/omersiar/esp-rfid#security) for your safety.
* See [ChangeLog](https://github.com/omersiar/esp-rfid/blob/development/CHANGELOG.md)

### What You Will Need
### Hardware
* An ESP8266 module or a development board like **WeMos D1 mini** or **NodeMcu 1.0** with at least **32Mbit Flash (equals to 4MBytes)** (ESP32 does not supported for now)
* A MFRC522 RFID PCD Module or Wiegand based RFID reader
* A Relay Module (or you can build your own circuit)
* n quantity of Mifare Classic 1KB (recommended due to available code base) PICCs (RFID Tags) equivalent to User Number

### Software

#### Using Compiled Binaries
Compiled firmware binary and flasher tool for Windows PCs are available in directory **/bin**. On Windows you can use **"flash.bat"**, it will ask you which COM port that ESP is connected and then flashes it. You can use any flashing tool and do the flashing manually. The flashing process itself has been described at numerous places on Internet.

#### Building With PlatformIO
The build enviroment is based on [PlatformIO](http://platformio.org). Follow the instructions found here: http://platformio.org/#!/get-started for installing it but skip the ```platform init``` step as this has already been done, modified and it is included in this repository. In summary:

```
sudo pip install -U pip setuptools
sudo pip install -U platformio
git clone https://github.com/omersiar/esp-rfid.git
cd esp-rfid
platformio run
```

When you run ```platformio run``` for the first time, it will download the toolchains and all necessary libraries automatically.

#### Useful commands:

* ```platformio run``` - process/build all targets
* ```platformio run -e nodemcu -t upload``` - process/build and flash just the ESP12e target (the NodeMcu v2)
* ```platformio run -t clean``` - clean project (remove compiled files)

The resulting (built) image(s) can be found in the directory ```/bin``` created during the build process.

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

For Wiegand based readers, you can configure D0 and D1 pins via settings page. By default, D0 is GPIO-4 and D1 is GPIO-5

### Steps
* First, flash firmware (you can use /bin/flash.bat on Windows) to your ESP either using Arduino IDE or with your favourite flash tool
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
* MQTT does not publish the UID anymore when disconnected from MQTT server.
* Please also check [GitHub issues](https://github.com/omersiar/esp-rfid/issues).


#### Time
We are syncing time from a NTP Server (in Client -aka infrastructure- Mode). This will require ESP to have an Internet connection. Additionaly your ESP can also work without Internet connection too (Access Point -aka Ad-Hoc- Mode),  without giving up functionality.
This will require you to do syncing manually. ESP can store and hold time for you approximately 51 days without a major issue, device time can drift from actual time depending on usage, temprature, etc.
So you have to login to settings page and sync it in a timely fashion.

## **Security**
We assume **ESP-RFID** project -as a whole- does not ready for actual day-to-day usage in the means of security. [Crypto 1](http://www.cs.virginia.edu/~kn5f/Mifare.Cryptanalysis.htm) cipher is cracked which is used to secure Mifare Classic RFID PICCs (tags). There are PICCs available that their UID (Unique Identification Numbers) can be set manually (Currently esp-rfid relies only UID to identify it's users). Also there may be a bug in the code that result free access to your belongings. And also, like every other network connected device esp-rfid is vulnerable to many attacks including Man-in-the-middle, Brute-force, etc.

These sound devastating security problems for a simple project, but we can not be held liable any damages done because of this software.

What can be done to increase security? (by you and by us)

* We are working on more secure ways to Authenticate RFID Tags.
* You can disable wireless network to reduce attack surface. (This can be configured in Web UI Settings page)
* Choose a strong password for the Web UI

## Scalability
Since we are limited on both flash and ram size things may get ugly at some point in the future. You can find out some test results below.

### Tests

#### 1) How many RFID Tag can be handled?
Restore some randomly generated user data on File System worth:

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

## Community
* [![Chat at https://gitter.im/esp-rfid/Lobby](https://badges.gitter.im/esp-rfid.svg)](https://gitter.im/esp-rfid/Lobby) Join community chat on Gitter

### Projects that is based on esp-rfid
* [ESP-IO](https://github.com/Pako2/EventGhostPlugins/tree/master/ESP-IO)

### Contributions
Thanks to the community, ESP-RFID come to alive with their great effort:

- @rneurink
- @thunderace
- @zeraien
- @nardev
- @romanzava

See [ChangeLog](https://github.com/omersiar/esp-rfid/blob/development/CHANGELOG.md)

## Donations
If this project helps you in a way, you can buy us a beer. You can make a donation to the ESP-RFID community with [Bountysource](https://salt.bountysource.com/teams/esp-rfid)

#### Donators
* 2017-10-03 [steinar-t](https://github.com/steinar-t)
* 2017-12-10 [saschaludwig](https://github.com/saschaludwig)

Thank you for your contributions.

## License
UNLICENSE
