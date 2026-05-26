#include "Arduino.h"
#include "desfire.h"

#if defined(ESP32)
#include "esp_system.h"
#include "mbedtls/aes.h"
#include "mbedtls/platform_util.h"
#endif

namespace
{
DesfireTransceiveFn gTransport = NULL;
DesfireStatus gLastStatus = DESFIRE_STATUS_TRANSPORT_ERROR;
bool gAuthenticated = false;
uint8_t gLegacySessionKey[16] = {0};
uint8_t gSessionEncKey[16] = {0};
uint8_t gSessionMacKey[16] = {0};
uint8_t gTransactionIdentifier[4] = {0};
uint16_t gCommandCounter = 0;
DesfireCommunicationMode gCommunicationMode = DESFIRE_COMM_MODE_PLAIN;
const size_t DESFIRE_SECURE_RESPONSE_CAPACITY = 192;
const size_t DESFIRE_SECURE_COMMAND_CAPACITY = 32;

const uint8_t DESFIRE_STATUS_OPERATION_OK = 0x00;
const uint8_t DESFIRE_STATUS_ADDITIONAL_FRAME = 0xAF;
const uint8_t DESFIRE_STATUS_PERMISSION_DENIED = 0x9D;
const uint8_t DESFIRE_STATUS_AUTHENTICATION_ERROR = 0xAE;

const uint8_t DESFIRE_CMD_SELECT_APPLICATION = 0x5A;
const uint8_t DESFIRE_CMD_AUTHENTICATE_AES = 0xAA;
const uint8_t DESFIRE_CMD_AUTHENTICATE_EV2_FIRST = 0x71;
const uint8_t DESFIRE_CMD_AUTHENTICATE_EV2_NON_FIRST = 0x77;
const uint8_t DESFIRE_CMD_ADDITIONAL_FRAME = 0xAF;
const uint8_t DESFIRE_CMD_GET_FILE_IDS = 0x6F;
const uint8_t DESFIRE_CMD_GET_FILE_SETTINGS = 0xF5;
const uint8_t DESFIRE_CMD_READ_DATA = 0xBD;

enum DesfireAuthScheme
{
	DESFIRE_AUTH_NONE = 0,
	DESFIRE_AUTH_LEGACY_AES,
	DESFIRE_AUTH_EV2_AES,
};

DesfireAuthScheme gAuthScheme = DESFIRE_AUTH_NONE;

bool isPrintableCredentialByte(uint8_t value)
{
	return value >= 0x20 && value <= 0x7E;
}

char nybbleToHex(uint8_t value)
{
	value &= 0x0FU;
	return value < 10 ? (char)('0' + value) : (char)('A' + (value - 10));
}

bool copyCredentialString(const uint8_t *data, size_t len, char *out_id, size_t out_len)
{
	if (data == NULL || out_id == NULL || out_len == 0 || len == 0)
	{
		return false;
	}

	size_t copyLen = len;
	if (copyLen >= out_len)
	{
		copyLen = out_len - 1;
	}
	memcpy(out_id, data, copyLen);
	out_id[copyLen] = '\0';
	return copyLen > 0;
}

bool copyCredentialHex(const uint8_t *data, size_t len, char *out_id, size_t out_len)
{
	if (data == NULL || out_id == NULL || out_len == 0 || len == 0 || ((len * 2) + 1) > out_len)
	{
		return false;
	}

	for (size_t i = 0; i < len; ++i)
	{
		out_id[i * 2] = nybbleToHex((uint8_t)(data[i] >> 4));
		out_id[(i * 2) + 1] = nybbleToHex(data[i]);
	}
	out_id[len * 2] = '\0';
	return true;
}

bool extractCredentialTlv(const uint8_t *data, size_t len, char *out_id, size_t out_len)
{
	if (data == NULL || out_id == NULL || out_len == 0)
	{
		return false;
	}

	size_t offset = 0;
	while ((offset + 2) <= len)
	{
		uint8_t tag = data[offset++];
		uint8_t valueLen = data[offset++];
		if ((offset + valueLen) > len)
		{
			return false;
		}

		if ((tag == 0x01U || tag == 0x02U) && valueLen > 0)
		{
			bool printable = true;
			for (uint8_t i = 0; i < valueLen; ++i)
			{
				if (!isPrintableCredentialByte(data[offset + i]))
				{
					printable = false;
					break;
				}
			}

			if (printable)
			{
				return copyCredentialString(&data[offset], valueLen, out_id, out_len);
			}
			return copyCredentialHex(&data[offset], valueLen, out_id, out_len);
		}

		offset += valueLen;
	}

	return false;
}

DesfireCommunicationMode parseCommunicationMode(uint8_t rawMode)
{
	switch (rawMode & 0x03U)
	{
	case 0x01:
		return DESFIRE_COMM_MODE_MACED;
	case 0x03:
		return DESFIRE_COMM_MODE_FULL;
	case 0x00:
	default:
		return DESFIRE_COMM_MODE_PLAIN;
	}
}

void setStatus(DesfireStatus status)
{
	gLastStatus = status;
}

void secureZero(void *buffer, size_t len)
{
#if defined(ESP32)
	mbedtls_platform_zeroize(buffer, len);
#else
	volatile uint8_t *p = (volatile uint8_t *)buffer;
	while (len-- > 0)
	{
		*p++ = 0;
	}
#endif
}

void clearSession()
{
	secureZero(gLegacySessionKey, sizeof(gLegacySessionKey));
	secureZero(gSessionEncKey, sizeof(gSessionEncKey));
	secureZero(gSessionMacKey, sizeof(gSessionMacKey));
	secureZero(gTransactionIdentifier, sizeof(gTransactionIdentifier));
	gCommandCounter = 0;
	gAuthScheme = DESFIRE_AUTH_NONE;
	gAuthenticated = false;
}

void rotateLeftOne(const uint8_t *input, uint8_t *output, size_t len)
{
	if (len == 0)
	{
		return;
	}
	for (size_t i = 0; i + 1 < len; ++i)
	{
		output[i] = input[i + 1];
	}
	output[len - 1] = input[0];
}

bool equals16(const uint8_t a[16], const uint8_t b[16])
{
	uint8_t diff = 0;
	for (size_t i = 0; i < 16; ++i)
	{
		diff |= a[i] ^ b[i];
	}
	return diff == 0;
}

bool sendNativeCommand(const uint8_t *command, size_t commandLen, uint8_t *data, size_t *dataLen, uint8_t *status)
{
	if (gTransport == NULL || command == NULL || commandLen == 0 || dataLen == NULL || status == NULL)
	{
		setStatus(DESFIRE_STATUS_TRANSPORT_ERROR);
		return false;
	}

	uint8_t response[80] = {0};
	size_t responseLen = sizeof(response);
	if (!gTransport(command, commandLen, response, &responseLen))
	{
		setStatus(DESFIRE_STATUS_TRANSPORT_ERROR);
		return false;
	}

	if (responseLen < 1)
	{
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
		return false;
	}

	*status = response[0];
	size_t payloadLen = responseLen - 1;
	if (*dataLen < payloadLen)
	{
		setStatus(DESFIRE_STATUS_BUFFER_TOO_SMALL);
		return false;
	}

	if (payloadLen > 0 && data != NULL)
	{
		memcpy(data, &response[1], payloadLen);
	}
	*dataLen = payloadLen;
	return true;
}

bool mapReadResponseStatus(uint8_t status, bool invalidateSession)
{
	if (status == DESFIRE_STATUS_OPERATION_OK)
	{
		return true;
	}

	if (invalidateSession)
	{
		clearSession();
	}

	if (status == DESFIRE_STATUS_AUTHENTICATION_ERROR || status == DESFIRE_STATUS_PERMISSION_DENIED)
	{
		setStatus(DESFIRE_STATUS_AUTH_REQUIRED);
	}
	else if (status == DESFIRE_STATUS_ADDITIONAL_FRAME)
	{
		setStatus(DESFIRE_STATUS_NOT_IMPLEMENTED);
	}
	else
	{
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
	}
	return false;
}

bool mapCommandResponseStatus(uint8_t status, bool invalidateSession)
{
	return mapReadResponseStatus(status, invalidateSession);
}

bool appendPayload(const uint8_t *payload, size_t payloadLen, uint8_t *out, size_t outCapacity, size_t *outOffset)
{
	if (out == NULL || outOffset == NULL || *outOffset > outCapacity || payloadLen > (outCapacity - *outOffset))
	{
		setStatus(DESFIRE_STATUS_BUFFER_TOO_SMALL);
		return false;
	}

	if (payloadLen > 0)
	{
		memcpy(&out[*outOffset], payload, payloadLen);
		*outOffset += payloadLen;
	}
	return true;
}

bool collectNativeResponse(const uint8_t *command, size_t commandLen, uint8_t *out, size_t outCapacity, size_t *outLen, uint8_t *finalStatus)
{
	if (command == NULL || out == NULL || outLen == NULL || finalStatus == NULL)
	{
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
		return false;
	}

	size_t total = 0;
	uint8_t status = 0;
	uint8_t payload[80] = {0};
	size_t payloadLen = sizeof(payload);

	if (!sendNativeCommand(command, commandLen, payload, &payloadLen, &status))
	{
		return false;
	}
	if (!appendPayload(payload, payloadLen, out, outCapacity, &total))
	{
		return false;
	}

	while (status == DESFIRE_STATUS_ADDITIONAL_FRAME)
	{
		uint8_t moreCommand[1] = {DESFIRE_CMD_ADDITIONAL_FRAME};
		payloadLen = sizeof(payload);
		if (!sendNativeCommand(moreCommand, sizeof(moreCommand), payload, &payloadLen, &status))
		{
			return false;
		}
		if (!appendPayload(payload, payloadLen, out, outCapacity, &total))
		{
			return false;
		}
		yield();
	}

	*finalStatus = status;
	*outLen = total;
	return true;
}

bool nativeReadChained(const uint8_t *command, size_t commandLen, uint8_t *out, size_t *outLen)
{
	if (out == NULL || outLen == NULL)
	{
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
		return false;
	}

	size_t capacity = *outLen;
	uint8_t status = 0;
	if (!collectNativeResponse(command, commandLen, out, capacity, outLen, &status))
	{
		return false;
	}

	if (!mapReadResponseStatus(status, false))
	{
		return false;
	}
	return true;
}

bool parseFileSettingsPayload(const uint8_t *response, size_t responseLen, DesfireFileSettings *outSettings);

#if defined(ESP32)
void xorBlock(const uint8_t left[16], const uint8_t right[16], uint8_t out[16])
{
	for (size_t i = 0; i < 16; ++i)
	{
		out[i] = left[i] ^ right[i];
	}
}

void leftShiftBlock(const uint8_t input[16], uint8_t output[16])
{
	uint8_t carry = 0;
	for (int i = 15; i >= 0; --i)
	{
		uint8_t nextCarry = (uint8_t)((input[i] & 0x80U) ? 1U : 0U);
		output[i] = (uint8_t)((input[i] << 1) | carry);
		carry = nextCarry;
	}
}

bool aesEcbEncrypt(const uint8_t key[16], const uint8_t input[16], uint8_t output[16])
{
	mbedtls_aes_context ctx;
	mbedtls_aes_init(&ctx);
	int rc = mbedtls_aes_setkey_enc(&ctx, key, 128);
	if (rc == 0)
	{
		rc = mbedtls_aes_crypt_ecb(&ctx, MBEDTLS_AES_ENCRYPT, input, output);
	}
	mbedtls_aes_free(&ctx);

	if (rc != 0)
	{
		setStatus(DESFIRE_STATUS_CRYPTO_ERROR);
		return false;
	}
	return true;
}

bool aesCbc(const uint8_t key[16], const uint8_t ivIn[16], const uint8_t *input, size_t len, uint8_t *output, bool encrypt)
{
	if (key == NULL || ivIn == NULL || input == NULL || output == NULL || len == 0 || (len % 16) != 0)
	{
		setStatus(DESFIRE_STATUS_CRYPTO_ERROR);
		return false;
	}

	mbedtls_aes_context ctx;
	mbedtls_aes_init(&ctx);
	int rc = encrypt ? mbedtls_aes_setkey_enc(&ctx, key, 128) : mbedtls_aes_setkey_dec(&ctx, key, 128);
	if (rc == 0)
	{
		uint8_t iv[16] = {0};
		memcpy(iv, ivIn, sizeof(iv));
		rc = mbedtls_aes_crypt_cbc(&ctx, encrypt ? MBEDTLS_AES_ENCRYPT : MBEDTLS_AES_DECRYPT, len, iv, input, output);
		secureZero(iv, sizeof(iv));
	}
	mbedtls_aes_free(&ctx);

	if (rc != 0)
	{
		setStatus(DESFIRE_STATUS_CRYPTO_ERROR);
		return false;
	}
	return true;
}

bool aesCmac(const uint8_t key[16], const uint8_t *input, size_t len, uint8_t output[16])
{
	if (key == NULL || output == NULL || (input == NULL && len != 0))
	{
		setStatus(DESFIRE_STATUS_CRYPTO_ERROR);
		return false;
	}

	uint8_t l[16] = {0};
	uint8_t k1[16] = {0};
	uint8_t k2[16] = {0};
	uint8_t zeroBlock[16] = {0};
	uint8_t rb[16] = {0};
	rb[15] = 0x87;

	if (!aesEcbEncrypt(key, zeroBlock, l))
	{
		return false;
	}

	leftShiftBlock(l, k1);
	if ((l[0] & 0x80U) != 0)
	{
		xorBlock(k1, rb, k1);
	}

	leftShiftBlock(k1, k2);
	if ((k1[0] & 0x80U) != 0)
	{
		xorBlock(k2, rb, k2);
	}

	size_t blockCount = (len == 0) ? 1 : ((len + 15) / 16);
	bool completeLastBlock = (len != 0) && ((len % 16) == 0);
	uint8_t lastBlock[16] = {0};
	if (completeLastBlock)
	{
		memcpy(lastBlock, &input[(blockCount - 1) * 16], 16);
		xorBlock(lastBlock, k1, lastBlock);
	}
	else
	{
		size_t remainder = (len == 0) ? 0 : (len % 16);
		if (remainder > 0)
		{
			memcpy(lastBlock, &input[(blockCount - 1) * 16], remainder);
		}
		lastBlock[remainder] = 0x80;
		xorBlock(lastBlock, k2, lastBlock);
	}

	uint8_t x[16] = {0};
	uint8_t y[16] = {0};
	for (size_t i = 0; i + 1 < blockCount; ++i)
	{
		xorBlock(x, &input[i * 16], y);
		if (!aesEcbEncrypt(key, y, x))
		{
			return false;
		}
	}

	xorBlock(x, lastBlock, y);
	if (!aesEcbEncrypt(key, y, output))
	{
		return false;
	}

	return true;
}

void truncateSecureMac(const uint8_t fullMac[16], uint8_t truncatedMac[8])
{
	// AN12343 says "even bytes"; in code that maps to 1-based indexing, so we keep
	// every second byte starting from byte 2, i.e. odd indexes in a 0-based array.
	for (size_t i = 0; i < 8; ++i)
	{
		truncatedMac[i] = fullMac[(i * 2) + 1];
	}
}

bool computeSecureMac(const uint8_t key[16], const uint8_t *input, size_t len, uint8_t output[8])
{
	uint8_t fullMac[16] = {0};
	if (!aesCmac(key, input, len, fullMac))
	{
		return false;
	}
	truncateSecureMac(fullMac, output);
	secureZero(fullMac, sizeof(fullMac));
	return true;
}

void deriveLegacySessionKey(const uint8_t rndA[16], const uint8_t rndB[16], uint8_t sessionKey[16])
{
	memcpy(&sessionKey[0], &rndA[0], 4);
	memcpy(&sessionKey[4], &rndB[0], 4);
	memcpy(&sessionKey[8], &rndA[12], 4);
	memcpy(&sessionKey[12], &rndB[12], 4);
}

bool deriveEv2SessionKeys(const uint8_t authKey[16], const uint8_t rndA[16], const uint8_t rndB[16], uint8_t encKey[16], uint8_t macKey[16])
{
	uint8_t sharedXor[6] = {0};
	for (size_t i = 0; i < sizeof(sharedXor); ++i)
	{
		sharedXor[i] = rndA[2 + i] ^ rndB[i];
	}

	uint8_t svMac[32] = {
		0x5A, 0xA5, 0x00, 0x01, 0x00, 0x80,
	};
	uint8_t svEnc[32] = {
		0xA5, 0x5A, 0x00, 0x01, 0x00, 0x80,
	};

	svMac[6] = rndA[0];
	svMac[7] = rndA[1];
	svEnc[6] = rndA[0];
	svEnc[7] = rndA[1];
	memcpy(&svMac[8], sharedXor, sizeof(sharedXor));
	memcpy(&svEnc[8], sharedXor, sizeof(sharedXor));
	memcpy(&svMac[14], &rndB[6], 10);
	memcpy(&svEnc[14], &rndB[6], 10);
	memcpy(&svMac[24], &rndA[8], 8);
	memcpy(&svEnc[24], &rndA[8], 8);

	return aesCmac(authKey, svEnc, sizeof(svEnc), encKey) &&
		   aesCmac(authKey, svMac, sizeof(svMac), macKey);
}

bool buildEv2ResponseIv(uint16_t commandCounter, uint8_t outIv[16])
{
	uint8_t ivInput[16] = {
		0x5A,
		0xA5,
		gTransactionIdentifier[0],
		gTransactionIdentifier[1],
		gTransactionIdentifier[2],
		gTransactionIdentifier[3],
		(uint8_t)(commandCounter & 0xFFU),
		(uint8_t)((commandCounter >> 8) & 0xFFU),
		0x00,
		0x00,
		0x00,
		0x00,
		0x00,
		0x00,
		0x00,
		0x00,
	};

	bool ok = aesEcbEncrypt(gSessionEncKey, ivInput, outIv);
	secureZero(ivInput, sizeof(ivInput));
	return ok;
}

bool removeIso9797Method2Padding(uint8_t *buffer, size_t *len)
{
	if (buffer == NULL || len == NULL || *len == 0)
	{
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
		return false;
	}

	size_t cursor = *len;
	while (cursor > 0 && buffer[cursor - 1] == 0x00)
	{
		cursor--;
	}
	if (cursor == 0 || buffer[cursor - 1] != 0x80)
	{
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
		return false;
	}

	*len = cursor - 1;
	return true;
}

bool buildSecureCommand(uint8_t instruction, uint16_t commandCounter, const uint8_t *header, size_t headerLen, const uint8_t *data, size_t dataLen, uint8_t *command, size_t *commandLen);

bool buildSecureReadCommand(uint8_t fileId, uint16_t commandCounter, uint8_t *command, size_t *commandLen)
{
	const uint8_t header[7] = {
		fileId,
		0x00,
		0x00,
		0x00,
		0x00,
		0x00,
		0x00,
	};
	return buildSecureCommand(DESFIRE_CMD_READ_DATA, commandCounter, header, sizeof(header), NULL, 0, command, commandLen);
}

bool buildSecureCommand(uint8_t instruction, uint16_t commandCounter, const uint8_t *header, size_t headerLen, const uint8_t *data, size_t dataLen, uint8_t *command, size_t *commandLen)
{
	if (command == NULL || commandLen == NULL)
	{
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
		return false;
	}

	const size_t totalLen = 1 + headerLen + dataLen + 8;
	if ((header == NULL && headerLen > 0) || (data == NULL && dataLen > 0) || *commandLen < totalLen || totalLen > DESFIRE_SECURE_COMMAND_CAPACITY)
	{
		setStatus(DESFIRE_STATUS_BUFFER_TOO_SMALL);
		return false;
	}

	uint8_t macInput[DESFIRE_SECURE_COMMAND_CAPACITY] = {0};
	size_t macInputLen = 0;
	macInput[macInputLen++] = instruction;
	macInput[macInputLen++] = (uint8_t)(commandCounter & 0xFFU);
	macInput[macInputLen++] = (uint8_t)((commandCounter >> 8) & 0xFFU);
	memcpy(&macInput[macInputLen], gTransactionIdentifier, sizeof(gTransactionIdentifier));
	macInputLen += sizeof(gTransactionIdentifier);
	if (headerLen > 0)
	{
		memcpy(&macInput[macInputLen], header, headerLen);
		macInputLen += headerLen;
	}
	if (dataLen > 0)
	{
		memcpy(&macInput[macInputLen], data, dataLen);
		macInputLen += dataLen;
	}

	uint8_t mac[8] = {0};
	if (!computeSecureMac(gSessionMacKey, macInput, macInputLen, mac))
	{
		secureZero(macInput, sizeof(macInput));
		return false;
	}

	size_t offset = 0;
	command[offset++] = instruction;
	if (headerLen > 0)
	{
		memcpy(&command[offset], header, headerLen);
		offset += headerLen;
	}
	if (dataLen > 0)
	{
		memcpy(&command[offset], data, dataLen);
		offset += dataLen;
	}
	memcpy(&command[offset], mac, sizeof(mac));
	offset += sizeof(mac);
	*commandLen = offset;

	secureZero(macInput, sizeof(macInput));
	secureZero(mac, sizeof(mac));
	return true;
}

bool parseFileSettingsPayload(const uint8_t *response, size_t responseLen, DesfireFileSettings *outSettings)
{
	if (response == NULL || outSettings == NULL || responseLen < 4)
	{
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
		return false;
	}

	memset(outSettings, 0, sizeof(*outSettings));
	outSettings->fileType = response[0];
	outSettings->rawCommunicationSettings = response[1];
	outSettings->communicationMode = parseCommunicationMode(response[1]);
	outSettings->accessRights = (uint16_t)response[2] | ((uint16_t)response[3] << 8);
	if (responseLen >= 7 && (outSettings->fileType == 0x00 || outSettings->fileType == 0x01))
	{
		outSettings->fileSize = (uint32_t)response[4] |
								((uint32_t)response[5] << 8) |
								((uint32_t)response[6] << 16);
		outSettings->hasFileSize = true;
	}

	setStatus(DESFIRE_STATUS_OK);
	return true;
}

bool verifySecureReadResponseMac(uint8_t responseCode, uint16_t commandCounter, const uint8_t *responseData, size_t responseDataLen, const uint8_t responseMac[8])
{
	if (responseData == NULL || responseMac == NULL)
	{
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
		return false;
	}

	if (responseDataLen > DESFIRE_SECURE_RESPONSE_CAPACITY)
	{
		setStatus(DESFIRE_STATUS_BUFFER_TOO_SMALL);
		return false;
	}

	uint8_t macInput[1 + 2 + 4 + DESFIRE_SECURE_RESPONSE_CAPACITY] = {0};
	size_t macInputLen = 0;
	macInput[macInputLen++] = responseCode;
	macInput[macInputLen++] = (uint8_t)(commandCounter & 0xFFU);
	macInput[macInputLen++] = (uint8_t)((commandCounter >> 8) & 0xFFU);
	memcpy(&macInput[macInputLen], gTransactionIdentifier, sizeof(gTransactionIdentifier));
	macInputLen += sizeof(gTransactionIdentifier);
	if (responseDataLen > 0)
	{
		memcpy(&macInput[macInputLen], responseData, responseDataLen);
		macInputLen += responseDataLen;
	}

	uint8_t expectedMac[8] = {0};
	if (!computeSecureMac(gSessionMacKey, macInput, macInputLen, expectedMac))
	{
		secureZero(macInput, sizeof(macInput));
		return false;
	}

	uint8_t diff = 0;
	for (size_t i = 0; i < sizeof(expectedMac); ++i)
	{
		diff |= expectedMac[i] ^ responseMac[i];
	}

	secureZero(macInput, sizeof(macInput));
	secureZero(expectedMac, sizeof(expectedMac));

	if (diff != 0)
	{
		setStatus(DESFIRE_STATUS_CRYPTO_ERROR);
		return false;
	}

	return true;
}

bool copyResponseData(const uint8_t *input, size_t inputLen, uint8_t *out, size_t *outLen)
{
	if (out == NULL || outLen == NULL || *outLen < inputLen)
	{
		setStatus(DESFIRE_STATUS_BUFFER_TOO_SMALL);
		return false;
	}

	if (inputLen > 0)
	{
		memcpy(out, input, inputLen);
	}
	*outLen = inputLen;
	return true;
}

bool decryptSecureReadResponse(uint16_t commandCounter, const uint8_t *encryptedData, size_t encryptedDataLen, uint8_t *out, size_t *outLen)
{
	if (encryptedData == NULL || out == NULL || outLen == NULL || encryptedDataLen == 0 || (encryptedDataLen % 16) != 0)
	{
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
		return false;
	}
	if (encryptedDataLen > DESFIRE_SECURE_RESPONSE_CAPACITY)
	{
		setStatus(DESFIRE_STATUS_BUFFER_TOO_SMALL);
		return false;
	}

	uint8_t responseIv[16] = {0};
	if (!buildEv2ResponseIv(commandCounter, responseIv))
	{
		return false;
	}

	uint8_t plainData[DESFIRE_SECURE_RESPONSE_CAPACITY] = {0};
	if (!aesCbc(gSessionEncKey, responseIv, encryptedData, encryptedDataLen, plainData, false))
	{
		secureZero(responseIv, sizeof(responseIv));
		secureZero(plainData, sizeof(plainData));
		return false;
	}

	size_t plainLen = encryptedDataLen;
	bool ok = removeIso9797Method2Padding(plainData, &plainLen) && copyResponseData(plainData, plainLen, out, outLen);
	secureZero(responseIv, sizeof(responseIv));
	secureZero(plainData, sizeof(plainData));
	return ok;
}

bool readFileSecureEv2(uint8_t fileId, uint8_t *out, size_t *outLen)
{
	if (out == NULL || outLen == NULL || *outLen == 0)
	{
		setStatus(DESFIRE_STATUS_BUFFER_TOO_SMALL);
		return false;
	}

	uint8_t command[16] = {0};
	size_t commandLen = sizeof(command);
	if (!buildSecureReadCommand(fileId, gCommandCounter, command, &commandLen))
	{
		return false;
	}

	uint8_t payload[DESFIRE_SECURE_RESPONSE_CAPACITY] = {0};
	size_t payloadLen = sizeof(payload);
	uint8_t responseCode = 0;
	if (!collectNativeResponse(command, commandLen, payload, sizeof(payload), &payloadLen, &responseCode))
	{
		secureZero(command, sizeof(command));
		secureZero(payload, sizeof(payload));
		return false;
	}

	uint16_t responseCounter = (uint16_t)(gCommandCounter + 1);
	gCommandCounter = responseCounter;

	if (!mapReadResponseStatus(responseCode, true))
	{
		secureZero(command, sizeof(command));
		secureZero(payload, sizeof(payload));
		return false;
	}

	if (payloadLen < 8)
	{
		clearSession();
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
		secureZero(command, sizeof(command));
		secureZero(payload, sizeof(payload));
		return false;
	}

	const size_t dataLen = payloadLen - 8;
	const uint8_t *responseData = payload;
	const uint8_t *responseMac = &payload[dataLen];

	if (!verifySecureReadResponseMac(responseCode, responseCounter, responseData, dataLen, responseMac))
	{
		clearSession();
		secureZero(command, sizeof(command));
		secureZero(payload, sizeof(payload));
		return false;
	}

	bool ok = false;
	if (gCommunicationMode == DESFIRE_COMM_MODE_MACED)
	{
		ok = copyResponseData(responseData, dataLen, out, outLen);
	}
	else
	{
		ok = decryptSecureReadResponse(responseCounter, responseData, dataLen, out, outLen);
	}

	if (!ok)
	{
		clearSession();
	}

	secureZero(command, sizeof(command));
	secureZero(payload, sizeof(payload));
	return ok;
}

bool getFileSettingsSecureEv2(uint8_t fileId, DesfireFileSettings *outSettings)
{
	if (outSettings == NULL)
	{
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
		return false;
	}

	const uint8_t header[1] = {fileId};
	uint8_t command[DESFIRE_SECURE_COMMAND_CAPACITY] = {0};
	size_t commandLen = sizeof(command);
	if (!buildSecureCommand(DESFIRE_CMD_GET_FILE_SETTINGS, gCommandCounter, header, sizeof(header), NULL, 0, command, &commandLen))
	{
		return false;
	}

	uint8_t payload[DESFIRE_SECURE_RESPONSE_CAPACITY] = {0};
	size_t payloadLen = sizeof(payload);
	uint8_t responseCode = 0;
	if (!collectNativeResponse(command, commandLen, payload, sizeof(payload), &payloadLen, &responseCode))
	{
		secureZero(command, sizeof(command));
		secureZero(payload, sizeof(payload));
		return false;
	}

	uint16_t responseCounter = (uint16_t)(gCommandCounter + 1);
	gCommandCounter = responseCounter;

	if (!mapCommandResponseStatus(responseCode, true))
	{
		secureZero(command, sizeof(command));
		secureZero(payload, sizeof(payload));
		return false;
	}

	if (payloadLen < 8)
	{
		clearSession();
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
		secureZero(command, sizeof(command));
		secureZero(payload, sizeof(payload));
		return false;
	}

	const size_t dataLen = payloadLen - 8;
	const uint8_t *responseData = payload;
	const uint8_t *responseMac = &payload[dataLen];
	if (!verifySecureReadResponseMac(responseCode, responseCounter, responseData, dataLen, responseMac))
	{
		clearSession();
		secureZero(command, sizeof(command));
		secureZero(payload, sizeof(payload));
		return false;
	}

	bool ok = parseFileSettingsPayload(responseData, dataLen, outSettings);
	if (!ok)
	{
		clearSession();
	}

	secureZero(command, sizeof(command));
	secureZero(payload, sizeof(payload));
	return ok;
}

bool getFileIdsSecureEv2(uint8_t *outIds, size_t *inoutCount)
{
	if (outIds == NULL || inoutCount == NULL)
	{
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
		return false;
	}

	uint8_t command[DESFIRE_SECURE_COMMAND_CAPACITY] = {0};
	size_t commandLen = sizeof(command);
	if (!buildSecureCommand(DESFIRE_CMD_GET_FILE_IDS, gCommandCounter, NULL, 0, NULL, 0, command, &commandLen))
	{
		return false;
	}

	uint8_t payload[DESFIRE_SECURE_RESPONSE_CAPACITY] = {0};
	size_t payloadLen = sizeof(payload);
	uint8_t responseCode = 0;
	if (!collectNativeResponse(command, commandLen, payload, sizeof(payload), &payloadLen, &responseCode))
	{
		secureZero(command, sizeof(command));
		secureZero(payload, sizeof(payload));
		return false;
	}

	uint16_t responseCounter = (uint16_t)(gCommandCounter + 1);
	gCommandCounter = responseCounter;

	if (!mapCommandResponseStatus(responseCode, true))
	{
		secureZero(command, sizeof(command));
		secureZero(payload, sizeof(payload));
		return false;
	}

	if (payloadLen < 8)
	{
		clearSession();
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
		secureZero(command, sizeof(command));
		secureZero(payload, sizeof(payload));
		return false;
	}

	const size_t dataLen = payloadLen - 8;
	const uint8_t *responseData = payload;
	const uint8_t *responseMac = &payload[dataLen];
	if (!verifySecureReadResponseMac(responseCode, responseCounter, responseData, dataLen, responseMac))
	{
		clearSession();
		secureZero(command, sizeof(command));
		secureZero(payload, sizeof(payload));
		return false;
	}

	if (*inoutCount < dataLen)
	{
		setStatus(DESFIRE_STATUS_BUFFER_TOO_SMALL);
		secureZero(command, sizeof(command));
		secureZero(payload, sizeof(payload));
		return false;
	}

	if (dataLen > 0)
	{
		memcpy(outIds, responseData, dataLen);
	}
	*inoutCount = dataLen;

	setStatus(DESFIRE_STATUS_OK);
	secureZero(command, sizeof(command));
	secureZero(payload, sizeof(payload));
	return true;
}

bool authenticateEv2First(uint8_t keyNo, const uint8_t key[16])
{
	uint8_t status = 0;
	uint8_t encryptedRndB[16] = {0};
	size_t encryptedRndBLen = sizeof(encryptedRndB);
	uint8_t authCommand[3] = {DESFIRE_CMD_AUTHENTICATE_EV2_FIRST, keyNo, 0x00};
	if (!sendNativeCommand(authCommand, sizeof(authCommand), encryptedRndB, &encryptedRndBLen, &status))
	{
		return false;
	}
	if (status != DESFIRE_STATUS_ADDITIONAL_FRAME || encryptedRndBLen != sizeof(encryptedRndB))
	{
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
		return false;
	}

	uint8_t zeroIv[16] = {0};
	uint8_t rndB[16] = {0};
	if (!aesCbc(key, zeroIv, encryptedRndB, sizeof(encryptedRndB), rndB, false))
	{
		return false;
	}

	uint8_t rndA[16] = {0};
	esp_fill_random(rndA, sizeof(rndA));
	uint8_t rndBRot[16] = {0};
	rotateLeftOne(rndB, rndBRot, sizeof(rndBRot));

	uint8_t plainChallenge[32] = {0};
	memcpy(&plainChallenge[0], rndA, sizeof(rndA));
	memcpy(&plainChallenge[16], rndBRot, sizeof(rndBRot));

	uint8_t encryptedChallenge[32] = {0};
	if (!aesCbc(key, zeroIv, plainChallenge, sizeof(plainChallenge), encryptedChallenge, true))
	{
		secureZero(rndA, sizeof(rndA));
		secureZero(rndB, sizeof(rndB));
		secureZero(rndBRot, sizeof(rndBRot));
		secureZero(plainChallenge, sizeof(plainChallenge));
		return false;
	}

	uint8_t continueCommand[33] = {DESFIRE_CMD_ADDITIONAL_FRAME};
	memcpy(&continueCommand[1], encryptedChallenge, sizeof(encryptedChallenge));

	uint8_t responsePart2[32] = {0};
	size_t responsePart2Len = sizeof(responsePart2);
	if (!sendNativeCommand(continueCommand, sizeof(continueCommand), responsePart2, &responsePart2Len, &status))
	{
		secureZero(rndA, sizeof(rndA));
		secureZero(rndB, sizeof(rndB));
		secureZero(rndBRot, sizeof(rndBRot));
		secureZero(plainChallenge, sizeof(plainChallenge));
		return false;
	}
	if (status != DESFIRE_STATUS_OPERATION_OK || responsePart2Len != sizeof(responsePart2))
	{
		secureZero(rndA, sizeof(rndA));
		secureZero(rndB, sizeof(rndB));
		secureZero(rndBRot, sizeof(rndBRot));
		secureZero(plainChallenge, sizeof(plainChallenge));
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
		return false;
	}

	uint8_t plainPart2[32] = {0};
	if (!aesCbc(key, zeroIv, responsePart2, sizeof(responsePart2), plainPart2, false))
	{
		secureZero(rndA, sizeof(rndA));
		secureZero(rndB, sizeof(rndB));
		secureZero(rndBRot, sizeof(rndBRot));
		secureZero(plainChallenge, sizeof(plainChallenge));
		return false;
	}

	uint8_t expectedRndARot[16] = {0};
	rotateLeftOne(rndA, expectedRndARot, sizeof(expectedRndARot));
	if (!equals16(&plainPart2[4], expectedRndARot))
	{
		secureZero(rndA, sizeof(rndA));
		secureZero(rndB, sizeof(rndB));
		secureZero(rndBRot, sizeof(rndBRot));
		secureZero(plainChallenge, sizeof(plainChallenge));
		secureZero(plainPart2, sizeof(plainPart2));
		secureZero(expectedRndARot, sizeof(expectedRndARot));
		setStatus(DESFIRE_STATUS_CRYPTO_ERROR);
		return false;
	}

	if (!deriveEv2SessionKeys(key, rndA, rndB, gSessionEncKey, gSessionMacKey))
	{
		secureZero(rndA, sizeof(rndA));
		secureZero(rndB, sizeof(rndB));
		secureZero(rndBRot, sizeof(rndBRot));
		secureZero(plainChallenge, sizeof(plainChallenge));
		secureZero(plainPart2, sizeof(plainPart2));
		secureZero(expectedRndARot, sizeof(expectedRndARot));
		return false;
	}

	memcpy(gTransactionIdentifier, plainPart2, sizeof(gTransactionIdentifier));
	gCommandCounter = 0;
	gAuthScheme = DESFIRE_AUTH_EV2_AES;
	gAuthenticated = true;

	secureZero(rndA, sizeof(rndA));
	secureZero(rndB, sizeof(rndB));
	secureZero(rndBRot, sizeof(rndBRot));
	secureZero(plainChallenge, sizeof(plainChallenge));
	secureZero(encryptedChallenge, sizeof(encryptedChallenge));
	secureZero(plainPart2, sizeof(plainPart2));
	secureZero(expectedRndARot, sizeof(expectedRndARot));

	setStatus(DESFIRE_STATUS_OK);
	return true;
}

bool authenticateEv2NonFirst(uint8_t keyNo, const uint8_t key[16])
{
	uint16_t preservedCommandCounter = gCommandCounter;
	uint8_t preservedTransactionIdentifier[4] = {0};
	memcpy(preservedTransactionIdentifier, gTransactionIdentifier, sizeof(preservedTransactionIdentifier));

	uint8_t status = 0;
	uint8_t encryptedRndB[16] = {0};
	size_t encryptedRndBLen = sizeof(encryptedRndB);
	uint8_t authCommand[2] = {DESFIRE_CMD_AUTHENTICATE_EV2_NON_FIRST, keyNo};
	if (!sendNativeCommand(authCommand, sizeof(authCommand), encryptedRndB, &encryptedRndBLen, &status))
	{
		clearSession();
		return false;
	}
	if (status != DESFIRE_STATUS_ADDITIONAL_FRAME || encryptedRndBLen != sizeof(encryptedRndB))
	{
		clearSession();
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
		return false;
	}

	uint8_t zeroIv[16] = {0};
	uint8_t rndB[16] = {0};
	if (!aesCbc(key, zeroIv, encryptedRndB, sizeof(encryptedRndB), rndB, false))
	{
		clearSession();
		return false;
	}

	uint8_t rndA[16] = {0};
	esp_fill_random(rndA, sizeof(rndA));
	uint8_t rndBRot[16] = {0};
	rotateLeftOne(rndB, rndBRot, sizeof(rndBRot));

	uint8_t plainChallenge[32] = {0};
	memcpy(&plainChallenge[0], rndA, sizeof(rndA));
	memcpy(&plainChallenge[16], rndBRot, sizeof(rndBRot));

	uint8_t encryptedChallenge[32] = {0};
	if (!aesCbc(key, zeroIv, plainChallenge, sizeof(plainChallenge), encryptedChallenge, true))
	{
		clearSession();
		secureZero(rndA, sizeof(rndA));
		secureZero(rndB, sizeof(rndB));
		secureZero(rndBRot, sizeof(rndBRot));
		secureZero(plainChallenge, sizeof(plainChallenge));
		return false;
	}

	uint8_t continueCommand[33] = {DESFIRE_CMD_ADDITIONAL_FRAME};
	memcpy(&continueCommand[1], encryptedChallenge, sizeof(encryptedChallenge));

	uint8_t encryptedRndARot[16] = {0};
	size_t encryptedRndARotLen = sizeof(encryptedRndARot);
	if (!sendNativeCommand(continueCommand, sizeof(continueCommand), encryptedRndARot, &encryptedRndARotLen, &status))
	{
		clearSession();
		secureZero(rndA, sizeof(rndA));
		secureZero(rndB, sizeof(rndB));
		secureZero(rndBRot, sizeof(rndBRot));
		secureZero(plainChallenge, sizeof(plainChallenge));
		return false;
	}
	if (status != DESFIRE_STATUS_OPERATION_OK || encryptedRndARotLen != sizeof(encryptedRndARot))
	{
		clearSession();
		secureZero(rndA, sizeof(rndA));
		secureZero(rndB, sizeof(rndB));
		secureZero(rndBRot, sizeof(rndBRot));
		secureZero(plainChallenge, sizeof(plainChallenge));
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
		return false;
	}

	uint8_t rndARotFromCard[16] = {0};
	if (!aesCbc(key, zeroIv, encryptedRndARot, sizeof(encryptedRndARot), rndARotFromCard, false))
	{
		clearSession();
		secureZero(rndA, sizeof(rndA));
		secureZero(rndB, sizeof(rndB));
		secureZero(rndBRot, sizeof(rndBRot));
		secureZero(plainChallenge, sizeof(plainChallenge));
		return false;
	}

	uint8_t expectedRndARot[16] = {0};
	rotateLeftOne(rndA, expectedRndARot, sizeof(expectedRndARot));
	if (!equals16(rndARotFromCard, expectedRndARot))
	{
		clearSession();
		secureZero(rndA, sizeof(rndA));
		secureZero(rndB, sizeof(rndB));
		secureZero(rndBRot, sizeof(rndBRot));
		secureZero(plainChallenge, sizeof(plainChallenge));
		secureZero(rndARotFromCard, sizeof(rndARotFromCard));
		secureZero(expectedRndARot, sizeof(expectedRndARot));
		setStatus(DESFIRE_STATUS_CRYPTO_ERROR);
		return false;
	}

	if (!deriveEv2SessionKeys(key, rndA, rndB, gSessionEncKey, gSessionMacKey))
	{
		clearSession();
		secureZero(rndA, sizeof(rndA));
		secureZero(rndB, sizeof(rndB));
		secureZero(rndBRot, sizeof(rndBRot));
		secureZero(plainChallenge, sizeof(plainChallenge));
		secureZero(rndARotFromCard, sizeof(rndARotFromCard));
		secureZero(expectedRndARot, sizeof(expectedRndARot));
		return false;
	}

	memcpy(gTransactionIdentifier, preservedTransactionIdentifier, sizeof(gTransactionIdentifier));
	gCommandCounter = preservedCommandCounter;
	gAuthScheme = DESFIRE_AUTH_EV2_AES;
	gAuthenticated = true;

	secureZero(rndA, sizeof(rndA));
	secureZero(rndB, sizeof(rndB));
	secureZero(rndBRot, sizeof(rndBRot));
	secureZero(plainChallenge, sizeof(plainChallenge));
	secureZero(encryptedChallenge, sizeof(encryptedChallenge));
	secureZero(rndARotFromCard, sizeof(rndARotFromCard));
	secureZero(expectedRndARot, sizeof(expectedRndARot));
	secureZero(preservedTransactionIdentifier, sizeof(preservedTransactionIdentifier));

	setStatus(DESFIRE_STATUS_OK);
	return true;
}

bool authenticateLegacyAes(uint8_t keyNo, const uint8_t key[16])
{
	uint8_t status = 0;
	uint8_t encryptedRndB[16] = {0};
	size_t encryptedRndBLen = sizeof(encryptedRndB);
	uint8_t authCommand[2] = {DESFIRE_CMD_AUTHENTICATE_AES, keyNo};
	if (!sendNativeCommand(authCommand, sizeof(authCommand), encryptedRndB, &encryptedRndBLen, &status))
	{
		return false;
	}
	if (status != DESFIRE_STATUS_ADDITIONAL_FRAME || encryptedRndBLen != sizeof(encryptedRndB))
	{
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
		return false;
	}

	uint8_t zeroIv[16] = {0};
	uint8_t rndB[16] = {0};
	if (!aesCbc(key, zeroIv, encryptedRndB, sizeof(encryptedRndB), rndB, false))
	{
		return false;
	}

	uint8_t rndA[16] = {0};
	esp_fill_random(rndA, sizeof(rndA));
	uint8_t rndBRot[16] = {0};
	rotateLeftOne(rndB, rndBRot, sizeof(rndBRot));

	uint8_t plainChallenge[32] = {0};
	memcpy(&plainChallenge[0], rndA, sizeof(rndA));
	memcpy(&plainChallenge[16], rndBRot, sizeof(rndBRot));

	uint8_t encryptedChallenge[32] = {0};
	if (!aesCbc(key, encryptedRndB, plainChallenge, sizeof(plainChallenge), encryptedChallenge, true))
	{
		secureZero(rndA, sizeof(rndA));
		secureZero(rndB, sizeof(rndB));
		secureZero(rndBRot, sizeof(rndBRot));
		secureZero(plainChallenge, sizeof(plainChallenge));
		return false;
	}

	uint8_t continueCommand[33] = {DESFIRE_CMD_ADDITIONAL_FRAME};
	memcpy(&continueCommand[1], encryptedChallenge, sizeof(encryptedChallenge));

	uint8_t encryptedRndARot[16] = {0};
	size_t encryptedRndARotLen = sizeof(encryptedRndARot);
	if (!sendNativeCommand(continueCommand, sizeof(continueCommand), encryptedRndARot, &encryptedRndARotLen, &status))
	{
		secureZero(rndA, sizeof(rndA));
		secureZero(rndB, sizeof(rndB));
		secureZero(rndBRot, sizeof(rndBRot));
		secureZero(plainChallenge, sizeof(plainChallenge));
		return false;
	}
	if (status != DESFIRE_STATUS_OPERATION_OK || encryptedRndARotLen != sizeof(encryptedRndARot))
	{
		secureZero(rndA, sizeof(rndA));
		secureZero(rndB, sizeof(rndB));
		secureZero(rndBRot, sizeof(rndBRot));
		secureZero(plainChallenge, sizeof(plainChallenge));
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
		return false;
	}

	uint8_t responseIv[16] = {0};
	memcpy(responseIv, &encryptedChallenge[16], sizeof(responseIv));
	uint8_t rndARotFromCard[16] = {0};
	if (!aesCbc(key, responseIv, encryptedRndARot, sizeof(encryptedRndARot), rndARotFromCard, false))
	{
		secureZero(rndA, sizeof(rndA));
		secureZero(rndB, sizeof(rndB));
		secureZero(rndBRot, sizeof(rndBRot));
		secureZero(plainChallenge, sizeof(plainChallenge));
		return false;
	}

	uint8_t expectedRndARot[16] = {0};
	rotateLeftOne(rndA, expectedRndARot, sizeof(expectedRndARot));
	if (!equals16(rndARotFromCard, expectedRndARot))
	{
		secureZero(rndA, sizeof(rndA));
		secureZero(rndB, sizeof(rndB));
		secureZero(rndBRot, sizeof(rndBRot));
		secureZero(plainChallenge, sizeof(plainChallenge));
		secureZero(rndARotFromCard, sizeof(rndARotFromCard));
		secureZero(expectedRndARot, sizeof(expectedRndARot));
		setStatus(DESFIRE_STATUS_CRYPTO_ERROR);
		return false;
	}

	deriveLegacySessionKey(rndA, rndB, gLegacySessionKey);
	gAuthScheme = DESFIRE_AUTH_LEGACY_AES;
	gAuthenticated = true;

	secureZero(rndA, sizeof(rndA));
	secureZero(rndB, sizeof(rndB));
	secureZero(rndBRot, sizeof(rndBRot));
	secureZero(plainChallenge, sizeof(plainChallenge));
	secureZero(encryptedChallenge, sizeof(encryptedChallenge));
	secureZero(rndARotFromCard, sizeof(rndARotFromCard));
	secureZero(expectedRndARot, sizeof(expectedRndARot));

	setStatus(DESFIRE_STATUS_OK);
	return true;
}
#endif

#if !defined(ESP32)
bool parseFileSettingsPayload(const uint8_t *response, size_t responseLen, DesfireFileSettings *outSettings)
{
	if (response == NULL || outSettings == NULL || responseLen < 4)
	{
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
		return false;
	}

	memset(outSettings, 0, sizeof(*outSettings));
	outSettings->fileType = response[0];
	outSettings->rawCommunicationSettings = response[1];
	outSettings->communicationMode = parseCommunicationMode(response[1]);
	outSettings->accessRights = (uint16_t)response[2] | ((uint16_t)response[3] << 8);
	if (responseLen >= 7 && (outSettings->fileType == 0x00 || outSettings->fileType == 0x01))
	{
		outSettings->fileSize = (uint32_t)response[4] |
								((uint32_t)response[5] << 8) |
								((uint32_t)response[6] << 16);
		outSettings->hasFileSize = true;
	}

	setStatus(DESFIRE_STATUS_OK);
	return true;
}
#endif
} // namespace

