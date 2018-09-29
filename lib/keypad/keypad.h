#ifndef __KEYPAD_H__
#define __KEYPAD_H__


#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_MPR121.h>
#include "serial_log.h"


#define KEYPAD_KEYPRESS_MS 1000
#define MPR121_KEYS 12

enum {
	KEYPAD_IDLE,
	KEYPAD_PRESS,
	KEYPAD_INVALID,
	KEYPAD_VALID,
};

Adafruit_MPR121 keypad_mpr121 = Adafruit_MPR121();

char keypad_keymap[MPR121_KEYS] = {0};
char *keypad_keypass = NULL;

uint8_t keypad_mode = 0;
uint8_t keypad_keypass_index = 0;
uint8_t keypad_status = KEYPAD_IDLE;
uint16_t keypad_last_keys_bitmask = 0;
uint32_t keypad_next_keypress = 0;


void keypad_keypress(char key)
{
	log_d("Keypad keypress %c", key);
	keypad_status = KEYPAD_PRESS;

	keypad_next_keypress = millis() + KEYPAD_KEYPRESS_MS;

	if (keypad_keypass[keypad_keypass_index] == key) {
		keypad_keypass_index++;
		if (strlen(keypad_keypass) == keypad_keypass_index) {
			keypad_next_keypress = 0;
			keypad_keypass_index = 0;
			keypad_status = KEYPAD_VALID;
            log_i("Keypad valid password recived");
		}
	}
}

void keypad_update(void)
{
    if (!keypad_mode)
        return;
	uint32_t cur_ms = millis();
	uint16_t cur_keys_bitmask = keypad_mpr121.touched();

	keypad_status = 0;

	if (cur_keys_bitmask) {
		if (!keypad_last_keys_bitmask)
			for (uint8_t i = 0; i < MPR121_KEYS; i++, cur_keys_bitmask >>= 1)
				if (cur_keys_bitmask & 1) {
					keypad_keypress(keypad_keymap[i]);
					keypad_last_keys_bitmask = cur_keys_bitmask;
					break;
				}
	}
	else
		keypad_last_keys_bitmask = 0;

	if (keypad_next_keypress && cur_ms > keypad_next_keypress) {
		keypad_next_keypress = 0;
		keypad_keypass_index = 0;
		keypad_status = KEYPAD_INVALID;
        log_i("Keypad invalid password recived");
	}
}

void keypad_init(uint8_t mode, const char *keymap, const char *keypass, uint8_t sdapin, uint8_t sclpin)
{
    keypad_mode = mode;
    if (!keypad_mode)
        return;

	Wire.begin(sdapin, sclpin);
	if (!keypad_mpr121.begin()) {
		log_w("MPR121 keypad sensor not found!");
		keypad_mode = 0;
        return;
	}
    if (!keymap || !keypass) {
        log_w("Empty keymap or keypass!");
		keypad_mode = 0;
        return;
	}

    keypad_keypass = strdup(keypass);
    memcpy(keypad_keymap, keymap, min(strlen(keymap), (size_t)sizeof(keypad_keymap)));
}

#endif
