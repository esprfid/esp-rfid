#ifndef __BUZZER_H__
#define __BUZZER_H__

#include <Arduino.h>
#include "serial_log.h"

#define BUZZER_BEEP_SHORT 60
#define BUZZER_BEEP_MEDIUM 200
#define BUZZER_BEEP_LONG 500

uint8_t buzzer_mode = 0;
uint8_t buzzer_pin = NOT_A_PIN;
uint32_t buzzer_next_ms = 0;


void buzzer_set(bool is_on)
{
    if (!buzzer_mode)
        return;
	digitalWrite(buzzer_pin, is_on);
}

void buzzer_init(uint8_t mode, uint8_t pin)
{
    buzzer_mode = mode;
    buzzer_pin = pin;
    if (!buzzer_mode)
        return;
    pinMode(buzzer_pin, OUTPUT);
    buzzer_set(false);
}

void buzzer_beep(uint32_t on_ms)
{
	buzzer_set(true);
	buzzer_next_ms = millis() + on_ms;
}

void buzzer_update(void)
{
	uint32_t cur_ms = millis();

	if (buzzer_next_ms && cur_ms > buzzer_next_ms) {
		buzzer_next_ms = 0;
		buzzer_set(false);
	}
}

#endif