void desfire_bind_transport(DesfireTransceiveFn transport)
{
	gTransport = transport;
	clearSession();
}

void desfire_set_communication_mode(DesfireCommunicationMode mode)
{
	if (mode < DESFIRE_COMM_MODE_PLAIN || mode > DESFIRE_COMM_MODE_FULL)
	{
		gCommunicationMode = DESFIRE_COMM_MODE_PLAIN;
		return;
	}
	gCommunicationMode = mode;
}

bool desfire_select_application(uint32_t aid)
{
	clearSession();
	if (gTransport == NULL)
	{
		setStatus(DESFIRE_STATUS_TRANSPORT_ERROR);
		return false;
	}

	uint8_t command[4] = {
		DESFIRE_CMD_SELECT_APPLICATION,
		(uint8_t)(aid & 0xFFU),
		(uint8_t)((aid >> 8) & 0xFFU),
		(uint8_t)((aid >> 16) & 0xFFU),
	};
	uint8_t response[16] = {0};
	size_t responseLen = sizeof(response);

	if (!gTransport(command, sizeof(command), response, &responseLen))
	{
		setStatus(DESFIRE_STATUS_TRANSPORT_ERROR);
		return false;
	}

	if (responseLen < 1 || response[0] != DESFIRE_STATUS_OPERATION_OK)
	{
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
		return false;
	}

	setStatus(DESFIRE_STATUS_OK);
	return true;
}

