# How to contributo to esp-rfid

If you want to contribute, first of all, thank you very much!

## If you want to contribute some code

### Bug fix

In case of a bug fix you can open a PR on the `stable` branch.


### New feature

For new features please open a PR on the `dev` branch which will be merged on `stable` when a new release will be launched.

Remember to add documentation in the main readme and in the changelog. If MQTT is affected, please also update the README-MQTT.md file.

When touching the configuration file, you should make sure that the old file will be supported by the new version and that your feature should work also with the old config file format.

### Frontend

You cannot simply edit Web UI files because you will need to convert them to C arrays, which can be done automatically by a gulp script that can be found in tools directory or you can use compiled executables at the same directory as well (for Windows PCs only).

If you want to edit esp-rfid's Web UI you will need (unless using compiled executables):
* NodeJS
* npm (comes with NodeJS installer)
* Gulp (can be installed with npm)

Gulp script also minifies HTML and JS files and compresses (gzip) them.

To minify and compress the frontend, enter the folder ```tools/webfilesbuilder``` and:
* Run ```npm install``` to install dependencies
* Run ```npm start``` to compress the web UI to make it ready for the ESP

In order to test your changes without flashing the firmware you can launch websocket emulator which is included in tools directory.
* You will need to Node JS for websocket emulator.
* Run ```npm install``` to install dependencies
* Run emulator  ```node wserver.js```

There are two alternative ways to test the UI
1. you can launch your browser with CORS disabled:
  ```chrome.exe --args --disable-web-security -–allow-file-access-from-files --user-data-dir="C:\Users\USERNAME"```
  and then open the HTML files directly (Get more information [here](https://stackoverflow.com/questions/3102819/disable-same-origin-policy-in-chrome))
2. alternatively, you can launch a web server from the ```src/websrc``` folder, for example with Python, like this:
  ```python3 -m http.server```
  and then visit ```http://0.0.0.0:8000/```

When testing locally, use the password ```neo``` for admin capabilities.

## TODO

Explain more ways to help that are not code-related