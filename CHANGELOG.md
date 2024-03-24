# Change Log
All notable changes to this project will be documented in this file.

## [2.0.0] - 2023-11-14

#### Breaking changes
- [firmware] Removed build flag for `OFFICIALBOARD` #533 @matjack1
- [firmware] MQTT endpoints have been changed to be more consistent and complete #501 @matjack1

#### Added
- [firmware] Moved to native Arduino support for timezone and NTP to support daylight saving time #604 @matjack1
- [firmware] Added door name, to send via MQTT access type and door name for setups with multiple doors #598 @matjack1
- [firmware] Added more options for Wiegand readers on which bits to read #582 @matjack1
- [firmware] Added support for MQTT auto-topic with topic postfixed with 6 characters from MAC address #566 @matjack1
- [firmware] Added support to read/write configuration via MQTT #565 @matjack1
- [firmware] Added valid-since date for user validity #562 @matjack1
- [firmware] Added support for pincode only option to open door #551 @matjack1
- [webui] Improved support for websocket reconnection #502 @matjack1
- [firmware] Added opening hours with an hourly granularity #499 @matjack1
- [firmware] Added LED to signal that we are waiting for pincode and beeper support #490 @matjack1
    - beeper for valid, denied or admin access 
- [firmware] Added different pincode for each user after a card swipe #477 @matjack1
- [firmware] Improvements in MQTT including AutoDiscovery for the Home Assistant #449 #559 @xyzroe
- [firmware] Added anti-tamper support #449 @xyzroe
- [firmware] Added pin to give users feedback when access denied #426 @matjack1
- [firmware] Added ability to delete a single user over MQTT via UID #424 @baden02
- [docs] improved MQTT documentation #416 #423 @matjack1 @baden03
- [firmware] added doorbell support #415 @matjack1
- [firmware] improved decoding of Wiegand keypresses #360 @christofkac
- [firmware] added support for multiple relays #318 @frenchie71
- [firmware] optional BSSID for wifi connections #307 @frenchie71
- [firmware] Initial support for Wiegand Keypads @frenchie71
- [firmware] Initial support for OTP (TOTP) @frenchie71
- [webui] Added Download function for log files @frenchie71
- [webui] Log file options on WebUI @frenchie71
- [firmware] Log Maintenance Split, Rollover, View, Delete @frenchie7
- [firmware] Added button to open door and door status pin @nardev

#### Changed
- [firmware] Changed timezone support to add daylight saving management #604 @matjack1
- [firmware] Refactor WiFi connection #495 #497 #536 @matjack1
    - Option to disable access point mode for production usage
    - Automatic retries when connection drops
- [firmware] Refactor configuration #485 @matjack1
- [firmware] Upgrade to ArduinoJSON v6 #483 @matjack1
- [tools] Added Github Actions instead of Travis CI for building esp-rfid and ancillary tools #478 #482 @matjack1
- [firmware] Improved MQTT support #475 #476 #484 #487 #488 @matjack1
    - added queue for message processing to avoid watchdog timeout
    - ACK message on processing, to enable throttling of incoming messages
    - better reconnection on WiFi reconnections
- [firmware] Refactor RFID reading #471 #491 #496 @matjack1
    - separate reading card, reading pincode, processing
    - better support for external feedback, LEDs, beeper
- [tools] updated Gulp scripts for building web UI #414 #473 @matjack1
- [firmware] improved wifi handling #374 #375 @ingeninge
- [firmware] Wi-Fi connection routine is now improved @frenchie71
- [firmware] Log file operations are now more robust @frenchie71

## [1.3.3] Test-Release 2019-06-22
#### Fixed
* PlatformIO **ISR not in IRAM!** Hotfix

## [1.3.1] Test-Release 2019-06-21
#### Added
- [firmware] Support for Door Status tracking with log and mqtt options @nardev
- [firmware] adding mqtt_publish_info, generateUid functions @nardev
- [firmware] MQTT functionality is greatly improved thanks to @marelab 

Reading all user data over MQTT
Sending User data to RFID-DOOR/ESP-RFID over MQTT
Sending door open command over MQTT
Sending door status over MQTT as event
Sending Sync of a RFID-DOOR (IP/Hostname) over MQTT
Configure Sync interval over ESP-RFID GUI
Deleting all User of a ESP-RFID device over MQTT
Sending log event & access data over MQTT

#### Changed
- [firmware] Renaming some variable names @nardev
- [firmware] order of settings in web and hr lines @nardev

#### Fixed
- [webui] Make possible to connect WebUI behind NAT-ed network @Pako2 @abdulhanananwari
- [firmware] Issue #240 "Backup User Data only returns some users" @nardev

## [1.0.2] 2019-01-28

### BREAKING CHANGES (These changes will break your data on device, please make sure made a backup, also you can not use your old settings on this release but only can restore user data)