bool desfire_authenticate_aes(uint8_t keyNo, const uint8_t key[16])
{
#if !defined(ESP32)
	(void)keyNo;
	(void)key;
	setStatus(DESFIRE_STATUS_NOT_IMPLEMENTED);
	return false;
#else
	if (key == NULL)
	{
		setStatus(DESFIRE_STATUS_CRYPTO_ERROR);
		return false;
	}

	if (gAuthenticated && gAuthScheme == DESFIRE_AUTH_EV2_AES)
	{
		if (authenticateEv2NonFirst(keyNo, key))
		{
			return true;
		}
	}

	clearSession();
	if (authenticateEv2First(keyNo, key))
	{
		return true;
	}

	clearSession();
	return authenticateLegacyAes(keyNo, key);
#endif
}

bool desfire_get_file_ids(uint8_t *outIds, size_t *inoutCount)
{
	if (outIds == NULL || inoutCount == NULL)
	{
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
		return false;
	}

	if (gTransport == NULL)
	{
		setStatus(DESFIRE_STATUS_TRANSPORT_ERROR);
		return false;
	}

#if defined(ESP32)
	if (gAuthScheme == DESFIRE_AUTH_EV2_AES)
	{
		return getFileIdsSecureEv2(outIds, inoutCount);
	}
#endif

	uint8_t command[1] = {
		DESFIRE_CMD_GET_FILE_IDS,
	};
	uint8_t response[32] = {0};
	size_t responseLen = sizeof(response);
	uint8_t status = 0;
	if (!collectNativeResponse(command, sizeof(command), response, sizeof(response), &responseLen, &status))
	{
		return false;
	}

	if (!mapCommandResponseStatus(status, false))
	{
		return false;
	}

	if (*inoutCount < responseLen)
	{
		setStatus(DESFIRE_STATUS_BUFFER_TOO_SMALL);
		return false;
	}

	if (responseLen > 0)
	{
		memcpy(outIds, response, responseLen);
	}
	*inoutCount = responseLen;
	setStatus(DESFIRE_STATUS_OK);
	return true;
}

