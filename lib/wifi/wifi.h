#ifndef __WIFI_H__
#define __WIFI_H__

#include <Arduino.h>
#include <ESP8266WiFi.h>

#define WIFI_CONNECTION_ATTEMPT_TIMEOUT_SEC 20


uint32_t wifi_offtime_ms = 0;
uint32_t wifi_offtime_next_ms = 0;
char *wifi_hostname = NULL;
bool wifi_is_ap = true;


void wifi_update_offtime()
{
    wifi_offtime_next_ms = wifi_offtime_ms ? millis() + wifi_offtime_ms : 0;
}

bool wifi_start_ap(const char *ssid = NULL, const char *pass = NULL, bool hidden = false)
{
    char ap_ssid[16];

	WiFi.mode(WIFI_AP);
    log_i("Configuring access point...");

    if (ssid)
        strncpy(ap_ssid, ssid, sizeof(ap_ssid));
    else {
        uint8_t macAddr[6];
        WiFi.softAPmacAddress(macAddr);
        sprintf(ap_ssid, "ESP-RFID-%02x%02x%02x", macAddr[3], macAddr[4], macAddr[5]);
    }

	if (!WiFi.softAP(ap_ssid, pass, 1, hidden)) {
        log_e("Failed to start access point...");
		ESP.restart();
	}

    log_i("Access point: ssid: %s, pass: %s, ip %s", ap_ssid, pass ? pass : "", WiFi.softAPIP().toString().c_str());
    wifi_update_offtime();

	return true;
}

bool wifi_connect_sta(const char *ssid, const char *password, const char *bssid)
{
    uint8_t mac[6];

	for (uint8_t i = 0; i < sizeof(mac) && bssid && *bssid; i++) {
		mac[i] = strtoul(bssid, NULL, 16);
		bssid = strchr(bssid, ':');
		bssid++;
	}

	WiFi.mode(WIFI_STA);
	WiFi.begin(ssid, password, 0, mac);

    log_i("Connecting to wifi...");
    for (uint8_t i = 0; i < WIFI_CONNECTION_ATTEMPT_TIMEOUT_SEC; i++) {
        if (WiFi.status() == WL_CONNECTED)
            break;
#ifdef SERIAL_LOG_ENABLED
        Serial.print('.');
#endif
        delay(1000);
    }
#ifdef SERIAL_LOG_ENABLED
    Serial.println();
#endif

	if (WiFi.status() == WL_CONNECTED) {
		flash_log_i("Connected to ssid: %s, ip: %s", ssid, WiFi.localIP().toString().c_str());
        wifi_update_offtime();
		return true;
	}
    
    log_w("Failed connecting to ssid: %s", ssid);
	return false;
}

bool wifi_init(bool is_ap, bool dhcp, bool hidden,  uint32_t offtime_ms,
        const char *hostname, const char *bssid, const char *ssid, const char *pass,
        const char *ip, const char *subnet, const char *gateway, const char *dns)
{
    wifi_is_ap = is_ap;
    wifi_offtime_ms = offtime_ms;

    wifi_hostname = strdup(hostname ? hostname : "esp-rfid");
    WiFi.hostname(wifi_hostname);

	if (wifi_is_ap)
        return wifi_start_ap(ssid, pass, hidden);

    if (!dhcp) {
        IPAddress client_ip;
        IPAddress subnet_ip;
        IPAddress gateway_ip;
        IPAddress dns_ip;
        client_ip.fromString(ip);
        subnet_ip.fromString(subnet);
        gateway_ip.fromString(gateway);
        dns_ip.fromString(dns);
        WiFi.mode(WIFI_STA);
        WiFi.config(client_ip, gateway_ip, subnet_ip, dns_ip);
    }

    return wifi_connect_sta(ssid, pass, bssid);
}

void wifi_update()
{
    uint32_t cur_ms = millis();

	if (WiFi.status() == WL_CONNECTED) {
         if (wifi_offtime_next_ms && (cur_ms > wifi_offtime_next_ms)) {
            flash_log_i("Wifi uptime timeout- turning wifi off");
            WiFi.disconnect(true);
            wifi_offtime_next_ms = 0;
        }
    }
}

#endif