#### Added
- [firmware] Open/Close Button support @donatmarko
- [firmware] Logging Open/Close Button @donatmarko
- [firmware] the VERSION string is now defined at the beginning of main.cpp @Pako2
- [firmware] #218 Added latching relay support @donatmarko
- [firmware] #189 Flash layout changed to 2MB Firmware / 2MB SPIFFS Data @Pako2
- [firmware] Support for RDM6300 RFID readers (125kHz, UART) #163 @arduino12 / concurrently by @Pako2
- [firmware] debug firmware for debugging purposes
- [tools] executables for tools (no longer need to have node js and gulp for web ui development - **only lightly tested**)
- [firmware] LED_BUILTIN lights up while wifi connected and flashes when it waits for wifi @Pako2
- [webui] IP address choice option in AP mode @Pako2
- [webui] favicon.ico @Pako2
- [tools] websocket emulator can now store new configuration temporarly
- [firmware] log for firmware update #152
- [webui] Expired access attempts logged as "Expired"

#### Fixed
- [firmware] UART Monitor speed @donatmarko
- [firmware] avoid double Serial.begin @Pako2
- [firmware] removing redundant terminating null character  @Pako2
- [firmware] fix the loadconfiguration loop @Pako2
- [firmware] not able to connect MQTT server #157 @fivosg
- [firmware] a MQTT message typo #157 @wamboin23
- [webui] some breaks on web pages
- [webui] usage of !important CSS rule
- [firmware] #191 relay type inversion @Pako2
- [firmware] #190 Increase PN532::WaitReady debug level @Pako2
- [firmware] validuntil is being ignored #151
- [firmware] the boot loop when ssid is empty on configuration file (actually more a workaround than a fix) #154

#### Changed
- [firmware] unify output format debug print of PICC @Pako2
- [firmware] Improve onWsEvent() function @Pako2
- [build] Change release type to a zip file (was tar.gz before)
- [webui] scrollbar on desktop screens (now hidden)
- [webui] sidebar colors (i hope you like it, standart bootstrap color)
- [webui] sanity check for firmware update file #152
- [firmware] lock MFRC522 library to version 1.4.1

## [0.8.1] 2018-09-01
#### Added
- [firmware] Global websocket message to inform ws clients to toggle relay (upcoming client version will use it)
- [webui] incremental id for event log

#### Fixed
- [webui] available flash space calculation
- [webui] #143 duplicate records on User Data backup
- [firmware] #140 MQTT Heartbeat
- [webui] official board's hardware settings did not populate

#### Changed
- [firmware] do not initialize serial output unless we are debugging
- [build] slice main.cpp to multiple parts for better readability
- [webui] Access Type Active to Always
- [firmware] more reliable activation of relay

## [0.8.0]
#### Breaking Changes
- [firmware] Flash partition is changed to 1+3 !!! You need to backup your settings and users before updating to this version
- [firmware] For wiegand readers card id's changed hexadecimal to decimal !!! You need to change hexadecimal values to decimal values on your user backup file

#### Added
- [build] Optimize code for official board
- [firmware] mqtt boot, hearthbeat, access message added

#### Fixed
- [firmware] #128 Do not retain MQTT publishes
- [firmware] Compiller warnings fixed

#### Changed
- [webui] Default wifi type to AP
- [firmware] MQTT Messages are now plain JSON encoded texts
- [build] flash.bat file now asks which firmware to flash

## [0.7.6] - 2018-07-13
#### Fixed
- [firmware] #98 WDT Reset

## [0.7.5] - 2018-06-09
#### Fixed
- [build] BearSSL dependency error with Platformio
- [webui] #115 version numbering
- [firmware] #101 Permanent AP Mode

#### Changed
- [build] Updated PlatformIO configuration file for next PIO release

## [0.7.4] - 2018-04-28
#### Fixed
- [webui] comment out access types
- [firmware] fix a compile warning
- [firmware] change startAP behaviour
- [firmware] publish username to MQTT broker
- [firmware] mqtt username password memory collusion

#### Removed
- [firmware] Modified header

## [0.7.3] - 2018-04-04
#### Added
- [firmware] More debug messages

#### Fixed
- [webui] minor fixes suggested by Codacy
- [webui] get javascript values as real integers

## [0.7.2] - 2018-04-02
#### Fixed
- [webui] MQTT is enabled by default.

## [0.7.1] - 2018-03-30
#### Added
- [firmware] + [webui] Option to use static IP address #89 @nbaglietto
- [firmware] + [webui] Option to hide SSID on AP Mode #89 @nbaglietto
- [webui] Auto focus on login password #94 @pidiet
- [firmware] event log for MQTT

#### Fixed
- [webui] We were checking wrongly if the browser has previously had authentication over /login.
- [webui] MQTT listed disabled even if it is enabled #92 @pidiet

## [0.7.0] - 2018-03-23
#### Added
- [firmware] !!! BREAKING CHANGE !!! 2 MB Flash 2 MB SPIFFS size for future proof firmware updates plase make sure you made a backup before updating to this version. You need to format SPIFFS.
- [firmware] Experimental PN532 RFID Reader Support
- [webui] Try to connect button upon inprogress complete.
- [webui] Restart without saving changes.
- [firmware] Staging framework for platformio

