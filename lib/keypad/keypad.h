#ifndef __KEYPAD_H__
#define __KEYPAD_H__


#include <Arduino.h>
#include "serial_log.h"


uint8_t keypad_mode = 0;


void keypad_init(uint8_t mode, const char *keymap, const char *keypass, uint8_t sdapin, uint8_t sclpin)
{
    keypad_mode = mode;
}

void keypad_update(void)
{

}

bool keypad_valid_password(void)
{
    return false;
}

#endif
