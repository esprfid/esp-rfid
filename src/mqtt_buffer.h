#pragma once

#include <stddef.h>
#include <string.h>

enum MqttChunkResult
{
	MQTT_CHUNK_INVALID,
	MQTT_CHUNK_INCOMPLETE,
	MQTT_CHUNK_COMPLETE
};

// Assemble MQTT callback chunks without ever writing past the terminator.
inline MqttChunkResult appendMqttChunk(char *buffer, size_t capacity, size_t &received,
								   const char *payload, size_t length, size_t index, size_t total)
{
	if (index == 0)
	{
		received = 0;
	}

	if (buffer == NULL || capacity == 0 || total >= capacity ||
		(index != received) || index > total || length > total - index ||
		(length > 0 && payload == NULL))
	{
		if (buffer != NULL && capacity > 0)
		{
			buffer[0] = '\0';
		}
		received = 0;
		return MQTT_CHUNK_INVALID;
	}

	if (length > 0)
	{
		memcpy(buffer + index, payload, length);
	}
	received = index + length;
	buffer[received] = '\0';
	return received == total ? MQTT_CHUNK_COMPLETE : MQTT_CHUNK_INCOMPLETE;
}
