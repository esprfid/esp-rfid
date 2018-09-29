#ifndef __FLASH_LOG_H__
#define __FLASH_LOG_H__

#include <Arduino.h>
#include <ArduinoJson.h>
#include <TimeLib.h>
#include <FS.h>
#include "common.h"
#include "serial_log.h"


#define flash_log_v(format, ...) flash_log_eventlog_record(SERIAL_LOG_LEVEL_VERBOSE, format, ##__VA_ARGS__)
#define flash_log_d(format, ...) flash_log_eventlog_record(SERIAL_LOG_LEVEL_DEBUG, format, ##__VA_ARGS__)
#define flash_log_i(format, ...) flash_log_eventlog_record(SERIAL_LOG_LEVEL_INFO, format, ##__VA_ARGS__)
#define flash_log_w(format, ...) flash_log_eventlog_record(SERIAL_LOG_LEVEL_WARN, format, ##__VA_ARGS__)
#define flash_log_e(format, ...) flash_log_eventlog_record(SERIAL_LOG_LEVEL_ERROR, format, ##__VA_ARGS__)
#define flash_log_n(format, ...) flash_log_eventlog_record(SERIAL_LOG_LEVEL_ERROR, format, ##__VA_ARGS__)


void flash_log_append_record(const char *path, JsonObject &record)
{
	File f = SPIFFS.open(path, "a");
	record.printTo(f);
	f.println();
	f.close();
}

void flash_log_eventlog_record(uint8_t level, const char *format, ...)
{
	DynamicJsonBuffer json_buffer;
	JsonObject &root = json_buffer.createObject();
    char record[256];

    va_list args;
    va_start(args, format);
    vsnprintf(record, sizeof(record), format, args);
	va_end(args);

	log_i("flash_log: [ %s ] %s", log_level_to_str(level), record);

	root["level"] = level;
	root["record"] = record;
	root["time"] = now();
    flash_log_append_record(EVENTLOG_FILE_PATH, root);
}

void flash_log_latestlog_record(const char *uid, const char *username, uint8_t acctype)
{
	if (acctype)
		log_i("Scanned known rfid! uid: %s, username: %s, acctype: %d", uid, username, acctype);
	else
		log_w("Scanned unknown rfid tag: %s", uid);

	DynamicJsonBuffer json_buffer;
	JsonObject &root = json_buffer.createObject();
	root["uid"] = uid;
	root["username"] = username;
	root["acctype"] = acctype;
	root["time"] = now();
    flash_log_append_record(LATESTLOG_FILE_PATH, root);
}

void flash_format_fs(void)
{
	flash_log_w("Factory reset- formating flash filesystem");
	delay(100);
	SPIFFS.end();
	delay(100);
	SPIFFS.format();
	delay(100);
	ESP.restart();
}

#endif
