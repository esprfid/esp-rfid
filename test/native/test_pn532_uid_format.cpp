#include "pn532_uid_format.h"

#include <assert.h>
#include <string.h>

int main()
{
	char canonical[17] = {};
	char legacy[17] = {};
	const uint8_t first[] = {0x01, 0x23, 0x45, 0x67};
	const uint8_t second[] = {0x12, 0x03, 0x45, 0x67};

	assert(formatPn532Uid(first, sizeof(first), canonical, sizeof(canonical), legacy, sizeof(legacy)));
	assert(strcmp(canonical, "01234567") == 0);
	assert(strcmp(legacy, "1234567") == 0);

	assert(formatPn532Uid(second, sizeof(second), canonical, sizeof(canonical), legacy, sizeof(legacy)));
	assert(strcmp(canonical, "12034567") == 0);
	assert(strcmp(legacy, "1234567") == 0); // Existing records retain the old key.

	const uint8_t sevenByteUid[] = {0x00, 0x0a, 0x10, 0x02, 0xff, 0x30, 0x04};
	assert(formatPn532Uid(sevenByteUid, sizeof(sevenByteUid), canonical, sizeof(canonical), legacy, sizeof(legacy)));
	assert(strcmp(canonical, "000a1002ff3004") == 0);
	assert(strcmp(legacy, "0a102ff304") == 0);

	assert(!formatPn532Uid(sevenByteUid, sizeof(sevenByteUid), canonical, 10, legacy, sizeof(legacy)));
	return 0;
}