#### Changed
- [webui] Sign in panel now integrated into index.html
- [firmware] Reduced serial outputs.
- [firmware] Switched to Async MQTT Library, needs testing.

#### Fixed
- [firmware] Logs causing Exception 9 because we are delaying async function with NTP sync by WiFi.hostbyname
- [webui] wrong version is shown #80.
- [webui] whole html was shifted with previous css change.

#### Removed
- [firmware] Factory reset via pin

## [0.6.1] - 2018-03-14
#### Added
- [firmware] ICACHE_FLASH_ATTR and ICACHE_RAM_ATTR decorators (did not feel any difference in terms of speed, keeping it anyway).
- [dev tools] Web UI Demo https://bitadvise.com/esp-rfid/
- [dev tools] Websocket emulator access log

#### Changed
- [webui] Always show sidebar on big screens
- [webui] Better versioning.

#### Fixed
- [build] Platformio bug

## [0.6] - 2018-03-11
#### Added
- [firmware] Restart ESP if softAP fails.
- [webui] Colorize access log based on result.

#### Fixed
- [webui] progress bar for factory reset, update, save settings does not initiated correctly.
- [webui] BSSID is missing when first scan.
- [webui] Now firmware internally holds only unix time, made changes on webui to cover that.

#### Changed
- [webui] Completely refactored html loading, we are getting all files at first login, then no request is made to web server which greatly simplifies some functions.
- [webui] + [firmware] Completely refactored Latest Access Log, it's now unlimited Access Log which holds every picc scan. This should fix #60 (at least there is clear log button :) ).
- [webui] Event log table now displays firmware time for early events.
- [webui] before fetching data wait sidebar to dismiss for smooth animation.
- [webui] fade in web content.
- [firmware] Log login remote IP address.

## [0.5.4] - 2018-03-09
#### Added
- [webui] colorize event logs based on severity.
- [webui] progress bar on saving settings.
- [dev tools] event log for websocket emulator

#### Fixed
- [firmware] Fix #75 Scan of wifi returns more columns of the same wifi.
- [webui] Fix #74 #33 completely New user with incorrect validity.
- [webui] New user with incorrect date.
- [webui] Editing user results non parsed values.

#### Changed
- [webui] event table breakpoints.

## [0.5.3] - 2018-03-08
#### Added
- [webui] Firmware Update is now live with latest version check on GitHub.

#### Fixed
- [firmware] Update was possible with an unauthorized HTTP Post.

## [0.5hotfix2] - 2018-03-07
#### Added
- [webui] Factory reset within Web UI.
- [webui] + [firmware] Event logging is now live.

#### Fixed
- [firmware] Can not with default password login on fresh setup.

#### Changed
- [webui] Changes suggested from Codacy.

## [0.5hotfix1] - 2018-03-06
#### Added
- [firmware] **!!!! Breaking Change !!!!** Factory reset on boot if GPIO-16 is LOW or SPIFFS is corrupted. Make changes accordingly.
- [webui] Touch detect on touch enabled devices in order to open/close sidebar on swipe.
- [webui] Logout is now live (this is actually a dirty hack);

#### Fixed
- [dev tools] - Websocket emulator time was static
- [firmware] #68 NTP functions cause Exception 9 and ESP crashes

#### Changed
- [webui] Embarrassing multiple HTM pages now reduced to one.
- [webui] Better representing of device and browser times on NTP settings.
- [webui] Prevent closing restore modal until it is finished.
- [firmware] Refactored NTP.

#### Removed
- [webui] Removed GPIO-16 options due to it is being used for Factory Reset
- [firmware] Drop usage of NTPClientLib.

## [0.5beta] - 2018-03-02
#### Added
- [firmware + webui] Embedded web files
- [firmware + webui] MQTT to main branch.
- [firmware + webui] Access column to logs for the information, if the access was granted or not @romanzava
- [build] Travis CI
- [firmware] Glyphicons redirection for SPIFFS's limited 32 char filename.
- [dev tools] WebSocket emulator for rapid web page development. (This require node.js)
- [build] Gulp script for auto css/js file concat and gzip
- [dev tools] Offline static web page development capability (enter "neo" as admin password for local testing)
- [dev tools] gulp script for PROGMEM web files.

#### Changed
- [webui] New look and feel - refactored Web UI
- [webui] Hardcoded FooTable Add/Edit text
- [webui] Only support woff glyphicons font
- [dev tools] Clean and beautify main.cpp @nardev
- [webui] Minor cosmetic changes
- [webui] Javascript loading moved to end of the html
- [build] more meaningful directories for web files.
- [webui] RSSI percent calculation
- [firmware] Limit printScanResult to 5 best (based on RSSI) networks around (esp becomes unresponsive if there are too many networks)
- [build] pio script where we were trying to modify flashing parameters it was affecting SPIFFS upload too.

#### Fixed
- [firmware + webui] MQTT - UID publish was missing.

#### Removed
- [firmware] Web files no longer contained in SPIFFS
- [firmware] SPIFFS Editor.
- [firmware] Confusion about MFRC533 reader.

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
