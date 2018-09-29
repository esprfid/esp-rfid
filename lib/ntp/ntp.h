/*
 * ntp.h
 *
 *  Created on: 8 Mar 2016
 *      Author: joe
 */

#ifndef __NTP_H__
#define __NTP_H__

#include <ESP8266WiFi.h>
#include <ESPAsyncUDP.h>
#include <TimeLib.h>

#define NTP_PACKET_SIZE 48 // NTP time is in the first 48 bytes of message

struct deviceUptime {
	long days;
	long hours;
	long mins;
	long secs;
};

class NtpClient {
public:
	void Ntp(const char * server, int8_t tz, time_t syncSecs);
	virtual ~NtpClient();
	static String iso8601DateTime();
	static deviceUptime getDeviceUptime();
	static String getDeviceUptimeString();
	static time_t getUtcTimeNow();
	bool processTime();
	time_t getUptimeSec();

	static char * TimeServerName;
	static IPAddress timeServer;
	static int8_t timezone;
	static time_t syncInterval;
	static AsyncUDP udpListener;
	static byte NTPpacket[NTP_PACKET_SIZE];

private:
	static String zeroPaddedIntVal(int val);
	static time_t getNtpTime();

protected:
	time_t _uptimesec = 0;
};

#endif
