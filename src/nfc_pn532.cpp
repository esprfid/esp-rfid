#include "Arduino.h"
#include "PN532.h"
#include "config.h"
#include "nfc_pn532.h"

extern Config config;

namespace
{
class SecurePn532Transport : public PN532
{
public:
	bool transceive(const uint8_t *tx, size_t tx_len, uint8_t *rx, size_t *rx_len)
	{
		if (tx == NULL || rx == NULL || rx_len == NULL || tx_len == 0 || tx_len > (PN532_PACKBUFFSIZE - 2))
		{
			return false;
		}

		mu8_PacketBuffer[0] = PN532_COMMAND_INDATAEXCHANGE;
		mu8_PacketBuffer[1] = 0x01;
		memcpy(&mu8_PacketBuffer[2], tx, tx_len);

		if (!SendCommandCheckAck(mu8_PacketBuffer, (byte)(tx_len + 2)))
		{
			return false;
		}

		byte len = ReadData(mu8_PacketBuffer, PN532_PACKBUFFSIZE);
		if (len < 3 || mu8_PacketBuffer[1] != (PN532_COMMAND_INDATAEXCHANGE + 1))
		{
			return false;
		}

		if (!CheckPN532Status(mu8_PacketBuffer[2]))
		{
			return false;
		}

		size_t responseLen = (size_t)(len - 3);
		if (*rx_len < responseLen)
		{
			return false;
		}

		memcpy(rx, &mu8_PacketBuffer[3], responseLen);
		*rx_len = responseLen;
		return true;
	}
};

SecurePn532Transport gPn532;
bool gPn532Ready = false;
bool gLastCardIsDesfire = false;
char gLastUidHex[32] = "";

void storeUidHex(const byte *uidBuffer, byte uidLength)
{
	size_t cursor = 0;
	for (byte i = 0; i < uidLength && cursor + 2 < sizeof(gLastUidHex); ++i)
	{
		snprintf(&gLastUidHex[cursor], sizeof(gLastUidHex) - cursor, "%02X", uidBuffer[i]);
		cursor += 2;
	}
	gLastUidHex[cursor] = '\0';
}
} // namespace

bool pn532_init()
{
	gPn532.InitSoftwareSPI(
		(byte)config.secureReader.pn532SckPin,
		(byte)config.secureReader.pn532MisoPin,
		(byte)config.secureReader.pn532MosiPin,
		(byte)config.secureReader.pn532SsPin,
		(byte)config.secureReader.pn532ResetPin);
#ifdef DEBUG
	gPn532.SetDebugLevel(0);
#else
	gPn532.SetDebugLevel(0);
#endif
	gPn532.begin();

	byte chip = 0;
	byte versionHi = 0;
	byte versionLo = 0;
	byte flags = 0;
	gPn532Ready = gPn532.GetFirmwareVersion(&chip, &versionHi, &versionLo, &flags) && gPn532.SamConfig() && gPn532.SetPassiveActivationRetries();
	return gPn532Ready;
}

bool pn532_wait_for_card(uint32_t timeout_ms)
{
	if (!gPn532Ready)
	{
		return false;
	}

	unsigned long started = millis();
	do
	{
		byte uidBuffer[8] = {0};
		byte uidLength = 0;
		eCardType cardType = CARD_Unknown;
		bool found = gPn532.ReadPassiveTargetID(uidBuffer, &uidLength, &cardType);
		if (found)
		{
			gLastCardIsDesfire = (cardType == CARD_Desfire || cardType == CARD_DesRandom);
			storeUidHex(uidBuffer, uidLength);
			return true;
		}
		yield();
	} while (timeout_ms > 0 && (millis() - started) < timeout_ms);

	gLastUidHex[0] = '\0';
	gLastCardIsDesfire = false;
	return false;
}

bool pn532_transceive_apdu(const uint8_t *tx, size_t tx_len, uint8_t *rx, size_t *rx_len)
{
	if (!gPn532Ready)
	{
		return false;
	}
	return gPn532.transceive(tx, tx_len, rx, rx_len);
}

void pn532_release_card()
{
	if (!gPn532Ready)
	{
		return;
	}
	gPn532.ReleaseCard();
	gPn532.SwitchOffRfField();
}

bool pn532_last_card_is_desfire()
{
	return gLastCardIsDesfire;
}

void pn532_get_last_uid_hex(char *out_uid, size_t out_len)
{
	if (out_uid == NULL || out_len == 0)
	{
		return;
	}
	strlcpy(out_uid, gLastUidHex, out_len);
}
