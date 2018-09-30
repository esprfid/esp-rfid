#ifndef __NETWORK_H__
#define __NETWORK_H__

#include <Arduino.h>
#include <ESP8266mDNS.h>
#include <NtpClientLib.h>
#include "wifi.h"


void network_init(const char *ntp_server, uint32_t ntp_interval, int8_t ntp_zone,
		bool mqtt_enabled, const char *mqtt_host, uint16_t mqtt_port,
		const char *mqtt_user, const char *mqtt_pass, const char *mqtt_topic)
{
	if (!MDNS.begin(wifi_hostname))
		log_w("Faild setting up mdns responder for hostname: %s", wifi_hostname);

	MDNS.addService("http", "tcp", 80);

	if (ntp_server) {
		NTP.setInterval(ntp_interval);
        NTP.begin(ntp_server, ntp_zone);
	}
}

void network_update(void)
{

}

#endif
