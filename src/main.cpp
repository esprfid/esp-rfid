/*
MIT License

Copyright (c) 2018 esp-rfid Community
Copyright (c) 2017 Ömer Şiar Baysal

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */
#define VERSION "2.0.0"

#include "Arduino.h"
#if defined(ESP32)
#include <WiFi.h>
#include <ESPmDNS.h>
#include <FS.h>
#include <SPIFFS.h>
#include <AsyncTCP.h>
#if ARDUINO_USB_CDC_ON_BOOT && ARDUINO_USB_MODE
#include "HWCDC.h"
#endif
#else
#include <ESP8266WiFi.h>
#include <ESP8266mDNS.h>
#include <FS.h>
#include <ESPAsyncTCP.h>
#endif
#include <SPI.h>
#include <ArduinoJson.h>
#include <ESPAsyncWebServer.h>
#include <TimeLib.h>
#include <Ticker.h>
#include <time.h>
#include <AsyncMqttClient.h>
#include <Bounce2.h>
#include "magicnumbers.h"
#include "platform_compat.h"
#include "security_keys.h"
#include "config.h"
#include "roles.h"
#include "access_reader_app.h"

Config config;

#include <MFRC522.h>
#include "PN532.h"
#include <Wiegand.h>
#include "rfid125kHz.h"
#if defined(ESP32)
HardwareSerial *rdm6300SwSerial = NULL;
#else
#include <SoftwareSerial.h>
SoftwareSerial *rdm6300SwSerial = NULL;
#endif

MFRC522 mfrc522 = MFRC522();
PN532 pn532;
WIEGAND wg;
RFID_Reader RFIDr;

// relay specific variables
bool activateRelay[MAX_NUM_RELAYS] = {false, false, false, false};
bool deactivateRelay[MAX_NUM_RELAYS] = {false, false, false, false};

// these are from vendors
#include "webh/glyphicons-halflings-regular.woff.gz.h"
#include "webh/required.css.gz.h"
#include "webh/required.js.gz.h"

// these are from us which can be updated and changed
#include "webh/esprfid.js.gz.h"
#include "webh/esprfid.htm.gz.h"
#include "webh/index.html.gz.h"

AsyncMqttClient mqttClient;
Ticker mqttReconnectTimer;
Ticker wifiReconnectTimer;
Ticker wsMessageTicker;
#if defined(ESP8266)
WiFiEventHandler wifiDisconnectHandler, wifiConnectHandler, wifiOnStationModeGotIPHandler;
#endif
Bounce openLockButton;

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

#define LEDoff HIGH
#define LEDon LOW

#define BEEPERoff HIGH
#define BEEPERon LOW

// Variables for whole scope
unsigned long cooldown = 0;
unsigned long currentMillis = 0;
unsigned long deltaTime = 0;
bool doEnableWifi = false;
bool formatreq = false;
const char *httpUsername = "admin";
unsigned long keyTimer = 0;
uint8_t lastDoorbellState = 0;
uint8_t lastDoorState = 0;
uint8_t lastTamperState = 0;
unsigned long nextbeat = 0;
time_t epoch;
time_t lastNTPepoch;
unsigned long lastNTPSync = 0;
unsigned long openDoorMillis = 0;
unsigned long previousLoopMillis = 0;
unsigned long previousRelayMillis[MAX_NUM_RELAYS] = {0, 0, 0, 0};
unsigned long beeperPreviousMillis = 0;
bool shouldReboot = false;
tm timeinfo;
unsigned long uptimeSeconds = 0;
unsigned long wifiPinBlink = millis();
unsigned long wiFiUptimeMillis = 0;

static inline bool secureReaderModeEnabled()
{
	return config.readertype == READER_SECURE_ACCESS;
}

#include "led.esp"
#include "beeper.esp"
#include "log.esp"
#include "mqtt.esp"
#include "helpers.esp"
#include "wsResponses.esp"
#include "rfid.esp"
#include "wifi.esp"
#include "config.esp"
#include "websocket.esp"
#include "webserver.esp"
#include "door.esp"
#include "doorbell.esp"

