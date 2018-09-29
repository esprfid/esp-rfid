#ifndef __RELAY_H__
#define __RELAY_H__

#include <Arduino.h>
#include "serial_log.h"


uint8_t relay_pin = NOT_A_PIN;
uint32_t relay_on_ms;
bool relay_on_value;
uint32_t relay_next_ms = 0;


void _relay_write(bool is_on)
{
    digitalWrite(relay_pin, !(is_on ^ relay_on_value));
    log_i("Relay status: %s", is_on ? "ON" : "OFF");
}

void relay_open_door(void)
{
    _relay_write(true);
    relay_next_ms = millis() + relay_on_ms;
}

void relay_init(bool on_value, uint8_t pin, uint32_t on_ms)
{
	relay_pin = pin;
    relay_on_ms = on_ms;
	relay_on_value = on_value;
	pinMode(relay_pin, OUTPUT);
	_relay_write(false);
}

void relay_update(void)
{
    uint32_t cur_ms = millis();

    if (relay_next_ms && cur_ms > relay_next_ms) {
        _relay_write(false);
        relay_next_ms = 0;
    }
}

#endif
