echo off
cls
set /p com=Enter which COM Port your ESP is connected eg. COM1 COM2 COM7: 
esptool.exe -vv -cd nodemcu -cb 921600 -cp %com% -ca 0x000000 -cf blank4mb.bin