# ESP32 RFID - Access Control with ESP32 and MFRC522

This project is based on the very nice project [esp-rfid](https://github.com/esprfid/esp-rfid). Don't use this project, because it was intentinally weakened to teach student IoT security.
It is also highly simplified for educational reasons:
- ESP32 support for Firebeetle, LILYGO-TTGO-T-beam and NodeMCU
- Only MFRC522 is supported, so RDM6300 and PN532 support removed

### What You Will Need
### Hardware
* An ESP32 module or a development board like **Firebeetle32** or **LILYGO-TTGO-T-beam** with at least **32Mbit Flash (equals to 4MBytes)**
* A MFRC522 RFID PCD Module
* A quantity of Mifare Classic 1KB (recommended due to available code base) PICCs (RFID Tags) equivalent to User Number

### Software

#### Using Compiled Binaries
Download compiled binaries from GitHub Releases page
https://github.com/cryptable/esp-rfid/releases
On Windows you can use **"flash.bat"**, it will ask you which COM port that ESP is connected and then flashes it. You can use any flashing tool and do the flashing manually. The flashing process itself has been described at numerous places on Internet.

#### Building With PlatformIO
##### Backend
The build environment is based on [PlatformIO](http://platformio.org). Follow the instructions found here: http://platformio.org/#!/get-started for installing it but skip the ```platform init``` step as this has already been done, modified and it is included in this repository. In summary:

```
sudo pip install -U pip setuptools
sudo pip install -U platformio
git clone https://github.com/cryptable/esp-rfid.git
cd esp-rfid
platformio run
```

When you run ```platformio run``` for the first time, it will download the toolchains and all necessary libraries automatically.

##### Useful commands:

* ```platformio run``` - process/build all targets
* ```platformio run -e firebeetle32 -t upload``` - process/build and flash just the **Firebeetle32** target
* ```platformio run -t clean``` - clean project (remove compiled files)

The resulting (built) image(s) can be found in the directory ```/bin``` created during the build process.

##### Frontend
You can not simply edit Web UI files because you will need to convert them to C arrays, which can be done automatically by a gulp script that can be found in tools directory or you can use compiled executables at the same directory as well (for Windows PCs only).

If you want to edit esp-rfid's Web UI you will need (unless using compiled executables):
* NodeJS
* npm (comes with NodeJS installer)
* Gulp (can be installed with npm)

Gulp script also minifies HTML and JS files and compresses (gzip) them. 

In order to test your changes without flashing the firmware you can launch websocket emulator which is included in tools directory.
* You will need to Node JS for websocket emulator.
* Run ```npm update``` to install dependencies
* Run emulator  ```node wserver.js```
* then you will need to launch your browser with CORS disabled:
* ```chrome.exe --args --disable-web-security -–allow-file-access-from-files --user-data-dir="C:\Users\USERNAME"```

Get more information here: https://stackoverflow.com/questions/3102819/disable-same-origin-policy-in-chrome


### Pin Layout

The following table shows the typical pin layout used for connecting readers hardware to ESP:

| ESP32   | MFRC522 |
|--------:|:-------:|
| GPIO-21 | SDA/SS  |
| GPIO-23 | MOSI    |
| GPIO-19 | MISO    |
| GPIO-18 | SCK     |
| GPIO-22 | RST     |

### Steps
* First, flash firmware (you can use /bin/flash.bat on Windows) to your ESP either using Arduino IDE or with your favourite flash tool
* (optional) Fire up your serial monitor to get informed
* Search for Wireless Network "esp-rfid-xxxxxx" and connect to it (It should be an open network and does not require password)
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

#### Time
We are syncing time from a NTP Server (in Client -aka infrastructure- Mode). This will require ESP to have an Internet connection. Additionally your ESP can also work without Internet connection too (Access Point -aka Ad-Hoc- Mode),  without giving up functionality.
This will require you to do syncing manually. ESP can store and hold time for you approximately 51 days without a major issue, device time can drift from actual time depending on usage, temperature, etc.
So you have to login to settings page and sync it in a timely fashion.


## License
The code parts written by ESP-RFID project's authors are licensed under [MIT License](https://github.com/esprfid/esp-rfid/blob/stable/LICENSE), 3rd party libraries that are used by this project are licensed under different license schemes, please check them out as well.