bool desfire_get_file_settings(uint8_t fileId, DesfireFileSettings *outSettings)
{
	if (outSettings == NULL)
	{
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
		return false;
	}

	if (gTransport == NULL)
	{
		setStatus(DESFIRE_STATUS_TRANSPORT_ERROR);
		return false;
	}

#if defined(ESP32)
	if (gAuthScheme == DESFIRE_AUTH_EV2_AES)
	{
		return getFileSettingsSecureEv2(fileId, outSettings);
	}
#endif

	uint8_t command[2] = {
		DESFIRE_CMD_GET_FILE_SETTINGS,
		fileId,
	};
	uint8_t response[32] = {0};
	size_t responseLen = sizeof(response);
	uint8_t status = 0;
	if (!collectNativeResponse(command, sizeof(command), response, sizeof(response), &responseLen, &status))
	{
		return false;
	}

	if (!mapCommandResponseStatus(status, gAuthScheme == DESFIRE_AUTH_EV2_AES))
	{
		return false;
	}

	return parseFileSettingsPayload(response, responseLen, outSettings);
}

bool desfire_read_file(uint8_t fileId, uint8_t *out, size_t *outLen)
{
	if (!gAuthenticated)
	{
		setStatus(DESFIRE_STATUS_AUTH_REQUIRED);
		return false;
	}

	if (out == NULL || outLen == NULL || *outLen == 0)
	{
		setStatus(DESFIRE_STATUS_BUFFER_TOO_SMALL);
		return false;
	}

#if defined(ESP32)
	if (gCommunicationMode != DESFIRE_COMM_MODE_PLAIN)
	{
		if (gAuthScheme != DESFIRE_AUTH_EV2_AES)
		{
			setStatus(DESFIRE_STATUS_NOT_IMPLEMENTED);
			return false;
		}
		return readFileSecureEv2(fileId, out, outLen);
	}
#else
	(void)fileId;
	(void)out;
	(void)outLen;
#endif

	uint8_t command[8] = {
		DESFIRE_CMD_READ_DATA,
		fileId,
		0x00,
		0x00,
		0x00,
		0x00,
		0x00,
		0x00,
	};

	if (!nativeReadChained(command, sizeof(command), out, outLen))
	{
		return false;
	}

	if (gAuthScheme == DESFIRE_AUTH_EV2_AES)
	{
		gCommandCounter++;
	}

	setStatus(DESFIRE_STATUS_OK);
	return true;
}

