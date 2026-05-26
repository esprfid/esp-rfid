# ESP RFID - Access Control with ESP8266/ESP32-C3/ESP32, RC522 PN532 Wiegand RDM6300

[![Chat at https://gitter.im/esp-rfid/Lobby](https://badges.gitter.im/esp-rfid.svg)](https://gitter.im/esp-rfid/Lobby) [![Backers on Open Collective](https://opencollective.com/esp-rfid/backers/badge.svg)](#backers) [![Sponsors on Open Collective](https://opencollective.com/esp-rfid/sponsors/badge.svg)](#sponsors)

Access Control system using cheap MFRC522, PN532 RFID, RDM6300 readers, or Wiegand RFID readers with Espressif ESP8266 and ESP32-family microcontrollers.

![Showcase Gif](https://raw.githubusercontent.com/esprfid/esp-rfid/stable/demo/showcase.gif)[![Board](https://raw.githubusercontent.com/esprfid/esp-rfid/stable/demo/board.jpg)](https://www.tindie.com/products/nardev/esp-rfid-relay-blue-board/)

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
* Thanks to ESPAsyncWebServer Library communication is Asynchronous
### Official Hardware
* Small size form factor, sometimes it is possible to glue it into existing readers.
* Single power source to power 12V/2A powers ESP12 module, RFID Wiegand Reader and magnetic lock for opening doors.
* Exposed programming pins for ESP8266
* Regarding hardware design, you get multiple possible setup options:
* Forward Bell ringing on reader to MCU or pass it out of board
* Track Door Status
* Control reader’s status LED
* Control reader’s status BUZZER sound *
* Power reader, lock and the board through single 12V, 2A PSU
* Optionally power magnetic lock through external AC/DC PSU
* Possible to use any kind and any type of Wiegand readers
* Enables you to make IOT Access System with very little wiring
* Fits in an universal enclosures with DIN mount
* Open Source Hardware

Get more information and see accessory options from [Tindie Store](https://www.tindie.com/products/nardev/esp-rfid-relay-blue-board/)

| What are others saying about esp-rfid? |
| ---- |
| _“Hi, nice project.”_ – [@Rotzbua]() |
| _“Your app works like a charm”_ – [@tueddy ]() |
| _“Just stumbled upon this project while planning to do something similar. Very beautifully done!”_ – [@LifeP]() |
| _“Hello, I've come across your project and first of all… wow - thanks to all contributors for your hard work!”_ – [@byt3w4rri0r]() |
| _“Brilliant work.”_ – [@danbicks]() |
| _“This is an impressive project.”_ – [@appi1]() |
| _“I'd like to thank every single contributor for creating this epic project.”_ – [@TheCellMc]() |
| _“Congratulations for your awesome work! This project is absolutely brilliant.”_ – [@quikote]() |

## Getting Started
This project still in its development phase. New features (and also bugs) are introduced often and some functions may become deprecated. Please feel free to comment or give feedback.

* Get the latest release from [here](https://github.com/esprfid/esp-rfid/releases).
* See [Known Issues](https://github.com/esprfid/esp-rfid#known-issues) before starting right away.
* See [Security](https://github.com/esprfid/esp-rfid#security) for your safety.
* See [ChangeLog](https://github.com/esprfid/esp-rfid/blob/dev/CHANGELOG.md)

### What You Will Need
### Hardware
* [Official ESP-RFID Relay Board](https://www.tindie.com/products/nardev/esp-rfid-relay-blue-board/)
or
* An ESP8266 module or a development board like **WeMos D1 mini** or **NodeMcu 1.0** with at least **32Mbit Flash (equals to 4MBytes)**
* For the secure credential backend: an **ESP32-C3** board is the current target; ESP32/ESP32-S3 can also be built with adjusted pins
* A MFRC522 RFID PCD Module or PN532 NFC Reader Module or RDM6300 125KHz RFID Module Wiegand based RFID reader
* A Relay Module (or you can build your own circuit)
* n quantity of Mifare Classic 1KB (recommended due to available code base) PICCs (RFID Tags) equivalent to User Number

### Software

#### Using Compiled Binaries
Download compiled binaries from GitHub Releases page
https://github.com/esprfid/esp-rfid/releases

On Windows you can use **"flash.bat"**, it will ask you which COM port that ESP is connected and then flashes it. You can use any flashing tool and do the flashing manually. The flashing process itself has been described at numerous places on Internet.

#### Building With PlatformIO

The build environment is based on [PlatformIO](http://platformio.org). Follow the instructions found here: http://platformio.org/#!/get-started for installing it but skip the ```platform init``` step as this has already been done, modified and it is included in this repository. In summary:

```
sudo pip install -U pip setuptools
sudo pip install -U platformio
git clone https://github.com/esprfid/esp-rfid.git
cd esp-rfid
platformio run
```

When you run ```platformio run``` for the first time, it will download the toolchains and all necessary libraries automatically.

##### Useful commands:

* ```platformio run``` - process/build all targets
* ```platformio run -e generic -t upload``` - process/build and flash just the ESP12e target (the NodeMcu v2)
* ```platformio run -e esp32c3 -t upload``` - process/build and flash the ESP32-C3 target
* ```platformio run -e esp32 -t upload``` - process/build and flash the ESP32 target
* ```platformio run -t clean``` - clean project (remove compiled files)

The resulting (built) image(s) can be found in the directory ```/bin``` created during the build process.

##### How to modify the project

If you want to modify the code, you can read more info in the [CONTRIBUTING](./CONTRIBUTING.md) file.


### Pin Layout

The following table shows the typical pin layout used for connecting readers hardware to ESP:

| ESP8266 | NodeMcu/WeMos | Wiegand | PN532         | MFRC522 | RDM6300 |
|--------:|:-------------:|:-------:|:-------------:|:-------:|:-------:|
| GPIO-16 | D0            |         | SS (Wemos D1) | SDA/SS  |         |
| GPIO-15 | D8            |         |               | SDA/SS  |         |
| GPIO-13 | D7            | D0      | MOSI          | MOSI    |         |
| GPIO-12 | D6            | D1      | MISO          | MISO    |         |
| GPIO-14 | D5            |         | SCK           | SCK     |         |
| GPIO-04 | D2            |         |               |         | TX      |
| GPIO-05 | D1            |         | SS            |         |         |

For Wiegand based readers, you can configure D0 and D1 pins via settings page. By default, D0 is GPIO-4 and D1 is GPIO-5

### Steps
* First, flash firmware (you can use /bin/flash.bat on Windows) to your ESP either using Arduino IDE or with your favourite flash tool
* (optional) Fire up your serial monitor to get informed
* Search for Wireless Network "esp-rfid-xxxxxx" and connect to it (It should be an open network and does not require password)
* Open your browser and visit either "http://192.168.4.1" or "http://esp-rfid.local" (.local needs Bonjour installed on your computer).
* Log on to ESP, default password is "admin"
* Go to "Settings" page
* Configure your amazing access control device. Push "Scan" button to join your wireless network, configure RFID hardware, Relay Module.
* Save settings, when rebooted your ESP will try to join your wireless network.
* Check your new IP address from serial monitor and connect to your ESP again. (You can also connect to "http://esp-rfid.local")
* Go to "Users" page
* Scan a PICC (RFID Tag) then it should glimpse on your Browser's screen.
* Type "User Name" or "Label" for the PICC you scanned.
* Choose a Role for the user
* Click "Add"
* Congratulations, everything went well, if you encounter any issue feel free to ask help on GitHub.

## Role-Based Access

Access rules now use editable roles instead of the old fixed `Disabled`, `Always`, and `Admin` user modes.

Roles are stored in `/roles.json` and are intentionally capped at **8 roles** to keep ESP8266 heap usage predictable. Each role has:

* numeric `id`
* `name`
* `enabled` flag
* `admin` flag
* relay mask for up to 4 relays
* weekly schedule as 7 day strings of 24 hourly flags

Built-in roles:

| Role | Behavior |
| ---- | ---- |
| `Admin` | always enabled, ignores schedule, enables WiFi, activates every relay |
| `Standard` | migrated from the previous global `general.openinghours` schedule |
| `Disabled` | never grants access |

User files now store `role_id`. Older user files without `role_id` remain compatible:

* legacy `acctype = 99` maps to `Admin`
* legacy `acctype = 1` maps to `Standard`
* legacy `acctype = 0` maps to `Disabled`

The old global Opening hours editor was removed from General Settings. Schedules are now edited per role from the Roles page. Role backup and restore use `esp-rfid-roles.json`.

### MQTT
You can integrate ESP-RFID with other systems using MQTT. Read the [additional documentation](./README-MQTT.md) for all the details.

## Secure Reader Backend (ESP32)

An alternative credential path is now available for ESP32 builds. It is kept separate from the legacy UID-based access flow and is selected by setting `hardware.readertype` to `7`.

### Goals

* ESP32-C3 as the current reader MCU target
* ESP32/ESP32-S3 support remains possible with target pin profiles
* PN532 over SPI
* RS-485 event delivery over UART
* MIFARE DESFire credential flow
* No authorization based on UID/CSN
* Backend abstraction so PN532 can later be replaced by OSDP or other secure readers

### Current module split

* `src/nfc_pn532.*` - PN532 transport and ISO14443-A card detection
* `src/desfire.*` - DESFire application selection, file settings, EV2/legacy AES authentication, protected file read, credential parsing
* `src/credential_reader.*` - backend abstraction and current `PN532_DESFIRE` implementation
* `src/rs485_bus.*` - framed RS-485 transport with CRC16-CCITT
* `src/crc16.*` - checksum implementation
* `src/access_reader_app.*` - secure reader application loop, debounce, heartbeat, feedback
* `src/security_keys.h` - centralized prototype key location

### Reader compatibility by target

| Reader type in Hardware Settings | ESP8266 | ESP32-C3 | ESP32 / ESP32-S3 | Notes |
| ---- | ---- | ---- | ---- | ---- |
| `MFRC522` | yes | yes | yes | Legacy UID/CSN flow |
| `Wiegand` | yes | yes | yes | Legacy ID/Wiegand flow |
| `PN532` | yes | yes | yes | Legacy UID/CSN flow |
| `MFRC522 + RDM6300` / `Wiegand + RDM6300` / `PN532 + RDM6300` | yes | yes | yes | Hybrid legacy flow |
| `Secure PN532 + RS-485` (`readertype = 7`) | no | yes | yes | ESP32-family-only secure backend (`PN532_DESFIRE`) |

### Reader wiring

The firmware currently exposes `esp32c3`, `esp32`, or `esp8266` in WebSocket status. ESP32-S3 currently uses the `esp32` profile value. The Web UI uses that value to select the secure-reader pin profile automatically. Saved configs using the exact old defaults are migrated to the active target defaults at load time; manually customized pins are left untouched.

ESP8266 remains supported for the legacy readers, including the existing PN532 path, but the DESFire secure credential backend is intentionally limited to ESP32-family targets. The secure backend needs AES/CMAC crypto, more heap headroom, reliable UART handling for RS-485, and future hardening options such as secure boot and flash encryption.

| Target | RS-485 default | PN532 SPI default | Notes |
| ---- | ---- | ---- | ---- |
| ESP32-C3 | UART1, TX GPIO4, RX GPIO5, DE/RE GPIO3 | SCK GPIO6, MISO GPIO2, MOSI GPIO7, SS GPIO10, RST GPIO9 | UART2 is not available |
| ESP32-S3 | UART2, TX GPIO17, RX GPIO16, DE/RE GPIO4 | SCK GPIO18, MISO GPIO19, MOSI GPIO23, SS GPIO5, RST GPIO27 | Currently uses the same `esp32` pin profile; adjust pins for your board if needed |
| ESP32 | UART2, TX GPIO17, RX GPIO16, DE/RE GPIO4 | SCK GPIO18, MISO GPIO19, MOSI GPIO23, SS GPIO5, RST GPIO27 | Classic ESP32 DevKit profile |
| ESP8266 | secure backend disabled in UI | secure backend disabled in UI | Legacy readers only |

Example ESP32-C3 wiring for PN532 over SPI:

| PN532 | ESP32-C3 default secure backend pin |
| ---- | ---- |
| SCK | GPIO6 |
| MISO | GPIO2 |
| MOSI | GPIO7 |
| SS / SDA | GPIO10 |
| RSTO | GPIO9 |
| VCC | 3.3V |
| GND | GND |

Example ESP32-C3 wiring for RS-485 transceiver (`MAX3485`, `SP3485`, `SN65HVD`):

| RS-485 transceiver | ESP32-C3 default secure backend pin |
| ---- | ---- |
| DI | GPIO4 |
| RO | GPIO5 |
| DE | GPIO3 |
| /RE | GPIO3 |
| VCC | 3.3V |
| GND | GND |
| A/B | RS-485 bus |

Example ESP32-S3 wiring (current profile defaults, same as `esp32`):

| Signal | ESP32-S3 default secure backend pin |
| ---- | ---- |
| RS-485 TX (DI) | GPIO17 |
| RS-485 RX (RO) | GPIO16 |
| RS-485 DE + /RE | GPIO4 |
| PN532 SCK | GPIO18 |
| PN532 MISO | GPIO19 |
| PN532 MOSI | GPIO23 |
| PN532 SS / SDA | GPIO5 |
| PN532 RSTO | GPIO27 |

Notes:

* `DE` and `/RE` are tied together in the default half-duplex setup.
* On ESP32-C3 the secure backend uses UART1 by default; UART2 is not available on this target.
* ESP32-S3 currently follows the `esp32` secure-reader profile in firmware and web UI.
* Avoid GPIO11-GPIO17 for normal IO on common ESP32-C3 modules because they are typically tied to flash.
* Avoid GPIO18/GPIO19 when native USB CDC/JTAG is used.

### RS-485 frame format

Start byte: `0x02`  
End byte: `0x03`

Frame layout:

`[STX][LEN_L][LEN_H][READER_ID_LEN][READER_ID][MSG_TYPE][PAYLOAD_LEN_L][PAYLOAD_LEN_H][PAYLOAD][CRC_L][CRC_H][ETX]`

Message types:

* `0x01` = `card_read`
* `0x02` = `auth_failed`
* `0x03` = `read_failed`
* `0x04` = `heartbeat`
* `0x05` = `tamper`
* `0x06` = `status`

CRC:

* CRC16-CCITT
* calculated over the frame body from `READER_ID_LEN` through the end of `PAYLOAD`

Conceptual event payload:

```json
{
  "event": "card_read",
  "reader_id": "door_01",
  "credential": "000123",
  "tech": "DESFire",
  "auth": "AES",
  "uid_used": false
}
```

The wire payload is not JSON; the structure above is only the logical event model.

### Example configuration

The secure backend is configured inside `/config.json` using the `secure_reader` section:

```json
{
  "hardware": {
    "readertype": 7
  },
  "secure_reader": {
    "backend": "PN532_DESFIRE",
    "pin_profile": "esp32c3",
    "reader_id": "door_01",
    "desfire_aid": "0x564F4C",
    "desfire_file_id": 1,
    "desfire_key_no": 0,
    "desfire_file_comm_mode": "plain",
    "aes_key": "00112233445566778899AABBCCDDEEFF",
    "rs485_uart": 1,
    "rs485_baud": 115200,
    "rs485_tx_pin": 4,
    "rs485_rx_pin": 5,
    "rs485_dere_pin": 3,
    "pn532_sck_pin": 6,
    "pn532_miso_pin": 2,
    "pn532_mosi_pin": 7,
    "pn532_ss_pin": 10,
    "pn532_reset_pin": 9,
    "card_debounce_ms": 1500,
    "heartbeat_interval_ms": 10000,
    "debug_uid": false
  }
}
```

Notes:

* set `desfire_file_id` to `255` to auto-discover the first supported standard/backup data file inside the selected application
* when `desfire_file_comm_mode` is `auto`, the reader also resolves the communication mode from the discovered file settings

### DESFire card-side expectations

The secure reader path is designed around:

* custom DESFire Application ID `0x564F4C`
* protected file ID `0x01`
* AES application key number `0`
* configurable file communication mode in `secure_reader.desfire_file_comm_mode`:
  `auto`, `plain`, `maced`, or `full`
* in `auto`, the reader authenticates first and then resolves the file communication mode using `GetFileSettings`

Current parser expectations for the credential payload:

* ASCII credential string, or
* `[length][ascii-bytes...]`, or
* simple TLV entries encoded as `[tag][length][value...]`

Supported TLV tags:

* `0x01` = `credential_id`
* `0x02` = `user_id`

For TLV values:

* printable bytes are returned as-is
* non-printable bytes are returned as uppercase hex text

UID/CSN is never used as the access identity. It may be logged for debugging only when `debug_uid` is explicitly enabled.

### Current limits

The architecture, transport split, debounce logic, RS-485 framing, application selection, EV2/legacy AES mutual authentication, and post-auth `ReadData` flow are implemented.

Implemented DESFire path:

* `SelectApplication` using native command `0x5A`
* AES authentication using DESFire `AuthenticateEV2First` command `0x71` on EV2/EV3-compatible cards
* subsequent EV2 re-authentication using `AuthenticateEV2NonFirst` command `0x77` when an EV2 session is already active
* fallback to legacy DESFire `AuthenticateAES` command `0xAA`
* EV2 AES session key derivation according to the NXP secure messaging scheme
* local EV2 CMAC generation and verification
* file enumeration using native `GetFileIDs` command `0x6F`
* file settings lookup using native `GetFileSettings` command `0xF5`
* EV2 protected `GetFileIDs` with command MAC and response MAC verification when an EV2 session is active
* EV2 protected `GetFileSettings` with command MAC and response MAC verification when an EV2 session is active
* native `ReadData` command `0xBD`
* `plain`, `maced`, and `full` file read handling for EV2-authenticated sessions
* chained responses using `0xAF` for plain reads and secure EV2 read responses within the local response buffer budget

Important limitation:

* `auto` mode depends on `GetFileSettings` being allowed for the authenticated key. When EV2 auth is active that lookup is now MAC-protected too, but if the card configuration denies the command for that key you still need a manual communication mode in config.
* Auto file discovery depends on `GetFileIDs` being allowed for the authenticated key.
* `auto` mode is meant for standard or backup data files. Record and value file types are rejected by the credential reader path.
* Secure `maced` / `full` reads currently work only with an active EV2-authenticated session. Legacy `AuthenticateAES` fallback stays on the plain read path.
* Secure response chaining is now handled, but the local DESFire secure response assembly buffer is still capped for small-to-medium credential payloads.
* The credential payload buffer is still sized for a small DESFire credential file and the underlying PN532 packet buffer remains `80` bytes.
* `full` mode decrypts response data and removes ISO/IEC 9797-1 method 2 padding, but wider secure-messaging coverage for more commands is still pending.

So the secure path can now authenticate and read a DESFire credential file in plain, MACed, or full communication mode on compatible EV2/EV3 cards, including follow-up EV2 authentication within the same transaction, while still leaving some secure-messaging coverage to finish before a final high-security rollout.

### Next hardening steps

* diversified DESFire keys per credential
* secure-messaging coverage for additional DESFire commands
* larger-payload secure response handling beyond the current local assembly buffer
* encrypted NVS for secrets instead of plaintext prototype key storage
* secure boot
* flash encryption
* authenticated controller responses over RS-485
* optional OSDP / commercial secure reader backend implementing the same `ReaderBackend` interface

## Memory and stability notes

Recent local changes also reduce memory pressure and timing cross-talk in the mixed ESP8266/ESP32 code path:

* WebSocket `configfile` writes are handled as raw payloads, avoiding a full JSON parse of large configuration messages before writing `/config.json`.
* WebSocket and log/list/status JSON responses now serialize to a `String` and send through `ws.makeBuffer(...)`, avoiding manual `measureJson()` buffer sizing mistakes.
* WebSocket inbound messages are copied with explicit length handling and null termination instead of `strlcpy()` on possibly non-null-terminated frame data.
* MQTT chunk assembly now bounds writes to `MAX_MQTT_BUFFER - 1` and always leaves room for the terminator.
* MQTT auto-topic suffix allocation now uses exact length and frees the previous topic pointer before replacing it.
* Relay timing now uses `previousRelayMillis[]` per relay, and beeper timing uses `beeperPreviousMillis`, avoiding shared `previousMillis` interference.
* `loadConfiguration()` now uses a larger `DynamicJsonDocument` for the expanded ESP32 secure-reader config and applies safer defaults for NTP/config strings.
* Log maintenance and file listing use the cross-platform SPIFFS/watchdog helpers from `platform_compat.h`.
* ESP32 SPIFFS user listing now scans the root and filters the `/P/` prefix, matching ESP8266 `openDir("/P/")` behavior for saved user files.
* Web UI gz assets use a cross-platform static response helper, and WebSocket buffers use the legacy-compatible `uint8_t *` signature so ESP8266 and ESP32 builds both compile.
* Role-based access uses a compact `MAX_ACCESS_ROLES = 8` model with 7 `uint32_t` schedule masks per role; ESP8266 release RAM remains under 50% in the current build.
* ESP32-C3 is the default PlatformIO target, with UART1 and C3-safe default pins for the secure reader path.
* Secure-reader pins are now selected automatically from the firmware target: ESP32-C3 gets the UART1/C3-safe profile, classic ESP32 gets the UART2/VSPI profile, and ESP8266 hides the secure backend option.
* ESP8266 stays on the legacy reader stack. DESFire secure credentials are kept on ESP32-family builds to avoid fragile heap/crypto/UART behavior and to preserve a path toward secure boot and flash encryption.
* ESP32-C3 STA WiFi disables power-save sleep, waits longer for DHCP, logs disconnect reason codes, and suppresses repeated NTP warnings before the station has an IP.

### Known Issues
* You need to connect your MFRC522 reader to your ESP properly or you will end up with a boot loop
* Please also check [GitHub issues](https://github.com/esprfid/esp-rfid/issues).

#### Time
We are syncing time from a NTP Server (in Client -aka infrastructure- Mode). This will require ESP to have an Internet connection. Additionally your ESP can also work without Internet connection (Access Point -aka Ad-Hoc- Mode), without giving up functionality.
This will require you to sync time manually. ESP can store and hold time for you approximately 51 days without major issues, device time can drift from actual time depending on usage, temperature, etc. so you have to login to settings page and sync it in a timely fashion.
Timezones are supported with automatic switch to and from daylight saving time.

## **Security**
We assume **ESP-RFID** as a whole does not offer strong security guarantees.

Legacy reader modes still rely mostly on token identifiers (UID/CSN, Wiegand IDs, or similar values), which can be cloned or replayed depending on the card/reader technology.

The ESP32 secure reader backend can use DESFire protected credential data instead of UID/CSN, but it is still under active hardening and should currently be treated as advanced hobby/experimental functionality.

As with every network-connected device, ESP-RFID is also exposed to generic risks such as brute-force and man-in-the-middle attacks if deployed without network hardening.

This is a simple, hobby grade project, do not use it where strong security is needed.

What can be done to increase security? (by you and by us)

* Use the ESP32 secure backend with DESFire credentials where possible, and replace prototype keys before production testing.
* Keep `debug_uid` disabled in secure backend configurations outside of troubleshooting.
* You can disable wireless network to reduce attack surface. (This can be configured in Web UI Settings page)
* Choose a strong password for the Web UI

## Scalability
Since we are limited on both flash and ram size things may get ugly at some point in the future. You can find out some test results below.

### Tests

#### 1) How many RFID Tag can be handled?
Restore some randomly generated user data on File System worth:

* 1000 separate "userfile"
* random 4 Bytes long UID and
* random User Names and
* 4 bytes random Unix Time Stamp
* each have "access type" 1 byte integer "1" or "0".

Total 122,880 Bytes

At least 1000 unique User (RFID Tag) can be handled, the test were performed on WeMos D1 mini.

#### Additional testing is needed:

* Logging needs testing. How long should it need to log access? What if a Boss needs whole year log?
* Reliability on Flash (these NOR Flash have limited write cycle on their cells). It depends on manufacturer choice of Flash Chip and usage.

## Community

[![Chat at https://gitter.im/esp-rfid/Lobby](https://badges.gitter.im/esp-rfid.svg)](https://gitter.im/esp-rfid/Lobby) Join community chat on Gitter

### Projects that are based on esp-rfid

* [ESP-IO](https://github.com/Pako2/EventGhostPlugins/tree/master/ESP-IO) Project to manipulate GPIOs with EventGhost
* [ESP-RCM](https://github.com/Pako2/esp-rcm) Room Climate Monitor with ESP8266, HTU21D, Si7021, AM2320
* [ESP-RFID-PY](https://github.com/esprfid/esp-rfid-py) Micro-Python implementation of esp-rfid is also made available by @iBobik

### Acknowledgements

- @rneurink
- @thunderace
- @zeraien
- @nardev
- @romanzava
- @arduino12
- @Pako2
- @marelab

See [ChangeLog](https://github.com/esprfid/esp-rfid/blob/dev/CHANGELOG.md)

## Donations
[![OC](https://opencollective.com/esp-rfid/tiers/esp-rfid-user.svg?avatarHeight=56)](https://opencollective.com/esp-rfid)

Developing fully open, extensively tested embedded software is hard and time consuming work. Please consider making donations to support developers behind this beautiful software.

Donations **transparently** processed by **[Open Collective](https://opencollective.com/how-it-works)** and expenses are being made public by OC's open ledger.

* 2017-10-03 [steinar-t](https://github.com/steinar-t)
* 2017-12-10 [saschaludwig](https://github.com/saschaludwig)
* 2018-10-02 Dennis Parsch
* 2019-01-12 Chris-topher Slater
* 2019-04-23 Klaus Blum
* 2019-04-25 Andre Dieteich

## Contributors

This project exists thanks to all the people who contribute. 
<a href="https://github.com/esprfid/esp-rfid/graphs/contributors"><img src="https://opencollective.com/esp-rfid/contributors.svg?width=890&button=false" /></a>

## License
The code parts written by ESP-RFID project's authors are licensed under [MIT License](https://github.com/esprfid/esp-rfid/blob/stable/LICENSE), 3rd party libraries that are used by this project are licensed under different license schemes, please check them out as well.
