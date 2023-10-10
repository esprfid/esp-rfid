# Debugging

When the ESP crashes and it's connected to the serial port in debug mode, you can get its stacktrace.

But then you need to decode it to see what's going on. To do that you need to:

- install https://github.com/janLo/EspArduinoExceptionDecoder/

- save the stacktrace in a file, e.g. debug.txt

- run `python3 ~/.platformio/packages/toolchain-xtensa/decoder.py -e .pio/build/debug/firmware.elf debug.txt -s`

References:
- https://github.com/esp8266/Arduino/blob/master/doc/faq/a02-my-esp-crashes.rst
- https://arduino-esp8266.readthedocs.io/en/latest/exception_causes.html
- https://arduino-esp8266.readthedocs.io/en/latest/Troubleshooting/stack_dump.html

