# Change Log
All notable changes to this project will be documented in this file.

## [Unreleased]
#### Added
- [firmware + webui] Embeded web files
- [firmware + webui] MQTT to main branch.
- [firmware + webui] Access column to logs for the information, if the access was granted or not @romanzava
- [build] Travis CI
- [webui] NProgress.js
- [firmware] Glyphicons redirection for SPIFFS's limited 32 char filename.
- [dev tools] WebSocket emulator for rapid web page development. (This require node.js)
- [build] Gulp script for auto css/js file concat and gzip
- [dev tools] Offline static web page development capability (enter "neo" as admin password for local testing)
- [dev tools] gulp script for PROGMEM web files.

#### Changed
- [webui] Hardcoded FooTable Add/Edit text
- [webui] Only support woff glyphicons font
- [dev tools] Clean and beautify main.cpp @nardev
- [webui] Minor cosmetic changes
- [webui] Javascript loading moved to end of the html
- [webui] index.html for more modern look and feel.
- [build] more meaningful directories for web files.
- [webui] RSSI percent calculation
- [firmware] Limit printScanResult to 5 best (based on RSSI) networks around (esp becomes unresponsive if there are too many networks)

#### Fixed
- [firmware + webui] MQTT - UID publish was missing.

#### Removed
- [firmware] Web files no longer contained in SPIFFS
- [firmware] SPIFFS Editor.
- [firmware] Confusion about MFRC533 reader.
- [build] pio script where we were trying to modify flashing parameters it was affecting SPIFFS upload too.

## [0.4alpha] - 2018-01-21
#### Added
- Initial Wiegand Reader (RFID Reader) support. - @nardev
- Use secure WebSocket protocol if there is a reverse proxy available. - @thunderace

#### Changed
- Default IDE is now PlatformIO, from now on Arduino IDE support is dropped.
- SPIFFS Editor's password is now same with the administration password -@thunderace
- SPI SS pin is now have a default value 15 when there is no configuration file. - @thunderace