void ICACHE_FLASH_ATTR setup()
{
#ifdef DEBUG
	Serial.begin(115200);
#if ARDUINO_USB_CDC_ON_BOOT
	delay(3000); // wait for USB CDC to re-enumerate after reset
#endif
	Serial.println();

	Serial.print(F("[ INFO ] ESP RFID v"));
	Serial.println(VERSION);

#if defined(ESP32)
	Serial.printf("Chip model:      %s rev %u\n", ESP.getChipModel(), ESP.getChipRevision());
	Serial.printf("Chip cores:      %u\n", ESP.getChipCores());
	Serial.printf("Flash size:      %u\n", ESP.getFlashChipSize());
	Serial.printf("Flash speed:     %u\n", ESP.getFlashChipSpeed());
#else
	uint32_t realSize = ESP.getFlashChipRealSize();
	uint32_t ideSize = ESP.getFlashChipSize();
	FlashMode_t ideMode = ESP.getFlashChipMode();
	Serial.printf("Flash real id:   %08X\n", ESP.getFlashChipId());
	Serial.printf("Flash real size: %u\n\n", realSize);
	Serial.printf("Flash ide  size: %u\n", ideSize);
	Serial.printf("Flash ide speed: %u\n", ESP.getFlashChipSpeed());
	Serial.printf("Flash ide mode:  %s\n", (ideMode == FM_QIO ? "QIO" : ideMode == FM_QOUT ? "QOUT"
																	: ideMode == FM_DIO	   ? "DIO"
																	: ideMode == FM_DOUT   ? "DOUT"
																						   : "UNKNOWN"));
	if (ideSize != realSize)
	{
		Serial.println("Flash Chip configuration wrong!\n");
	}
	else
	{
		Serial.println("Flash Chip configuration ok.\n");
	}
#endif
#endif

	if (!SPIFFS.begin())
	{
		if (SPIFFS.format())
		{
			if (SPIFFS.begin())
			{
				writeEvent("WARN", "sys", "Filesystem formatted", "");
			}
		}
		else
		{
#ifdef DEBUG
			Serial.println(F(" failed!"));
			Serial.println(F("[ WARN ] Could not format filesystem!"));
#endif
		}
	}

	bool configured = false;
	configured = loadConfiguration(config);
	setupMqtt();
	setupWifi(configured);
	setupWebServer();
	if (configured && secureReaderModeEnabled())
	{
		access_reader_app_begin();
	}
	writeEvent("INFO", "sys", "System setup completed, running", "");
}

