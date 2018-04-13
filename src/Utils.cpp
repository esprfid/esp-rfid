/**************************************************************************
    
    @author   Elmü   
    class Utils: Some small functions.
  
**************************************************************************/

#include "Utils.h"

// Utils::Print("Hello World", LF); --> prints "Hello World\r\n"
void Utils::Print(const char* s8_Text, const char* s8_LF) //=NULL
{
    SerialClass::Print(s8_Text);
    if (s8_LF) 
        SerialClass::Print(s8_LF);
}
void Utils::PrintDec(int s32_Data, const char* s8_LF) // =NULL
{
    char s8_Buf[20];
    sprintf(s8_Buf, "%d", s32_Data);
    Print(s8_Buf, s8_LF);
}
void Utils::PrintHex8(byte u8_Data, const char* s8_LF) // =NULL
{
    char s8_Buf[20];
    sprintf(s8_Buf, "%02X", u8_Data);
    Print(s8_Buf, s8_LF);
}
void Utils::PrintHex16(uint16_t u16_Data, const char* s8_LF) // =NULL
{
    char s8_Buf[20];
    sprintf(s8_Buf, "%04X", u16_Data);
    Print(s8_Buf, s8_LF);
}
void Utils::PrintHex32(uint32_t u32_Data, const char* s8_LF) // =NULL
{
    char s8_Buf[20];
    sprintf(s8_Buf, "%08X", (unsigned int)u32_Data);
    Print(s8_Buf, s8_LF);
}

// Prints a hexadecimal buffer as 2 digit HEX numbers
// At the byte position s32_Brace1 a "<" will be inserted
// At the byte position s32_Brace2 a ">" will be inserted
// Output will look like: "00 00 FF 03 FD <D5 4B 00> E0 00"
// This is used to mark the data bytes in the packet.
// If the parameters s32_Brace1, s32_Brace2 are -1, they do not appear
void Utils::PrintHexBuf(const byte* u8_Data, const uint32_t u32_DataLen, const char* s8_LF, int s32_Brace1, int s32_Brace2)
{
    for (uint32_t i=0; i < u32_DataLen; i++)
    {
        if ((int)i == s32_Brace1)
            Print(" <");
        else if ((int)i == s32_Brace2)
            Print("> ");
        else if (i > 0)
            Print(" ");
        
        PrintHex8(u8_Data[i]);
    }
    if (s8_LF) Print(s8_LF);
}

// Converts an interval in milliseconds into days, hours, minutes and prints it
void Utils::PrintInterval(uint64_t u64_Time, const char* s8_LF)
{
    char Buf[30];
    u64_Time /= 60*1000;
    int s32_Min  = (int)(u64_Time % 60);
    u64_Time /= 60;
    int s32_Hour = (int)(u64_Time % 24);    
    u64_Time /= 24;
    int s32_Days = (int)u64_Time;    
    sprintf(Buf, "%d days, %02d:%02d hours", s32_Days, s32_Hour, s32_Min);
    Print(Buf, s8_LF);   
}

// We need a special time counter that does not roll over after 49 days (as millis() does) 
uint64_t Utils::GetMillis64()
{
    static uint32_t u32_High = 0;
    static uint32_t u32_Last = 0;

    uint32_t u32_Now = GetMillis(); // starts at zero after CPU reset

    // Check for roll-over
    if (u32_Now < u32_Last) u32_High ++;
    u32_Last = u32_Now;

    uint64_t u64_Time = u32_High;
    u64_Time <<= 32;
    u64_Time |= u32_Now;
    return u64_Time;
}

// Multi byte XOR operation In -> Out
// If u8_Out and u8_In are the same buffer use the other function below.
void Utils::XorDataBlock(byte* u8_Out, const byte* u8_In, const byte* u8_Xor, int s32_Length)
{
    for (int B=0; B<s32_Length; B++)
    {
        u8_Out[B] = u8_In[B] ^ u8_Xor[B];
    }
}

// Multi byte XOR operation in the same buffer
void Utils::XorDataBlock(byte* u8_Data, const byte* u8_Xor, int s32_Length)
{
    for (int B=0; B<s32_Length; B++)
    {
        u8_Data[B] ^= u8_Xor[B];
    }
}