## [0.3beta] - 2017-12-24
#### Fixed
- Partly fixed (We still have a quirk with adding new user, may fixed by library level) [#33](https://github.com/omersiar/esp-rfid/issues/33)

## [0.3beta] - 2017-12-09 (zeraien)
#### Fixed
- Fallback AP now gets SSID ESP-RFID-xxxxxx (last 6 digits of mac).
- Also refactored to remove code duplication, new method startAP(ssid, password=NULL) rather than duplicating AP creation.

## [0.3beta] - 2017-12-09 (zeraien)
#### Added
- Automatically disconnects wifi until an "admin" card is read in by the user. Default is to keep wifi on unless configured otherwise.
- Add automatic restart setting, to lessen risk of memory leaks and crashes.
- The wifi network created will have the same name as the "hostname", in case you have multiple units nearby

#### Changed
- Also some minor tweaks to web interface.

## [0.3beta] - 2017-12-03 (thunderace)
#### Added
- [MQTT support](https://github.com/omersiar/esp-rfid/tree/mqtt) is on another branch.

## [0.3beta] - 2017-10-28
#### Added
- Basic Authentication on WebSocket

#### Changed
- minor cosmetic change

#### Fixed
- WebSocket fails without null pointer on Mac [#17](https://github.com/omersiar/esp-rfid/issues/17)

## [0.3alpha3] - 2017-09-06
#### Added
- New /compiledbin/flash.bat for easy flashing (For Windows Users)
- Sort Latest Log by Date
- 2 second cooldown for RFID Tag scans (to prevent double scans)

#### Changed
- Refactored Wi-Fi Network Scan. Now we are scanning hidden networks too, also additional info is now given to Web UI (Signal Strenght, BSSID of the Network also non used Encryption Type, Channel)
- Scanned Wi-Fi Network List is now sorted by Signal Strenght (RSSI, greater is better)

## [0.3alpha2] - 2017-08-31
#### Added
- Uptime to status
- Tooltips for settings

#### Removed
- Captive Portal

## [0.3alpha1] - 2017-08-28
#### Added
- Support for both Active Low and Active High Relays
- Basic loging (inefficent and limited to last 15 records)

#### Fixed
- #11 Simplified captive portal behaviour for stable AP Mode experience.

## [0.3alpha] - 2017-08-18
#### Added
- Support for jQuery v1.12.4
- Support for Bootstrap Javascript v3.3.7
- Support for Bootstrap Glyphicons
- Support for FooTable v3.1.6

#### Changed
- Refactored picclist command (JSON Array is now more human readable, can be queried page by page, initially 15 records per page due to Mobile Devices limiting maximum WebSocket message lenght, I do not know if this a feature or a bug)
- Restoring User Data is improved (restoring is now done one by one only when the ESP is ready to digest another userfile)
- Backup User Data is improved (thanks to newly optimized userlist command we are getting all the data from ESP page by page)
- Refactored User List (thanks to FooTable user list is now fully searchable, sortable, filterable, editable)
- Refactored framework's required Javascript and CSS files (All files minified and gzipped together, this will reduce requests made to ESP)
- While restoring user data now we are showing a pop-up (bootstrap modal)

#### Misc
- Run a test where 1000! users can be handled (see https://github.com/omersiar/esp-rfid#tests)

## [0.2] - 2017-08-09 We hit the V0.2 thanks to rneurink
#### Added
- BSSID Setting (This will allow to connect specific Access Point if there are more than one AP with the same SSID)
- Available SPIFFS storage [@rneurink](https://github.com/rneurink/esp-rfid/commit/5b962538bbf1c3234c05cea9ec8bf24f81ad6561)

#### Fixed
- Incorrect time were being sent to device (without timezone offset)
- Device Status in AP Mode [@rneurink](https://github.com/rneurink/esp-rfid)
- ESP gets unresponsive when device is in AP Mode (https://github.com/omersiar/esp-rfid/issues/11)

#### Changed
- Colorize progress bars depending on percentage [@rneurink](https://github.com/rneurink/esp-rfid)
- haveAcc to acctype (This will break backward compatibility if you made backup on previous version, there is a workaround that i can share if anyone wants)
- Switched to new NTP Client Library https://github.com/gmag11/NtpClient/

## [0.2rc2] - 2017-08-07
#### Added
- Time Settings
- Hostname Setting
- UID sanity check on Users Page

#### Fixed
- Restoring Users too fast (increased to 200ms) [@rneurink](https://github.com/rneurink/esp-rfid)

#### Changed
- Device Status location
- Bootstrap Version to v3.3.7

#### Removed
- Dropped NTPClient Library Usage (since we have TimeLib)

## [0.2rc1a] - 2017-08-03
#### Added
- New WebSocket command "status" (sends bunch of information to browser)
- Device Statics on Settings Page
- Restoring User Data (restoring large backups can take a while because we are sending user data to ESP one by one and waiting 100ms each time to make sure ESP can handle it)

#### Changed
- Branding (Copyright symbol is dropped, feel free to use this project as you want) See [License](https://github.com/omersiar/esp-rfid/blob/master/LICENSE)

## [0.2rc1] - 2017-08-02
#### Added
- Refresh page after saving settings. [@rneurink](https://github.com/rneurink/esp-rfid)
- Captive Portal for easy first setup. [@rneurink](https://github.com/rneurink/esp-rfid)
- Long-time-missing the "Remove" button. (Initialy we were getting always valid UID but now things were changed)
- Administrator Password setting.
- Basic Backup / Restore facility. (For now we can only restore settings not the Users)

#### Fixed
- Settings Page shows "... WebSocket connecting" message even if the connection was made
- Quirk in Sorting User List

#### Changed
- Config File now is more human readable.

#### Removed
- SPIFFS Update from Web (we will likely be able to update it directly from Internet)

## [0.1a] - 2017-07-14
#### Added
- Now you can select Wi-Fi mode.

#### Fixed
- Some fixes (features) were not included in previous release
- NTPClient wastes CPU time when device is in AP mode. (probably tries to force update time)

## [0.1] - 2017-07-12 - :hurray: We hit the 0.1!
#### Added
- Relay Module configuration in Settings Page (You need to make sure how the relay module reacts when device is restarting or on power-on, make changes accordingly). I may try to make it more universal, but for now it's up to you.
- Relay Test Button
- Ability to Add known PICC to User List (useful to add new PICC to device when device is already deployed)

#### Removed
- We do not need hardware reset anymore this frees a GPIO from MCU. (suggested by @farthinder [#6](https://github.com/omersiar/esp-rfid/issues/6) )

## [0.1rc2] - 2017-07-10 - Release Candidate
#### Added
- User List table now automaticly sorted by Name
- Click on an any element on User List to edit via Add / Update User
- User List actions are instantly happens on the ESP hardware.

#### Fixed
- Javascript functions (As suggested from JSHint and Codacy)

#### Misc
- Run a test where 100 seperate User can be handled (see https://github.com/omersiar/esp-rfid#tests)

## [0.1rc1] - 2017-07-05 - Release Candidate
#### Added
- Simple Firmware Update from settings page
- SPIFFS Update from settings page
- Now you can define a user name (or any label) for each PICC
- Now each PICC can be individually configured for access (before this, every known PICC had an access)

#### Fixed
- Logging In Authorization is now done via Async XMR Request. Browsers does not complain about it being synchronous anymore. (Tested with Chrome and Firefox)

#### Changed
- Inform web user while pages are loading https://www.nngroup.com/articles/response-times-3-important-limits/
- Configuration rutine
- Seperate settings page and Users specific page

#### Removed
- Appending ChipID to hostname

## [0.0.3] - 2017-06-22
#### Added
- RFID Hardware Pin and Gain settings via Web
- New WebSocket commands and better command scheme

#### Fixed
- can not fallback to AP Mode if configuration file is missing/corrupt

#### Changed
- Seperate Javascript file
- Refactor settings page
- Refactor Fall Back to AP Mode behaviour
- Rafactor configuration file structure
- Web page files now have support for mobile devices and as well as PCs

#### Removed
- Jumbotron CSS

## [0.0.2] - 2017-06-10
#### Added
- 'Settings' Menu - (and some snippets)
- Wi-Fi Client Settings can now be configured via Web

#### Changed
- STA - AP Mode behaviour is improved
- Minor changes

## [0.0.1] - 2017-05-10
#### Misc
- Initial public upload
- Code is now heavily commented
