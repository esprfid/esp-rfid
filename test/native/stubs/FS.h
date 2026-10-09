#pragma once
#include <sstream>
#include <string>

struct File : std::stringstream
{
	bool opened = false;
	bool writeMode = false;
	std::string *storage = nullptr;

	File() { setstate(std::ios::failbit); }
	File(std::string *value, bool writing) : opened(true), writeMode(writing), storage(value)
	{
		if (!writing)
		{
			str(*value);
		}
	}
	File(File &&other) : std::stringstream(other.str()), opened(other.opened),
		writeMode(other.writeMode), storage(other.storage) {}
	void close()
	{
		if (opened && writeMode)
		{
			*storage = str();
		}
		opened = false;
	}
};

struct FakeSPIFFS
{
	std::string contents;
	bool present = false;
	bool failOpen = false;
	bool exists(const char *) const { return present; }
	File open(const char *, const char *mode)
	{
		if (failOpen)
		{
			return File();
		}
		present = true;
		return File(&contents, mode[0] == 'w');
	}
};
extern FakeSPIFFS SPIFFS;