bool parse_credential_data(const uint8_t *data, size_t len, char *out_id, size_t out_len)
{
	if (data == NULL || out_id == NULL || out_len == 0 || len == 0)
	{
		setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
		return false;
	}

	size_t parsedLen = 0;

	if (data[0] > 0 && (size_t)data[0] < len)
	{
		size_t candidateLen = data[0];
		bool printable = true;
		for (size_t i = 0; i < candidateLen; ++i)
		{
			if (!isPrintableCredentialByte(data[i + 1]))
			{
				printable = false;
				break;
			}
		}
		if (printable)
		{
			parsedLen = candidateLen;
			if (!copyCredentialString(&data[1], parsedLen, out_id, out_len))
			{
				setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
				return false;
			}
			setStatus(DESFIRE_STATUS_OK);
			return true;
		}
	}

	while (parsedLen < len && parsedLen + 1 < out_len && data[parsedLen] != 0x00 && isPrintableCredentialByte(data[parsedLen]))
	{
		out_id[parsedLen] = (char)data[parsedLen];
		parsedLen++;
	}

	if (parsedLen > 0)
	{
		out_id[parsedLen] = '\0';
		setStatus(DESFIRE_STATUS_OK);
		return true;
	}

	if (extractCredentialTlv(data, len, out_id, out_len))
	{
		setStatus(DESFIRE_STATUS_OK);
		return true;
	}

	setStatus(DESFIRE_STATUS_PROTOCOL_ERROR);
	return false;
}

DesfireStatus desfire_last_status()
{
	return gLastStatus;
}

const char *desfire_last_status_name()
{
	switch (gLastStatus)
	{
	case DESFIRE_STATUS_OK:
		return "ok";
	case DESFIRE_STATUS_TRANSPORT_ERROR:
		return "transport_error";
	case DESFIRE_STATUS_PROTOCOL_ERROR:
		return "protocol_error";
	case DESFIRE_STATUS_AUTH_REQUIRED:
		return "auth_required";
	case DESFIRE_STATUS_NOT_IMPLEMENTED:
		return "not_implemented";
	case DESFIRE_STATUS_CRYPTO_ERROR:
		return "crypto_error";
	case DESFIRE_STATUS_BUFFER_TOO_SMALL:
		return "buffer_too_small";
	default:
		return "unknown";
	}
}
