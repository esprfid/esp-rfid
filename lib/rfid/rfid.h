#ifndef __RFID_H__
#define __RFID_H__

#include <Arduino.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <Wiegand.h>
#include <rdm6300.h>

#include "common.h"
#include "serial_log.h"
#include "flash_log.h"
#include "web_app.h"


WIEGAND wg;
Rdm6300 rdm6300;

uint8_t rfid_reader = 0;
String rfid_last_uid = "";


void rfid_init(uint8_t reader, uint8_t gain, uint8_t sspin, uint8_t d0pin, uint8_t d1pin, uint8_t rxpin)
{
	rfid_reader = reader;

	switch (rfid_reader) {
	case 1:
		wg.begin(d0pin, d1pin);
		break;
	case 2:

		break;
	case 3:

		break;
	case 4:
		rdm6300.begin(rxpin);
		break;
	}
}

void rfid_update(void)
{
	switch (rfid_reader) {
	case 1:
		if (!wg.available())
			return;
		rfid_last_uid = String(wg.getCode(), HEX);
		break;
	case 2:

		break;
	case 3:

		break;
	case 4:
		if (!rdm6300.update())
			return;
		rfid_last_uid = String(rdm6300.get_tag_id(), HEX);
		break;
	}
}

void rfid_handle_tag(const char *uid, const char *username, uint8_t acctype)
{
	flash_log_latestlog_record(uid, username, acctype);
	web_send_rfid_scan(uid, username, acctype);
}

bool rfid_valid_tag(void)
{
	if (!rfid_last_uid.length()) 
		return false;

	String filename = "/P/";

	filename += rfid_last_uid;
	File uid_file = SPIFFS.open(filename, "r");
	if (!uid_file) {
		rfid_handle_tag(rfid_last_uid.c_str(), "Unknown", 0);
		rfid_last_uid = "";
		return false;
	}

	size_t size = uid_file.size();
	std::unique_ptr<char[]> buf(new char[size]);
	uid_file.readBytes(buf.get(), size);
	DynamicJsonBuffer json_buffer;
	JsonObject &user = json_buffer.parseObject(buf.get());
	uid_file.close();
	if (!user.success()) {
		log_w("Failed to parse user data for uid: %s", rfid_last_uid.c_str());
		rfid_last_uid = "";
		return false;
	}

	const char *uid = user["uid"];
	const char *username = user["username"];
	uint8_t acctype = user["acctype"];
	bool valid = fix_user_acctype(user);

	if (acctype == 2 && !valid) {
		// TODO: update user.json acctype...
		acctype = 3;
	}

	rfid_handle_tag(uid, username, acctype);

	if (acctype == 1) {
		// TODO: turn on wifi if off...
	}

	rfid_last_uid = "";
	return valid;
}

#endif