void ICACHE_RAM_ATTR loop()
{
	currentMillis = millis();
	deltaTime = currentMillis - previousLoopMillis;
	uptimeSeconds = currentMillis / 1000;
	previousLoopMillis = currentMillis;
	
	trySyncNTPtime(10);

	openLockButton.update();
	if (!secureReaderModeEnabled() && config.openlockpin != 255 && openLockButton.fell())
	{
		writeLatest(" ", "Button", 1);
		mqttPublishAccess(epoch, "true", "Always", "Button", " ", " ");
		for (int currentRelay = 0; currentRelay < config.numRelays; currentRelay++)
		{
			activateRelay[currentRelay] = true;
		}
		beeperValidAccess();
	}

	ledWifiStatus();
	ledAccessDeniedOff();
	beeperBeep();
	if (!secureReaderModeEnabled())
	{
		doorStatus();
		doorbellStatus();
	}

	if (secureReaderModeEnabled())
	{
		access_reader_app_loop();
	}
	else if (currentMillis >= cooldown)
	{
		rfidLoop();
	}

	bool anyRelayActivated = false;
	for (int i = 0; !secureReaderModeEnabled() && i < config.numRelays; i++) {
		if (activateRelay[i]) anyRelayActivated = true;
	}

	// don't try connecting to WiFi when waiting for pincode
	if (!secureReaderModeEnabled() && doEnableWifi == true && keyTimer == 0 && anyRelayActivated)
	{
		if (!WiFi.isConnected())
		{
			enableWifi();
			writeEvent("INFO", "wifi", "Enabling WiFi", "");
			doEnableWifi = false;
		}
	}

	for (int currentRelay = 0; !secureReaderModeEnabled() && currentRelay < config.numRelays; currentRelay++)
	{
		if (config.lockType[currentRelay] == LOCKTYPE_CONTINUOUS) // Continuous relay mode
		{
			if (activateRelay[currentRelay])
			{
				if (digitalRead(config.relayPin[currentRelay]) == !config.relayType[currentRelay]) // currently OFF, need to switch ON
				{
					mqttPublishIo("lock" + String(currentRelay), "UNLOCKED");
#ifdef DEBUG
					Serial.print("mili : ");
					Serial.println(millis());
					Serial.printf("activating relay %d now\n", currentRelay);
#endif
					digitalWrite(config.relayPin[currentRelay], config.relayType[currentRelay]);
				}
				else // currently ON, need to switch OFF
				{
					mqttPublishIo("lock" + String(currentRelay), "LOCKED");
#ifdef DEBUG
					Serial.print("mili : ");
					Serial.println(millis());
					Serial.printf("deactivating relay %d now\n", currentRelay);
#endif
					digitalWrite(config.relayPin[currentRelay], !config.relayType[currentRelay]);
				}
				activateRelay[currentRelay] = false;
			}
		}
		else if (config.lockType[currentRelay] == LOCKTYPE_MOMENTARY) // Momentary relay mode
		{
			if (activateRelay[currentRelay])
			{
				mqttPublishIo("lock" + String(currentRelay), "UNLOCKED");
#ifdef DEBUG
				Serial.print("mili : ");
				Serial.println(millis());
				Serial.printf("activating relay %d now\n", currentRelay);
#endif
				digitalWrite(config.relayPin[currentRelay], config.relayType[currentRelay]);
				previousRelayMillis[currentRelay] = millis();
				activateRelay[currentRelay] = false;
				deactivateRelay[currentRelay] = true;
			}
			else if ((currentMillis - previousRelayMillis[currentRelay] >= config.activateTime[currentRelay]) && (deactivateRelay[currentRelay]))
			{
				mqttPublishIo("lock" + String(currentRelay), "LOCKED");
#ifdef DEBUG
				Serial.println(currentMillis);
				Serial.println(previousRelayMillis[currentRelay]);
				Serial.println(config.activateTime[currentRelay]);
				Serial.println(activateRelay[currentRelay]);
				Serial.println("deactivate relay after this");
				Serial.print("mili : ");
				Serial.println(millis());
#endif
				digitalWrite(config.relayPin[currentRelay], !config.relayType[currentRelay]);
				deactivateRelay[currentRelay] = false;
			}
		}
	}
	if (formatreq)
	{
#ifdef DEBUG
		Serial.println(F("[ WARN ] Factory reset initiated..."));
#endif
		SPIFFS.end();
		ws.enable(false);
		SPIFFS.format();
		ESP.restart();
	}

	if (config.autoRestartIntervalSeconds > 0 && uptimeSeconds > config.autoRestartIntervalSeconds)
	{
		writeEvent("WARN", "sys", "Auto restarting...", "");
		shouldReboot = true;
	}

	if (shouldReboot)
	{
		writeEvent("INFO", "sys", "System is going to reboot", "");
		SPIFFS.end();
		ESP.restart();
	}

	if (WiFi.isConnected())
	{
		wiFiUptimeMillis += deltaTime;
	}

	if (config.wifiTimeout > 0 && wiFiUptimeMillis > (config.wifiTimeout * 1000) && WiFi.isConnected())
	{
		writeEvent("INFO", "wifi", "WiFi is going to be disabled", "");
		disableWifi();
	}

	if (config.mqttEnabled && mqttClient.connected())
	{
		if ((unsigned)epoch > nextbeat)
		{
			mqttPublishHeartbeat(epoch, uptimeSeconds);
			nextbeat = (unsigned)epoch + config.mqttInterval;
#ifdef DEBUG
			Serial.print("[ INFO ] Nextbeat=");
			Serial.println(nextbeat);
#endif
		}
		processMqttQueue();
	}

	processWsQueue();

	// clean unused websockets
	ws.cleanupClients();
}
