/*
RFID reader.
Based on the "rfid_reader" library (https://github.com/travisfarmer) from Travis Farmer.

Author: Lubos Ruckl

Hardware: RDM6300 or RF125-PS
Uses 125KHz RFID tags.
*/

#include "Arduino.h"
#include "rfid125kHz.h"

char *RFID_Read::ulltostr(unsigned long long value, char *ptr, int base)
{
  unsigned long long t = 0, res = 0;
  unsigned long long tmp = value;
  int count = 0;
  if (NULL == ptr)
  {
    return NULL;
  }
  if (tmp == 0)
  {
    count++;
  }
  while (tmp > 0)
  {
    tmp = tmp / base;
    count++;
  }
  ptr += count;
  *ptr = '\0';
  do
  {
    res = value - base * (t = value / base);
    if (res < 10)
    {
      * -- ptr = '0' + res;
    }
    else if ((res >= 10) && (res < 16))
    {
      * --ptr = 'A' - 10 + res;
    }
  } while ((value = t) != 0);
  return (ptr);
}

/*
this is to simply return true when there is RFID data available.
it is a function to prevent external manipulation of the boolean variable.
*/
bool RFID_Read::Available()
{
    return (data_available);
}

/*
Returns the ID hexadecimal representation, and resets the Available flag.
*/
String RFID_Read::GetHexID()
{
    if (data_available)
    {
        uint8_t b[5];
        memcpy(b, &new_ID, 5);
        char buf[11];
        sprintf(buf,"%02x%02x%02x%02x%02x\0",b[4],b[3],b[2],b[1],b[0]);
        data_available = false;
        return String(buf);
    }
    return "None";
}

/*
Returns the ID decimal representation, and resets the Available flag.
*/
String RFID_Read::GetDecID()
{
    if (data_available)
    {
        char ptr[128];
        ulltostr(new_ID, ptr, 10);
        data_available = false;
        return String(ptr);
    }
    return "None";
}


void RFID_Read::rfidSerial(char x)
{
    if (x == StartByte)
    {
        ix = 0;
    } else if (x == EndByte)
    {
        msg[ix] = '\0';
        msgLen = ix;
        parse();
        ix = 0;
    } else
    {
        msg[ix] = x;
        ix++;
    }
}


uint8_t RFID_Read::get_checksum(unsigned long long data)
  {
    uint8_t b[5];
    memcpy(b, &data, 5);
    return b[0] ^ b[1] ^ b[2] ^ b[3] ^ b[4];
  }


uint8_t RFID_Read::char2int(char c)
  {
    c -= asciiNum_diff;
    if(c > 9) c -= asciiUpp_diff;
    return c;
  }


/*
the module spits out HEX values, we need to convert them to an unsigned long.
*/
void RFID_Read::parse()
{
    uint8_t lshift = 0;
    unsigned long long val = 0;
    unsigned long long tagIdValue = 0;
    uint8_t i;
    for (i = 0; i < 10; i++) {
        val = char2int(msg[i]);
        lshift = 4 * (9 - i);
        tagIdValue |= val << lshift;
    }
    uint8_t checksum = get_checksum(tagIdValue); 
    uint8_t recChecksum = 0;
    new_ID = 0ULL;
    if (msgLen == 12) {recChecksum = char2int(msg[i+1]) | char2int(msg[i]) << 4;}//RDM6300
    else if (msgLen == 11) {recChecksum = (uint8_t)msg[i];}                      //RF125-PS
    if (checksum != recChecksum) return;
    unsigned long _now = millis();
    if ((_now-LastRFID > 3000)||(tagIdValue != last_ID))
    {
        new_ID = tagIdValue;
        last_ID = tagIdValue;
        data_available = true;
        LastRFID = _now;
    }
}