// Rotate a block of 8 byte to the left by one byte.
// ATTENTION: u8_Out and u8_In must not be the same buffer!
void Utils::RotateBlockLeft(byte* u8_Out, const byte* u8_In, int s32_Length)
{
    int s32_Last = s32_Length -1;
    memcpy(u8_Out, u8_In + 1, s32_Last);
    u8_Out[s32_Last] = u8_In[0];
}

// Logical Bit Shift Left. Shift MSB out, and place a 0 at LSB position
void Utils::BitShiftLeft(uint8_t* u8_Data, int s32_Length)
{
    for (int n=0; n<s32_Length-1; n++) 
    {
        u8_Data[n] = (u8_Data[n] << 1) | (u8_Data[n+1] >> 7);
    }
    u8_Data[s32_Length - 1] <<= 1;
}

// Generate multi byte random
void Utils::GenerateRandom(byte* u8_Random, int s32_Length)
{
    uint32_t u32_Now = GetMillis();
    for (int i=0; i<s32_Length; i++)
    {
        u8_Random[i] = (byte)u32_Now;
        u32_Now *= 127773;
        u32_Now += 16807;
    }
}

// ITU-V.41 (ISO 14443A)
// This CRC is used only for legacy authentication. (not implemented anymore)
uint16_t Utils::CalcCrc16(const byte* u8_Data, int s32_Length)
{
    uint16_t u16_Crc = 0x6363;
    for (int i=0; i<s32_Length; i++)
    {
        byte ch = u8_Data[i];
        ch = ch ^ (byte)u16_Crc;
        ch = ch ^ (ch << 4);
        u16_Crc = (u16_Crc >> 8) ^ ((uint16_t)ch << 8) ^ ((uint16_t)ch << 3) ^ ((uint16_t)ch >> 4);
    }
    return u16_Crc;
}

// This CRC is used for ISO and AES authentication.
// The new Desfire EV1 authentication calculates the CRC32 also over the command, but the command is not encrypted later.
// This function allows to include the command into the calculation without the need to add the command to the same buffer that is later encrypted.
uint32_t Utils::CalcCrc32(const byte* u8_Data1, int s32_Length1, // data to process
                          const byte* u8_Data2, int s32_Length2) // optional additional data to process (these parameters may be omitted)
{
    uint32_t u32_Crc = 0xFFFFFFFF;
    u32_Crc = CalcCrc32(u8_Data1, s32_Length1, u32_Crc);
    u32_Crc = CalcCrc32(u8_Data2, s32_Length2, u32_Crc);
    return u32_Crc;
}

// private
uint32_t Utils::CalcCrc32(const byte* u8_Data, int s32_Length, uint32_t u32_Crc)
{
    for (int i=0; i<s32_Length; i++)
    {
        u32_Crc ^= u8_Data[i];
        for (int b=0; b<8; b++)
        {
            bool b_Bit = (u32_Crc & 0x01) > 0;
            u32_Crc >>= 1;
            if (b_Bit) u32_Crc ^= 0xEDB88320;
        }
    }
    return u32_Crc;
}

// -----------------------------------------------------------------------------------------------
// These functions are only required for some boards which do not define stricmp() and strnicmp()
// They work only for english characters, but this is completely sufficient for this project.
// For Teensy they can be replaced with the original functions.
int Utils::stricmp(const char* str1, const char* str2)
{
    return strnicmp(str1, str2, 0xFFFFFFFF);
}
int Utils::strnicmp(const char* str1, const char* str2, uint32_t u32_MaxCount)
{
    byte c1 = 0;
    byte c2 = 0;
    for (uint32_t i=0; i<u32_MaxCount; i++)
    {
        c1 = str1[i];
        c2 = str2[i];
        if (c1 >= 'a' && c1 <= 'z') c1 -= 32; // make upper case
        if (c2 >= 'a' && c2 <= 'z') c2 -= 32;
        if (c1 != c2 || c1 == 0)
            break;
    }
    if (c1 < c2) return -1;
    if (c1 > c2) return  1;
    return 0;
}
// -----------------------------------------------------------------------------------------------