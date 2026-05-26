#include "crc16.h"

uint16_t crc16_ccitt(const uint8_t *data, size_t len)
{
	uint16_t crc = 0xFFFF;

	if (data == NULL)
	{
		return crc;
	}

	for (size_t i = 0; i < len; ++i)
	{
		crc ^= (uint16_t)data[i] << 8;
		for (uint8_t bit = 0; bit < 8; ++bit)
		{
			if ((crc & 0x8000U) != 0U)
			{
				crc = (uint16_t)((crc << 1) ^ 0x1021U);
			}
			else
			{
				crc <<= 1;
			}
		}
	}

	return crc;
}
