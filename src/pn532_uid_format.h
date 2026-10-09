#pragma once

#include <stddef.h>
#include <stdint.h>

// Produce both the canonical two-digit UID and the historical unpadded UID.
inline bool formatPn532Uid(const uint8_t *bytes, size_t count,
						   char *canonical, size_t canonicalCapacity,
						   char *legacy, size_t legacyCapacity)
{
	if (bytes == NULL || canonical == NULL || legacy == NULL ||
		count == 0 || count > 8 || canonicalCapacity <= count * 2 || legacyCapacity <= count * 2)
	{
		return false;
	}

	const char hex[] = "0123456789abcdef";
	size_t legacyLength = 0;
	for (size_t i = 0; i < count; ++i)
	{
		uint8_t high = bytes[i] >> 4;
		uint8_t low = bytes[i] & 0x0f;
		canonical[i * 2] = hex[high];
		canonical[i * 2 + 1] = hex[low];
		if (high != 0)
		{
			legacy[legacyLength++] = hex[high];
		}
		legacy[legacyLength++] = hex[low];
	}
	canonical[count * 2] = '\0';
	legacy[legacyLength] = '\0';
	return true;
}
