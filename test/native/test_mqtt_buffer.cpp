#include "mqtt_buffer.h"

#include <assert.h>
#include <string.h>

int main()
{
	struct GuardedBuffer
	{
		char payload[8];
		char guard;
	} buffer = {{0}, 'X'};
	size_t received = 0;

	assert(appendMqttChunk(buffer.payload, sizeof(buffer.payload), received, "abc", 3, 0, 5) == MQTT_CHUNK_INCOMPLETE);
	assert(appendMqttChunk(buffer.payload, sizeof(buffer.payload), received, "de", 2, 3, 5) == MQTT_CHUNK_COMPLETE);
	assert(strcmp(buffer.payload, "abcde") == 0);

	assert(appendMqttChunk(buffer.payload, sizeof(buffer.payload), received, "1234567", 7, 0, 7) == MQTT_CHUNK_COMPLETE);
	assert(strcmp(buffer.payload, "1234567") == 0);
	assert(buffer.guard == 'X');

	assert(appendMqttChunk(buffer.payload, sizeof(buffer.payload), received, "12345678", 8, 0, 8) == MQTT_CHUNK_INVALID);
	assert(buffer.payload[0] == '\0' && received == 0 && buffer.guard == 'X');

	assert(appendMqttChunk(buffer.payload, sizeof(buffer.payload), received, "ab", 2, 0, 4) == MQTT_CHUNK_INCOMPLETE);
	assert(appendMqttChunk(buffer.payload, sizeof(buffer.payload), received, "d", 1, 3, 4) == MQTT_CHUNK_INVALID);
	assert(buffer.payload[0] == '\0' && received == 0);

	assert(appendMqttChunk(buffer.payload, sizeof(buffer.payload), received, "abcd", 4, 0, 3) == MQTT_CHUNK_INVALID);
	assert(appendMqttChunk(buffer.payload, sizeof(buffer.payload), received, NULL, 1, 0, 1) == MQTT_CHUNK_INVALID);
	assert(buffer.guard == 'X');

	return 0;
}
