#pragma once

#include <Arduino.h>

#if defined(ESP32)
#include <SPIFFS.h>
#include <Update.h>

#ifndef ICACHE_FLASH_ATTR
#define ICACHE_FLASH_ATTR
#endif

#ifndef ICACHE_RAM_ATTR
#define ICACHE_RAM_ATTR IRAM_ATTR
#endif

struct EspRfidFSInfo
{
	size_t totalBytes = 0;
	size_t usedBytes = 0;
};

inline bool espRfidSpiffsInfo(EspRfidFSInfo &info)
{
	info.totalBytes = SPIFFS.totalBytes();
	info.usedBytes = SPIFFS.usedBytes();
	return info.totalBytes > 0;
}

class EspRfidDir
{
public:
	explicit EspRfidDir(const char *path)
		: prefix(path ? path : "/")
	{
		if (prefix != "/" && !prefix.endsWith("/"))
			prefix += "/";
		root = SPIFFS.open("/");
	}

	bool next()
	{
		while (root && (current = root.openNextFile()))
		{
			String name = current.path();
			if (name.isEmpty())
				name = current.name();
			if (name.isEmpty())
				continue;
			if (!name.startsWith("/"))
				name = "/" + name;
			if (prefix != "/" && !name.startsWith(prefix))
				continue;
			currentName = name;
			return true;
		}
		return false;
	}

	String fileName()
	{
		return currentName;
	}

	size_t fileSize()
	{
		return current.size();
	}

private:
	File root;
	File current;
	String prefix;
	String currentName;
};

inline uint32_t espRfidChipId()
{
	return (uint32_t)(ESP.getEfuseMac() & 0xFFFFFF);
}

inline String espRfidHostname()
{
	const char *hostname = WiFi.getHostname();
	return hostname ? String(hostname) : String();
}

inline void espRfidSetHostname(const char *hostname)
{
	if (hostname && hostname[0] != '\0')
	{
		WiFi.setHostname(hostname);
	}
}

inline bool espRfidBeginFirmwareUpdate()
{
	return Update.begin(UPDATE_SIZE_UNKNOWN);
}

inline AsyncWebServerResponse *espRfidBeginStaticResponse(AsyncWebServerRequest *request, int code, const char *contentType, const uint8_t *content, size_t len)
{
	return request->beginResponse(code, contentType, content, len);
}

inline void espRfidWdtDisable() {}
inline void espRfidWdtEnable(uint32_t timeoutMs) { (void)timeoutMs; }
inline void espRfidWdtFeed() { yield(); }

#else
#include <FS.h>
#include <Updater.h>

using EspRfidFSInfo = FSInfo;

class EspRfidDir
{
public:
	explicit EspRfidDir(const char *path)
		: dir(SPIFFS.openDir(path))
	{
	}

	bool next()
	{
		return dir.next();
	}

	String fileName()
	{
		return dir.fileName();
	}

	size_t fileSize()
	{
		return dir.fileSize();
	}

private:
	Dir dir;
};

inline bool espRfidSpiffsInfo(EspRfidFSInfo &info)
{
	return SPIFFS.info(info);
}

inline uint32_t espRfidChipId()
{
	return ESP.getChipId();
}

inline String espRfidHostname()
{
	return WiFi.hostname();
}

inline void espRfidSetHostname(const char *hostname)
{
	WiFi.hostname(hostname);
}

inline bool espRfidBeginFirmwareUpdate()
{
	Update.runAsync(true);
	return Update.begin((ESP.getFreeSketchSpace() - 0x1000) & 0xFFFFF000);
}

inline AsyncWebServerResponse *espRfidBeginStaticResponse(AsyncWebServerRequest *request, int code, const char *contentType, const uint8_t *content, size_t len)
{
	return request->beginResponse_P(code, contentType, content, len);
}

inline void espRfidWdtDisable() { ESP.wdtDisable(); }
inline void espRfidWdtEnable(uint32_t timeoutMs) { ESP.wdtEnable(timeoutMs); }
inline void espRfidWdtFeed() { ESP.wdtFeed(); }

#endif
