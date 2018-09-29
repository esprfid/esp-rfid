#ifndef __WEB_APP_H__
#define __WEB_APP_H__

#include <Arduino.h>
#include <ESPAsyncTCP.h>
#include <ESPAsyncWebServer.h>

#include "common.h"
#include "serial_log.h"
#include "flash_log.h"
#include "wifi.h"
#include "network.h"
#include "relay.h"

#include "webh/glyphicons-halflings-regular.woff.gz.h"
#include "webh/required.css.gz.h"
#include "webh/required.js.gz.h"

#include "webh/esprfid.js.gz.h"
#include "webh/esprfid.htm.gz.h"
#include "webh/index.html.gz.h"


const char *web_app_http_user = "admin";
const char *web_app_http_pass = NULL;

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");


bool fix_user_acctype(JsonObject &user)
{
	const char *uid = user["uid"];
	const char *username = user["username"];
	uint8_t acctype = user["acctype"];
	uint32_t valid_time = user["validuntil"];

	switch (acctype) {
		case 1:
			return true;
		case 2:
			if (valid_time > (uint32_t)now())
				return true;
			log_w("User uid: %s, username: %s access time expired!", uid, username);
			user["acctype"] = (uint8_t)3;
			break;
	}
	return false;
}

bool web_handle_response(JsonObject &response, AsyncWebSocketClient *client=NULL)
{
	log_d("WebSocket response:");
#if SERIAL_LOG_LEVEL >= SERIAL_LOG_LEVEL_DEBUG
		response.printTo(Serial);
		Serial.println();
#endif

	size_t len = response.measureLength();
	AsyncWebSocketMessageBuffer *buffer = ws.makeBuffer(len);

	if (!buffer) {
		log_w("Failed allocating async buffer");
		return false;
	}

	response.printTo((char *)buffer->get(), len + 1);
	if (client)
		client->text(buffer);
	else
		ws.textAll(buffer);

	return true;
}

bool web_send_command_result(const char *command, bool result, AsyncWebSocketClient *client=NULL)
{
	DynamicJsonBuffer json_buffer;
	JsonObject &root = json_buffer.createObject();

	root["command"] = "result";
	root["resultof"] = command;
	root["result"] = result;

	return web_handle_response(root, client);
}

bool web_send_response_with_result(JsonObject &response, AsyncWebSocketClient *client=NULL)
{
	bool result = web_handle_response(response, client);
	const char * command = response["command"];
	web_send_command_result(command, result, client);
	return result;
}

bool web_send_json_file(const char *path, AsyncWebSocketClient *client=NULL)
{
	File json_file = SPIFFS.open(CONF_FILE_PATH, "r");
	if (!json_file) {
		log_w("Failed to open json file: %s", path);
		return false;
	}

	size_t size = json_file.size();
	std::unique_ptr<char[]> buf(new char[size]);
	json_file.readBytes(buf.get(), size);
	DynamicJsonBuffer json_buffer;
	JsonObject &json = json_buffer.parseObject(buf.get());
	json_file.close();
	if (!json.success()) {
		log_w("Failed to parse json file: %s", path);
		return false;
	}

	return web_handle_response(json, client);
}

bool web_send_rfid_scan(const char *uid, const char *username=NULL, uint8_t acctype=0)
{
	DynamicJsonBuffer json_buffer;
	JsonObject &root = json_buffer.createObject();
	root["command"] = "rfidscanned";
	root["uid"] = uid;
	root["acctype"] = acctype;
	if (username)
		root["username"] = username;
	return web_handle_response(root);
}

bool send_page(const char *path, const char *command, uint16_t page, AsyncWebSocketClient *client)
{
	uint16_t i = 0;
	uint16_t last = page * 10;
    uint16_t first = (page - 1) * 10;
	DynamicJsonBuffer json_buffer;
	JsonObject &root = json_buffer.createObject();
    JsonArray &list = root.createNestedArray("list");

	File f = SPIFFS.open(path, "r");
	while (f.available()) {
		String line = String();
		line = f.readStringUntil('\n');
		if (i >= first && i < last) {
			list.add(line);
		}
		i++;
	}
	f.close();

	root["page"] = page;
	root["command"] = command;
	root["haspages"] = ceil(i / 10.0);

	return web_send_response_with_result(root, client);
}

