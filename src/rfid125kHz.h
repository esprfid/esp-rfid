/*
RFID reader.
Based on the "rfid_reader" library (https://github.com/travisfarmer) from Travis Farmer.

Author: Lubos Ruckl

Hardware: RDM6300 or RF125-PS
Uses 125KHz RFID tags.
*/

#ifndef rfid125kHz_h
#define rfid125kHz_h

#include "Arduino.h"

class RFID_Read
{
public:
    void rfidSerial(char x);
    bool Available();
    String GetHexID();
    String GetDecID();
private:
    char *ulltostr(unsigned long long value, char *ptr, int base);
    void parse();
    uint8_t char2int(char c);
    uint8_t get_checksum(unsigned long long data);
    static const char asciiNum_diff = 48;
    static const char asciiUpp_diff = 7;
    bool data_available = false;
    unsigned long long new_ID = 0ULL;
    unsigned long long last_ID = 0ULL;
    unsigned long LastRFID = 0UL;
    char msg[15];
    uint8_t msgLen;
    byte ix = 0;
    byte StartByte = 0x02;
    byte EndByte = 0x03;
};
#endif
