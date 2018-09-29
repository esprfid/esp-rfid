/*
	Authors:
		Arad Eizen
		Ömer Şiar Baysal
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
#include <ArduinoJson.h>
#include <SPI.h>
#include <FS.h>

#include "common.h"
#include "serial_log.h"
#include "flash_log.h"
#include "wifi.h"
#include "network.h"
#include "web_app.h"
#include "relay.h"
#include "buzzer.h"
#include "rfid.h"
#include "keypad.h"


uint32_t auto_restart_ms = 0;
bool formatreq = false;

bool load_configuration()
{
	log_d("%s()", __func__);
	File conf_file = SPIFFS.open(CONF_FILE_PATH, "r");
	if (!conf_file) {
		log_w("Failed to open config file");
		return false;
	}

	size_t size = conf_file.size();
	std::unique_ptr<char[]> buf(new char[size]);
	conf_file.readBytes(buf.get(), size);
	DynamicJsonBuffer json_buffer;
	JsonObject &config = json_buffer.parseObject(buf.get());
	conf_file.close();
	if (!config.success()) {
		log_e("Failed to parse config file");
		return false;
	}

	log_i("Config file found:");
#if SERIAL_LOG_LEVEL >= SERIAL_LOG_LEVEL_INFO
	config.prettyPrintTo(Serial);
	Serial.println();
#endif

	JsonObject &general = config["general"];
	JsonObject &network = config["network"];
	JsonObject &hardware = config["hardware"];
	JsonObject &mqtt = config["mqtt"];
	JsonObject &ntp = config["ntp"];

	auto_restart_ms = (uint32_t)general["restart"] * 1000;

	rfid_init(
		hardware["reader"],
		hardware["gain"],
		hardware["sspin"],
		hardware["d0pin"],
		hardware["d1pin"],
		hardware["rxpin"]
	);
	relay_init(
		hardware["relaymode"],
		hardware["relaypin"],
		hardware["relaydelay"]
	);
	buzzer_init(
		hardware["buzzermode"],
		hardware["buzzerpin"]
	);
	keypad_init(
		hardware["keypadmode"],
		hardware["keymap"],
		hardware["keypass"],
		hardware["sdapin"],
		hardware["sclpin"]
	);
	wifi_init(
		network["apmode"],
		network["dhcp"],
		network["hidden"],
		(uint32_t)network["offtime"] * 1000,
		general["hostname"],
		network["bssid"],
		network["ssid"],
		network["password"],
		network["ip"],
		network["subnet"],
		network["gateway"],
		network["dns"]
	);
	network_init(
		ntp["server"],
		(uint32_t)ntp["interval"] * 60,
		ntp["timezone"],
		mqtt["enabled"],
		mqtt["host"],
		mqtt["port"],
		mqtt["user"],
		mqtt["password"],
		mqtt["topic"]
	);
	web_app_init(
		general["password"]
	);
	return true;
}

void setup()
{
	delay(1000);
#ifdef SERIAL_LOG_ENABLED
	/* init serial log */
	SERIAL_LOG_INIT();
	log_i("ESP RFID v1.0");

	/* log esp flash stuff on debug */
	uint16_t flash_hw_size = ESP.getFlashChipRealSize() / 8 / 1024;
	uint16_t flash_sw_size = ESP. getFlashChipSize() / 8 / 1024;
	const char* flash_mode_str[] = {"QIO", "QOUT", "DIO", "DOUT", "UNKNOWN"};

	if (flash_hw_size == flash_sw_size)
		log_i("Flash: size: %dKB, speed %dMHz, mode %s",
			flash_hw_size, ESP.getFlashChipSpeed() / 1000000,
			flash_mode_str[min((int)ESP.getFlashChipMode(), 4)]);
	else
		log_e("Wrong flash size: hardware %dKB, software %dKB!", flash_hw_size, flash_sw_size);
#endif

	/* init spiff, format if needed */
	if (!SPIFFS.begin()) {
		log_w("Formatting filesystem...");

		if (SPIFFS.format())
			flash_log_w("Filesystem formatted");
		else
			log_e("Could not format filesystem!");
	}

	/* load configuration from json config file, and init all modules */
	if (!load_configuration()) {
		log_w("Configuration error, needs to be fixed via AP");
		wifi_init(1, 1, 0, 0, "esp-rfid", NULL, NULL, NULL, NULL, NULL, NULL, NULL);
		network_init(NULL, 0, 0, 0, NULL, 0, NULL, NULL, NULL);
		web_app_init(NULL);
		// wifi_start_ap();
	}
	else
		flash_log_i("System setup completed!");
}

void loop()
{
	uint32_t cur_ms = millis();

	rfid_update();
	relay_update();
	buzzer_update();
	keypad_update();
	wifi_update();

	if (keypad_valid_password() || rfid_valid_tag()) {
		relay_open_door();
		buzzer_beep(100);
	}

	if (auto_restart_ms && cur_ms > auto_restart_ms) {
		flash_log_i("Auto restarting...");
		ESP.restart();
	}
}