bool send_user_list(int page, AsyncWebSocketClient *client)
{
	DynamicJsonBuffer json_buffer;
	JsonObject &root = json_buffer.createObject();
	root["command"] = "userlist";
	root["page"] = page;
	JsonArray &users = root.createNestedArray("list");
	Dir dir = SPIFFS.openDir("/P/");
	int first = (page - 1) * 15;
	int last = page * 15;
	int i = 0;
	while (dir.next()) {
		if (i >= first && i < last) {
			JsonObject &item = users.createNestedObject();
			String uid = dir.fileName();
			uid.remove(0, 3);
			item["uid"] = uid;
			File f = SPIFFS.open(dir.fileName(), "r");
			size_t size = f.size();
			std::unique_ptr<char[]> buf(new char[size]);
			f.readBytes(buf.get(), size);
			DynamicJsonBuffer json_buffer_2;
			JsonObject &json = json_buffer_2.parseObject(buf.get());
			if (json.success()) {
				item["username"] = json["username"];
				item["acctype"] = json["acctype"];
				item["validuntil"] = json["validuntil"];
			}
		}
		i++;
	}
	root["haspages"] = ceil(i / 15.0);

	return web_send_response_with_result(root, client);
}

bool send_status(AsyncWebSocketClient *client)
{
	FSInfo fsinfo;
	struct ip_info info;

	if (!SPIFFS.info(fsinfo))
		log_e("Failed to get spiffs info");

	DynamicJsonBuffer json_buffer;
	JsonObject &root = json_buffer.createObject();
	root["command"] = "status";
	root["heap"] = ESP.getFreeHeap();
	root["chipid"] = String(ESP.getChipId(), HEX);
	root["cpu"] = ESP.getCpuFreqMHz();
	root["availsize"] = ESP.getFreeSketchSpace();
	root["availspiffs"] = fsinfo.totalBytes - fsinfo.usedBytes;
	root["spiffssize"] = fsinfo.totalBytes;
	root["uptime"] = network_ntp.getDeviceUptimeString();

	if (wifi_is_ap) {
		wifi_get_ip_info(SOFTAP_IF, &info);
		struct softap_config conf;
		wifi_softap_get_config(&conf);
		root["ssid"] = (char *)conf.ssid;
		root["dns"] = WiFi.softAPIP().toString();
		root["mac"] = WiFi.softAPmacAddress();
	} else {
		wifi_get_ip_info(STATION_IF, &info);
		struct station_config conf;
		wifi_station_get_config(&conf);
		root["ssid"] = (char *)conf.ssid;
		root["dns"] = WiFi.dnsIP().toString();
		root["mac"] = WiFi.macAddress();
	}

	root["ip"] = IPAddress(info.ip.addr).toString();
	root["gateway"] = IPAddress(info.gw.addr).toString();
	root["netmask"] = IPAddress(info.netmask.addr).toString();

	return web_handle_response(root, client);
}

void send_scan_result(int networksFound)
{
	int n = networksFound;
	int indices[n];
	int skip[n];
	for (int i = 0; i < networksFound; i++) {
		indices[i] = i;
	}
	/* sort by RSSI */
	for (int i = 0; i < networksFound; i++) {
		for (int j = i + 1; j < networksFound; j++) {
			if (WiFi.RSSI(indices[j]) > WiFi.RSSI(indices[i])) {
				std::swap(indices[i], indices[j]);
				std::swap(skip[i], skip[j]);
			}
		}
	}
	DynamicJsonBuffer json_buffer;
	JsonObject &root = json_buffer.createObject();
	root["command"] = "ssidlist";
	JsonArray &scan = root.createNestedArray("list");
	for (int i = 0; i < 5 && i < networksFound; ++i) {
		JsonObject &item = scan.createNestedObject();
		item["ssid"] = WiFi.SSID(indices[i]);
		item["bssid"] = WiFi.BSSIDstr(indices[i]);
		item["rssi"] = WiFi.RSSI(indices[i]);
		item["channel"] = WiFi.channel(indices[i]);
		item["enctype"] = WiFi.encryptionType(indices[i]);
		item["hidden"] = WiFi.isHidden(indices[i]) ? true : false;
	}
	web_handle_response(root);
	WiFi.scanDelete();
}

