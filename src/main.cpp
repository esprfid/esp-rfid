/*
   Authors :    Ömer Şiar Baysal
                ESP-RFID Community

   Released to Public Domain

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   THE SOFTWARE.
 */

#include <Arduino.h>
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


#ifdef OFFICIALBOARD

#include <Wiegand.h>

WIEGAND wg;
int relayPin = 13;

#endif

#ifndef OFFICIALBOARD

#include <MFRC522.h>
#include "PN532.h"
#include <Wiegand.h>
#include <rdm6300.h>

MFRC522 mfrc522 = MFRC522();
PN532 pn532;
WIEGAND wg;
Rdm6300 rdm6300;

int rfidss;
int readerType;
int relayPin;

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
WiFiEventHandler wifiDisconnectHandler;

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// Variables for whole scope
const char *http_username = "admin";
char *http_pass = NULL;
unsigned long previousMillis = 0;
unsigned long previousLoopMillis = 0;
unsigned long currentMillis = 0;
unsigned long cooldown = 0;
unsigned long deltaTime = 0;
unsigned long uptime = 0;
bool shouldReboot = false;
bool activateRelay = false;
bool deactivateRelay = false;
bool inAPMode = false;
bool isWifiConnected = false;
unsigned long autoRestartIntervalSeconds = 0;

bool wifiDisabled = true;
bool doDisableWifi = false;
bool doEnableWifi = false;
bool timerequest = false;
bool formatreq = false;
unsigned long wifiTimeout = 0;
unsigned long wiFiUptimeMillis = 0;
char *deviceHostname = NULL;

int mqttenabled = 0;
char *mqttTopic = NULL;
char *mhs = NULL;
int mport;

int relayType;
unsigned long activateTime;
int timeZone;

unsigned long nextbeat = 0;
unsigned long interval = 1800;

#include "log.esp"
#include "mqtt.esp"
#include "helpers.esp"
#include "wsResponses.esp"
#include "rfid.esp"
#include "wifi.esp"
#include "config.esp"
#include "websocket.esp"
#include "webserver.esp"
#include "serial_log.h"

void ICACHE_FLASH_ATTR setup() {
#ifdef OFFICIALBOARD
	// Set relay pin to LOW signal as early as possible
	pinMode(13, OUTPUT);
	digitalWrite(13, LOW);
	delay(200);
#endif
	SERIAL_LOG_INIT();
	log_i("ESP RFID v1.0");

	uint16_t flash_hw_size = ESP.getFlashChipRealSize() / 8 / 1024;
	uint16_t flash_sw_size = ESP.getFlashChipSize() / 8 / 1024;
	const char* flash_mode_str[] = {"QIO", "QOUT", "DIO", "DOUT", "UNKNOWN"};

	if (flash_hw_size == flash_sw_size)
		log_i("Flash: size: %dKB, speed %dMHz, mode %s",
		flash_hw_size, ESP.getFlashChipSpeed() / 1000000,
		flash_mode_str[min((int)ESP.getFlashChipMode(), 4)]);
	else
		log_e("Wrong flash size: hardware %dKB, software %dKB!", flash_hw_size, flash_sw_size);


	if (!SPIFFS.begin()) {
		log_w("Formatting filesystem...");

		if (SPIFFS.format())
			writeEvent("WARN", "sys", "Filesystem formatted", "");
		else
			log_e("Could not format filesystem!");
	}

	wifiDisconnectHandler = WiFi.onStationModeDisconnected(onWifiDisconnect);
	if (!loadConfiguration()) {
		fallbacktoAPMode();
	}
	setupWebServer();
	writeEvent("INFO", "sys", "System setup completed, running", "");
}

void ICACHE_RAM_ATTR loop() {
	currentMillis = millis();
	deltaTime = currentMillis - previousLoopMillis;
	uptime = NTP.getUptimeSec();
	previousLoopMillis = currentMillis;

	if (currentMillis >= cooldown)
		rfidloop();

	if (activateRelay) {
		log_i("activating relay at %lums", millis());
		digitalWrite(relayPin, !relayType);
		previousMillis = millis();
		activateRelay = false;
		deactivateRelay = true;
	} else if((currentMillis - previousMillis >= activateTime) && (deactivateRelay)) {
		log_i("deactivating relay at %lums", millis());
		digitalWrite(relayPin, relayType);
		deactivateRelay = false;
	}

	if (formatreq) {
		log_w("Factory reset initiated...");
		SPIFFS.end();
		ws.enable(false);
		SPIFFS.format();
		ESP.restart();
	}

	if (timerequest) {
		timerequest = false;
		sendTime();
	}

	if (autoRestartIntervalSeconds > 0 && uptime > autoRestartIntervalSeconds * 1000) {
		log_w("Auto restarting...");
		writeEvent("INFO", "sys", "System is going to reboot", "");
		shouldReboot = true;
	}

	if (shouldReboot) {
		log_w("Rebooting...");
		writeEvent("INFO", "sys", "System is going to reboot", "");
		ESP.restart();
	}

	if (isWifiConnected) {
		wiFiUptimeMillis += deltaTime;

		if (wifiTimeout && wiFiUptimeMillis > wifiTimeout * 1000) {
			writeEvent("INFO", "wifi", "WiFi is going to be disabled", "");
			doDisableWifi = true;
		}
	}

	if (doDisableWifi) {
		doDisableWifi = false;
		wiFiUptimeMillis = 0;
		disableWifi();
	} else if (doEnableWifi) {
		writeEvent("INFO", "wifi", "Enabling WiFi", "");
		doEnableWifi = false;
		if (!isWifiConnected) {
			wiFiUptimeMillis = 0;
			enableWifi();
		}
	}

	if (mqttenabled) {
		if (mqttClient.connected()) {
				if ((unsigned)now() > nextbeat) {
				mqtt_publish_heartbeat(now());
				nextbeat = (unsigned)now() + interval;
				log_i("Nextbeat=%lu", nextbeat);
			}
		}
	}
}
