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
#define VERSION "1.3.5"

#include "Arduino.h"
#include <ESP8266WiFi.h>
#include <SPI.h>
#include <ESP8266mDNS.h>
#include <ArduinoJson.h>
#include <FS.h>
#include <ESPAsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <TimeLib.h>
#include <Ticker.h>
#include "Ntp.h"
#include <AsyncMqttClient.h>
#include <Bounce2.h>
#include "magicnumbers.h"
#include "config.h"

Config config;

#ifdef OFFICIALBOARD

#include <Wiegand.h>

WIEGAND wg;
bool activateRelay[MAX_NUM_RELAYS] = {false};
bool deactivateRelay[MAX_NUM_RELAYS] = {false};

#endif

#ifndef OFFICIALBOARD

#include <MFRC522.h>
#include "PN532.h"
#include <Wiegand.h>
#include "rfid125kHz.h"

MFRC522 mfrc522 = MFRC522();
PN532 pn532;
WIEGAND wg;
RFID_Reader RFIDr;

// relay specific variables
bool activateRelay[MAX_NUM_RELAYS] = {false, false, false, false};
bool deactivateRelay[MAX_NUM_RELAYS] = {false, false, false, false};

#endif

// these are from vendors
#include "webh/glyphicons-halflings-regular.woff.gz.h"
#include "webh/required.css.gz.h"
#include "webh/required.js.gz.h"

// these are from us which can be updated and changed
#include "webh/esprfid.js.gz.h"
#include "webh/esprfid.htm.gz.h"
#include "webh/index.html.gz.h"

NtpClient NTP;
AsyncMqttClient mqttClient;
Ticker mqttReconnectTimer;
WiFiEventHandler wifiDisconnectHandler, wifiConnectHandler, wifiOnStationModeGotIPHandler;
Bounce openLockButton;

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

#define LEDoff HIGH
#define LEDon LOW

// Variables for whole scope
unsigned long accessdeniedOffTime = 0;
bool configMode = false;
unsigned long cooldown = 0;
unsigned long currentMillis = 0;
unsigned long deltaTime = 0;
bool doDisableWifi = false;
bool doEnableWifi = false;
bool formatreq = false;
const char *httpUsername = "admin";
bool inAPMode = false;
bool isWifiConnected = false;
unsigned long keyTimer = 0;
uint8_t lastDoorbellState = 0;
uint8_t lastDoorState = 0;
uint8_t lastTamperState = 0;
unsigned long nextbeat = 0;
unsigned long openDoorMillis = 0;
unsigned long previousLoopMillis = 0;
unsigned long previousMillis = 0;
bool shouldReboot = false;
bool timerequest = false;
unsigned long uptime = 0;
bool wifiFlag = false;
unsigned long wifiPinBlink = millis();
unsigned long wiFiUptimeMillis = 0;

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
#ifdef OFFICIALBOARD
	// Set relay pin to LOW signal as early as possible
	pinMode(13, OUTPUT);
	digitalWrite(13, LOW);
	delay(200);
#endif

#ifdef DEBUG
	Serial.begin(9600);
	Serial.println();

	Serial.print(F("[ INFO ] ESP RFID v"));
	Serial.println(VERSION);

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

	if (!SPIFFS.begin())
	{
		if (SPIFFS.format())
		{
			writeEvent("WARN", "sys", "Filesystem formatted", "");
		}
		else
		{
#ifdef DEBUG
			Serial.println(F(" failed!"));
			Serial.println(F("[ WARN ] Could not format filesystem!"));
#endif
		}
	}
	wifiDisconnectHandler = WiFi.onStationModeDisconnected(onWifiDisconnect);
	wifiConnectHandler = WiFi.onStationModeConnected(onWifiConnect);
	wifiOnStationModeGotIPHandler = WiFi.onStationModeGotIP(onWifiGotIP);

	configMode = loadConfiguration(config);
	if (!configMode)
	{
		fallbacktoAPMode();
		configMode = false;
	}
	else
	{
		configMode = true;
	}
	setupWebServer();
	writeEvent("INFO", "sys", "System setup completed, running", "");
	if (config.mqttEnabled == 1)
	{
		delay(1000);
		if (digitalRead(config.doorstatpin) == HIGH)
			mqtt_publish_io("door", "OFF");
		else
			mqtt_publish_io("door", "ON");
		delay(500);
		if (digitalRead(config.doorbellpin) == HIGH)
			mqtt_publish_io("doorbell", "ON");
		else
			mqtt_publish_io("doorbell", "OFF");
		delay(500);
		mqtt_publish_io("lock", "LOCKED");
		delay(500);
		if (config.mqttHA)
		{
			mqtt_publish_discovery();
			mqtt_publish_avty();
		}
	}
}