bool send_time(AsyncWebSocketClient *client)
{
	DynamicJsonBuffer json_buffer;
	JsonObject &root = json_buffer.createObject();
	root["command"] = "gettime";
	root["epoch"] = now();
	root["timezone"] = network_ntp.timezone;
	return web_handle_response(root, client);
}

void web_handle_request(JsonObject &request, AsyncWebSocketClient *client)
{
	const char *command = request["command"];

	if (!strcmp(command, "remove")) {
		const char *uid = request["uid"];
		String filename = "/P/";
		filename += uid;
		SPIFFS.remove(filename);
	} else if (!strcmp(command, "configfile")) {
		File f = SPIFFS.open(CONF_FILE_PATH, "w+");
		if (f) {
			request.prettyPrintTo(f);
			f.close();
			delay(100);
			ESP.restart();
		}
	} else if (!strcmp(command, "userlist")) {
		int page = request["page"];
		send_user_list(page, client);
	} else if (!strcmp(command, "status")) {
		send_status(client);
	} else if (!strcmp(command, "restart")) {
		delay(100);
		ESP.restart();
	} else if (!strcmp(command, "destroy")) {
		ws.enable(false);
		flash_format_fs();
	} else if (!strcmp(command, "geteventlog")) {
		send_page(EVENTLOG_FILE_PATH, "eventlist", request["page"], client);
	} else if (!strcmp(command, "getlatestlog")) {
		send_page(LATESTLOG_FILE_PATH, "latestlist", request["page"], client);
	} else if (!strcmp(command, "clearevent")) {
		SPIFFS.remove("/eventlog.json");
		flash_log_w("Event log cleared!");
	} else if (!strcmp(command, "clearlatest")) {
		SPIFFS.remove("/latestlog.json");
		flash_log_w("Latest access log cleared!");
	} else if (!strcmp(command, "userfile")) {
		String filename = "/P/";
		const char *uid = request["uid"];
		filename += uid;

		fix_user_acctype(request);

		File f = SPIFFS.open(filename, "w+");
		if (f) {
			request.printTo(f);
			f.close();
		}
		web_send_command_result("userfile", true, client);
	} else if (!strcmp(command, "testrelay")) {
		relay_open_door();
		client->text("{\"command\":\"giveAccess\"}");
	} else if (!strcmp(command, "scan")) {
		WiFi.scanNetworksAsync(send_scan_result, true);
	} else if (!strcmp(command, "gettime")) {
		send_time(client);
	} else if (!strcmp(command, "settime")) {
		time_t t = request["epoch"];
		setTime(t);
		send_time(client);
	} else if (!strcmp(command, "getconf")) {
		web_send_json_file(CONF_FILE_PATH);
	}
}

void on_ws_event(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len)
{
	char *request_str = (char *)data;

	switch ((int)type) {
	case WS_EVT_ERROR:
		log_w("WebSocket[%s][%u] error(%u): %s", server->url(), client->id(), *((uint16_t *)arg), request_str);
		break;
	case WS_EVT_DATA:
		AwsFrameInfo *info = (AwsFrameInfo *)arg;

		if ((!info->final) || info->index || info->len != len) {
			log_w("WebSocket got partial request: %s", request_str);
			return;
		}

		DynamicJsonBuffer json_buffer;
		JsonObject &request = json_buffer.parseObject(request_str);
		if (!request.success()) {
			log_w("WebSocket failed to parse request: %s", request_str);
			return;
		}
		log_d("WebSocket request:");
#if SERIAL_LOG_LEVEL >= SERIAL_LOG_LEVEL_DEBUG
		request.printTo(Serial);
		Serial.println();
#endif

		web_handle_request(request, client);
		break;
	} 
}

