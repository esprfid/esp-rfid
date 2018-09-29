#ifndef __BUZZER_H__
#define __BUZZER_H__

#include <Arduino.h>
#include "serial_log.h"


uint8_t buzzer_mode = 0;
uint8_t buzzer_pin = NOT_A_PIN;


void buzzer_init(uint8_t mode, uint8_t pin)
{
    buzzer_mode = mode;
    buzzer_pin = pin;
}

void buzzer_update(void)
{

}

void buzzer_beep(uint16_t duration_ms)
{

}

#endif
