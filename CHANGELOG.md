# Change Log
All notable changes to this project will be documented in this file.

## [0.1rc2] - 2017-07-10 - Release Candidate
#### Added
- User List table now automaticly sorted by Name
- Click on an any element on User List to edit via Add / Update User
- User List actions are instantly happens on the ESP hardware.

#### Fixed
- Some Javascript functions

#### Misc
- Run a test where 100 seperate User can be handled (see README - Tests)

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
- Appending ChipID to hostmane

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