void web_app_init(const char *http_pass)
{
	web_app_http_pass = strdup(http_pass ? http_pass : "admin");

	ws.setAuthentication(web_app_http_user, web_app_http_pass);
	ws.onEvent(on_ws_event);

	server.addHandler(&ws);
	server.onNotFound([](AsyncWebServerRequest *request) {
		AsyncWebServerResponse *response = request->beginResponse(404, "text/plain", "Not found");
		request->send(response);
	});
	server.on("/update", HTTP_POST, [](AsyncWebServerRequest *request) {
		AsyncWebServerResponse * response = request->beginResponse(200, "text/plain", "OK");
		response->addHeader("Connection", "close");
		request->send(response);
	}, [](AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final) {
		if (!request->authenticate(web_app_http_user, web_app_http_pass))
			return;

		if (!index) {
			flash_log_i("Firmware update started: %s", filename.c_str());
			Update.runAsync(true);
			if (!Update.begin((ESP.getFreeSketchSpace() - 0x1000) & 0xFFFFF000))
				flash_log_w("Firmware update failed: not enough space");
		}
		if (!Update.hasError()) {
			if (Update.write(data, len) != len)
				flash_log_w("Firmware update failed: error while writeing to flash");
		}
		if (final) {
			if (Update.end(true) && !Update.hasError()) {
				flash_log_i("Firmware update finished: %uB", index + len);
				log_i("Booting from new firmware...");
				ESP.restart();
			} else
				flash_log_w("Firmware update failed at the end");
		}
	});
	server.on("/fonts/glyphicons-halflings-regular.woff", HTTP_GET, [](AsyncWebServerRequest *request) {
		AsyncWebServerResponse *response = request->beginResponse_P(200, "font/woff", glyphicons_halflings_regular_woff_gz, glyphicons_halflings_regular_woff_gz_len);
		response->addHeader("Content-Encoding", "gzip");
		request->send(response);
	});
	server.on("/css/required.css", HTTP_GET, [](AsyncWebServerRequest *request) {
		AsyncWebServerResponse *response = request->beginResponse_P(200, "text/css", required_css_gz, required_css_gz_len);
		response->addHeader("Content-Encoding", "gzip");
		request->send(response);
	});
	server.on("/js/required.js", HTTP_GET, [](AsyncWebServerRequest *request) {
		AsyncWebServerResponse *response = request->beginResponse_P(200, "text/javascript", required_js_gz, required_js_gz_len);
		response->addHeader("Content-Encoding", "gzip");
		request->send(response);
	});
	server.on("/js/esprfid.js", HTTP_GET, [](AsyncWebServerRequest *request) {
		AsyncWebServerResponse *response = request->beginResponse_P(200, "text/javascript", esprfid_js_gz, esprfid_js_gz_len);
		response->addHeader("Content-Encoding", "gzip");
		request->send(response);
	});
	server.on("/index.html", HTTP_GET, [](AsyncWebServerRequest *request) {
		AsyncWebServerResponse *response = request->beginResponse_P(200, "text/html", index_html_gz, index_html_gz_len);
		response->addHeader("Content-Encoding", "gzip");
		request->send(response);
	});
	server.on("/esprfid.htm", HTTP_GET, [](AsyncWebServerRequest *request) {
		AsyncWebServerResponse *response = request->beginResponse_P(200, "text/html", esprfid_htm_gz, esprfid_htm_gz_len);
		response->addHeader("Content-Encoding", "gzip");
		request->send(response);
	});

	server.on("/login", HTTP_GET, [](AsyncWebServerRequest *request) {
		String client_ip_str = request->client()->remoteIP().toString();
		if (!request->authenticate(web_app_http_user, web_app_http_pass)) {
			log_i("Login attempt from: %s", client_ip_str.c_str());
			return request->requestAuthentication();
		}
		request->send(200, "text/plain", "Success");
		flash_log_i("Login successfully: %s", client_ip_str.c_str());
	});
	server.rewrite("/", "/index.html");
	server.begin();
}

#endif