void ICACHE_RAM_ATTR loop()
{
	currentMillis = millis();
	deltaTime = currentMillis - previousLoopMillis;
	uptime = NTP.getUptimeSec();
	previousLoopMillis = currentMillis;

	openLockButton.update();
	if (openLockButton.fell())
	{
		writeLatest(" ", "Button", 1);
		if (config.mqttEnabled)
		{
			mqtt_publish_access(now(), "true", "Always", "Button", " ");
		}
		activateRelay[0] = true;
	}

	if (config.wifipin != 255 && configMode && !config.wmode)
	{
		if (!wifiFlag)
		{
			if ((currentMillis - wifiPinBlink) > 500)
			{
				wifiPinBlink = currentMillis;
				digitalWrite(config.wifipin, !digitalRead(config.wifipin));
			}
		}
		else
		{
			if (!(digitalRead(config.wifipin) == LEDon))
				digitalWrite(config.wifipin, LEDon);
		}
	}

	if (config.accessdeniedpin != 255 && digitalRead(config.accessdeniedpin) == HIGH && currentMillis > accessdeniedOffTime)
	{
		digitalWrite(config.accessdeniedpin, LOW);
	}

	if (config.doorstatpin != 255)
	{
		doorStatus();
		delayMicroseconds(500);
	}

	if (config.doorbellpin != 255)
	{
		doorbellStatus();
		delayMicroseconds(500);
	}

	if (currentMillis >= cooldown)
	{
		rfidloop();
	}

	for (int currentRelay = 0; currentRelay < config.numRelays; currentRelay++)
	{
		if (config.lockType[currentRelay] == LOCKTYPE_CONTINUOUS) // Continuous relay mode
		{
			if (activateRelay[currentRelay])
			{
				if (digitalRead(config.relayPin[currentRelay]) == !config.relayType[currentRelay]) // currently OFF, need to switch ON
				{
					if ((config.mqttHA) && (config.mqttEnabled == 1))
					{
						mqtt_publish_io("lock", "UNLOCKED");
					}
#ifdef DEBUG
					Serial.print("mili : ");
					Serial.println(millis());
					Serial.printf("activating relay %d now\n", currentRelay);
#endif
					digitalWrite(config.relayPin[currentRelay], config.relayType[currentRelay]);
				}
				else // currently ON, need to switch OFF
				{
					if ((config.mqttHA) && (config.mqttEnabled == 1))
					{
						mqtt_publish_io("lock", "LOCKED");
					}
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
				if ((config.mqttHA) && (config.mqttEnabled == 1))
				{
					mqtt_publish_io("lock", "UNLOCKED");
				}
#ifdef DEBUG
				Serial.print("mili : ");
				Serial.println(millis());
				Serial.printf("activating relay %d now\n", currentRelay);
#endif
				digitalWrite(config.relayPin[currentRelay], config.relayType[currentRelay]);
				previousMillis = millis();
				activateRelay[currentRelay] = false;
				deactivateRelay[currentRelay] = true;
			}
			else if ((currentMillis - previousMillis >= config.activateTime[currentRelay]) && (deactivateRelay[currentRelay]))
			{
				if ((config.mqttHA) && (config.mqttEnabled == 1))
				{
					mqtt_publish_io("lock", "LOCKED");
				}
#ifdef DEBUG
				Serial.println(currentMillis);
				Serial.println(previousMillis);
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

	if (timerequest)
	{
		timerequest = false;
		sendTime();
	}

	if (config.autoRestartIntervalSeconds > 0 && uptime > config.autoRestartIntervalSeconds * 1000)
	{
		writeEvent("WARN", "sys", "Auto restarting...", "");
		shouldReboot = true;
	}

	if (shouldReboot)
	{
		writeEvent("INFO", "sys", "System is going to reboot", "");
		ESP.restart();
	}

	if (isWifiConnected)
	{
		wiFiUptimeMillis += deltaTime;
	}

	if (config.wifiTimeout > 0 && wiFiUptimeMillis > (config.wifiTimeout * 1000) && isWifiConnected == true)
	{
		writeEvent("INFO", "wifi", "WiFi is going to be disabled", "");
		doDisableWifi = true;
	}

	if (doDisableWifi == true)
	{
		doDisableWifi = false;
		wiFiUptimeMillis = 0;
		disableWifi();
	}
	else if (doEnableWifi == true)
	{
		writeEvent("INFO", "wifi", "Enabling WiFi", "");
		doEnableWifi = false;
		if (!isWifiConnected)
		{
			wiFiUptimeMillis = 0;
			enableWifi();
		}
	}

	if (config.mqttEnabled)
	{
		if (mqttClient.connected())
		{
			if ((unsigned)now() > nextbeat)
			{
				mqtt_publish_heartbeat(now(), uptime);
				nextbeat = (unsigned)now() + config.mqttInterval;
#ifdef DEBUG
				Serial.print("[ INFO ] Nextbeat=");
				Serial.println(nextbeat);
#endif
			}
		}
		processMqttQueue();
	}
}
