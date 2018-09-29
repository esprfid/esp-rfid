/*
 * ntp.cpp
 *
 *  Created on: 8 Mar 2016
 *      Author: joe
 */

#include <ESPAsyncUDP.h>
#include "ntp.h"


char * NtpClient::TimeServerName;
int8_t NtpClient::timezone;
time_t NtpClient::syncInterval;
IPAddress NtpClient::timeServer;

AsyncUDP NtpClient::udpListener;

byte NtpClient::NTPpacket[NTP_PACKET_SIZE];

void NtpClient::Ntp(const char * server, int8_t tz, time_t syncSecs) {
	TimeServerName = strdup(server);
	timezone = tz;
	syncInterval = syncSecs;
	WiFi.hostByName(TimeServerName, timeServer);
	setSyncProvider(getNtpTime);
	setSyncInterval(syncInterval);
}


NtpClient::~NtpClient() {
	udpListener.close();
}

// send an NTP request to the time server at the given address
time_t NtpClient::getNtpTime() {
	memset(NTPpacket, 0, sizeof(NTPpacket));
	NTPpacket[0] = 0b11100011;
	NTPpacket[1] = 0;
	NTPpacket[2] = 6;
	NTPpacket[3] = 0xEC;
	NTPpacket[12] = 49;
	NTPpacket[13] = 0x4E;
	NTPpacket[14] = 49;
	NTPpacket[15] = 52;
	if (udpListener.connect(timeServer, 123)) {
		udpListener.onPacket([](AsyncUDPPacket packet) {
			unsigned long highWord = word(packet.data()[40], packet.data()[41]);
			unsigned long lowWord = word(packet.data()[42], packet.data()[43]);
			time_t UnixUTCtime = (highWord << 16 | lowWord) - 2208988800UL;
			setTime(UnixUTCtime);
		});
	}
	else {

	}
	udpListener.write(NTPpacket, sizeof(NTPpacket));
	// ugly
	return 0;
}

bool NtpClient::processTime() {

	timeStatus_t ts = timeStatus();

	switch (ts) {
	case timeNeedsSync:
		return false;
		break;
	case timeSet:
		return true;
		break;
	default:
		return false;
	}
}

String NtpClient::zeroPaddedIntVal(int val) {
	if (val < 10)
		return "0" + String(val);
	else
		return String(val);
}

//returns the current date/time as a string in iso8601 format
String NtpClient::iso8601DateTime() {

	String hyphen = "-";
	String colon = ":";

	return	String(year()) + hyphen +
	        zeroPaddedIntVal(month()) + hyphen +
	        zeroPaddedIntVal(day()) + "T" +
	        zeroPaddedIntVal(hour()) + colon +
	        zeroPaddedIntVal(minute()) + colon +
	        zeroPaddedIntVal(second()) +
	        (timezone == 0 ? "Z" : String(timezone));
}

time_t NtpClient::getUptimeSec() {
	_uptimesec = _uptimesec + (millis () - _uptimesec);
	return _uptimesec / 1000;
}

deviceUptime NtpClient::getDeviceUptime() {

	unsigned long currentmillis = millis();

	deviceUptime uptime;
	uptime.secs  = (long)((currentmillis / 1000) % 60);
	uptime.mins  = (long)((currentmillis / 60000) % 60);
	uptime.hours = (long)((currentmillis / 3600000) % 24);
	uptime.days  = (long)((currentmillis / 86400000) % 10);

	return uptime;

}

String NtpClient::getDeviceUptimeString() {

	deviceUptime uptime = getDeviceUptime();

	return	String(uptime.days) + " days, " +
	        String(uptime.hours) + " hours, " +
	        String(uptime.mins) + " mins, " +
	        String(uptime.secs) + " secs";

}

/*
 * returns the current time as UTC (timezone offset removed)
 */
time_t NtpClient::getUtcTimeNow() {

	return now() - timezone;

}