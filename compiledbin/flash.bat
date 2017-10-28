echo off
cls
set /p com=Enter which COM Port your ESP is connected eg. COM1 COM2 COM7: 
esptool.exe -vv -cd nodemcu -cb 921600 -cp %com% -ca 0x00000 -cf latest.bin
esptool.exe -vv -cd nodemcu -cb 921600 -cp %com% -ca 0x100000 -cf latestspiffs.bin