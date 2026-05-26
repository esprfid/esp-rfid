#include "Arduino.h"
#include "config.h"
#include "credential_reader.h"
#include "desfire.h"
#include "nfc_pn532.h"

extern Config config;

namespace
{
DesfireCommunicationMode communicationModeFromConfig();
const char *communicationModeName(DesfireCommunicationMode mode);
bool resolveCommunicationModeForRead(uint8_t fileId, DesfireCommunicationMode configuredMode, DesfireCommunicationMode *resolvedMode);
bool resolveFileSelectionForRead(uint8_t configuredFileId, DesfireCommunicationMode configuredMode, uint8_t *resolvedFileId, DesfireCommunicationMode *resolvedMode);

const size_t CREDENTIAL_PAYLOAD_CAPACITY = 192;

class Pn532DesfireBackend : public ReaderBackend
{
public:
	Pn532DesfireBackend()
		: lastResultValue(SECURE_CREDENTIAL_BACKEND_ERROR)
	{
	}

	bool begin() override
	{
		desfire_bind_transport(pn532_transceive_apdu);
		desfire_set_communication_mode(communicationModeFromConfig());
		if (!pn532_init())
		{
			lastResultValue = SECURE_CREDENTIAL_BACKEND_ERROR;
			return false;
		}
		lastResultValue = SECURE_CREDENTIAL_OK;
		return true;
	}

	bool waitForCard(uint32_t timeout_ms) override
	{
		if (!pn532_wait_for_card(timeout_ms))
		{
			lastResultValue = SECURE_CREDENTIAL_NO_CARD;
			return false;
		}
		return true;
	}

	bool readSecureCredential(char *out_id, size_t out_len) override
	{
		desfire_set_communication_mode(communicationModeFromConfig());
		if (!pn532_last_card_is_desfire())
		{
			lastResultValue = SECURE_CREDENTIAL_UNSUPPORTED_CARD;
			return false;
		}

		if (!desfire_select_application(config.secureReader.desfireAid))
		{
			lastResultValue = SECURE_CREDENTIAL_READ_FAILED;
			return false;
		}

		if (!desfire_authenticate_aes(config.secureReader.desfireKeyNumber, config.secureReader.aesKey))
		{
			lastResultValue = SECURE_CREDENTIAL_AUTH_FAILED;
			return false;
		}

		uint8_t resolvedFileId = config.secureReader.desfireFileId;
		DesfireCommunicationMode resolvedMode = communicationModeFromConfig();
		if (!resolveFileSelectionForRead(config.secureReader.desfireFileId, resolvedMode, &resolvedFileId, &resolvedMode))
		{
			lastResultValue = SECURE_CREDENTIAL_READ_FAILED;
			return false;
		}
		desfire_set_communication_mode(resolvedMode);

		uint8_t payload[CREDENTIAL_PAYLOAD_CAPACITY] = {0};
		size_t payloadLen = sizeof(payload);
		if (!desfire_read_file(resolvedFileId, payload, &payloadLen))
		{
			lastResultValue = SECURE_CREDENTIAL_READ_FAILED;
			return false;
		}

		if (!parse_credential_data(payload, payloadLen, out_id, out_len))
		{
			lastResultValue = SECURE_CREDENTIAL_READ_FAILED;
			return false;
		}

		lastResultValue = SECURE_CREDENTIAL_OK;
		return true;
	}

	void releaseCard() override
	{
		pn532_release_card();
	}

	const char *name() const override
	{
		return "PN532_DESFIRE";
	}

	const char *technology() const override
	{
		return "DESFire";
	}

	const char *authMode() const override
	{
		return "AES";
	}

	SecureCredentialResult lastResult() const override
	{
		return lastResultValue;
	}

private:
	SecureCredentialResult lastResultValue;
};

Pn532DesfireBackend gPn532DesfireBackend;
ReaderBackend *gActiveBackend = NULL;

DesfireCommunicationMode communicationModeFromConfig()
{
	const char *mode = config.secureReader.desfireFileCommMode;
	if (mode == NULL)
	{
		return DESFIRE_COMM_MODE_PLAIN;
	}
	if (strcmp(mode, "maced") == 0)
	{
		return DESFIRE_COMM_MODE_MACED;
	}
	if (strcmp(mode, "full") == 0)
	{
		return DESFIRE_COMM_MODE_FULL;
	}
	return DESFIRE_COMM_MODE_PLAIN;
}

const char *communicationModeName(DesfireCommunicationMode mode)
{
	switch (mode)
	{
	case DESFIRE_COMM_MODE_MACED:
		return "maced";
	case DESFIRE_COMM_MODE_FULL:
		return "full";
	case DESFIRE_COMM_MODE_PLAIN:
	default:
		return "plain";
	}
}

bool resolveCommunicationModeForRead(uint8_t fileId, DesfireCommunicationMode configuredMode, DesfireCommunicationMode *resolvedMode)
{
	if (resolvedMode == NULL)
	{
		return false;
	}

	const char *configuredModeText = config.secureReader.desfireFileCommMode;
	if (configuredModeText == NULL || strcmp(configuredModeText, "auto") != 0)
	{
		*resolvedMode = configuredMode;
		return true;
	}

	DesfireFileSettings fileSettings;
	if (!desfire_get_file_settings(fileId, &fileSettings))
	{
		Serial.printf("[ WARN ] DESFire GetFileSettings failed for file %u: %s\n", fileId, desfire_last_status_name());
		return false;
	}

	if (fileSettings.fileType != 0x00 && fileSettings.fileType != 0x01)
	{
		Serial.printf("[ WARN ] DESFire file %u type 0x%02X is not supported for credential reads\n",
					  fileId,
					  fileSettings.fileType);
		return false;
	}

	if (fileSettings.hasFileSize && fileSettings.fileSize > CREDENTIAL_PAYLOAD_CAPACITY)
	{
		Serial.printf("[ WARN ] DESFire file %u size %lu exceeds local payload buffer %u\n",
					  fileId,
					  (unsigned long)fileSettings.fileSize,
					  (unsigned int)CREDENTIAL_PAYLOAD_CAPACITY);
		return false;
	}

	*resolvedMode = fileSettings.communicationMode;
	Serial.printf("[ INFO ] DESFire file %u settings: type=0x%02X comm=%s raw=0x%02X size=%lu\n",
				  fileId,
				  fileSettings.fileType,
				  communicationModeName(fileSettings.communicationMode),
				  fileSettings.rawCommunicationSettings,
				  (unsigned long)fileSettings.fileSize);
	return true;
}

bool resolveFileSelectionForRead(uint8_t configuredFileId, DesfireCommunicationMode configuredMode, uint8_t *resolvedFileId, DesfireCommunicationMode *resolvedMode)
{
	if (resolvedFileId == NULL || resolvedMode == NULL)
	{
		return false;
	}

	if (configuredFileId != 0xFFU)
	{
		*resolvedFileId = configuredFileId;
		return resolveCommunicationModeForRead(configuredFileId, configuredMode, resolvedMode);
	}

	uint8_t fileIds[16] = {0};
	size_t fileCount = sizeof(fileIds);
	if (!desfire_get_file_ids(fileIds, &fileCount))
	{
		Serial.printf("[ WARN ] DESFire GetFileIDs failed during auto selection: %s\n", desfire_last_status_name());
		return false;
	}

	for (size_t i = 0; i < fileCount; ++i)
	{
		DesfireFileSettings fileSettings;
		if (!desfire_get_file_settings(fileIds[i], &fileSettings))
		{
			Serial.printf("[ WARN ] DESFire GetFileSettings failed for auto candidate file %u: %s\n",
						  fileIds[i],
						  desfire_last_status_name());
			continue;
		}

		if (fileSettings.fileType != 0x00 && fileSettings.fileType != 0x01)
		{
			continue;
		}
		if (fileSettings.hasFileSize && fileSettings.fileSize > CREDENTIAL_PAYLOAD_CAPACITY)
		{
			continue;
		}

		*resolvedFileId = fileIds[i];
		*resolvedMode = configuredMode;
		if (config.secureReader.desfireFileCommMode != NULL && strcmp(config.secureReader.desfireFileCommMode, "auto") == 0)
		{
			*resolvedMode = fileSettings.communicationMode;
		}

		Serial.printf("[ INFO ] DESFire auto-selected file %u with comm=%s type=0x%02X size=%lu\n",
					  *resolvedFileId,
					  communicationModeName(*resolvedMode),
					  fileSettings.fileType,
					  (unsigned long)fileSettings.fileSize);
		return true;
	}

	Serial.printf("[ WARN ] DESFire auto selection found no supported credential file\n");
	return false;
}

const char *resultName(SecureCredentialResult result)
{
	switch (result)
	{
	case SECURE_CREDENTIAL_OK:
		return "ok";
	case SECURE_CREDENTIAL_NO_CARD:
		return "no_card";
	case SECURE_CREDENTIAL_UNSUPPORTED_CARD:
		return "unsupported_card";
	case SECURE_CREDENTIAL_AUTH_FAILED:
		return "auth_failed";
	case SECURE_CREDENTIAL_READ_FAILED:
		return "read_failed";
	case SECURE_CREDENTIAL_BACKEND_ERROR:
	default:
		return "backend_error";
	}
}
} // namespace

bool credential_reader_begin()
{
	if (config.secureReader.backendName != NULL && strcmp(config.secureReader.backendName, "PN532_DESFIRE") == 0)
	{
		gActiveBackend = &gPn532DesfireBackend;
		return gActiveBackend->begin();
	}

	gActiveBackend = NULL;
	return false;
}

bool credential_reader_wait_for_card(uint32_t timeout_ms)
{
	if (gActiveBackend == NULL)
	{
		return false;
	}
	return gActiveBackend->waitForCard(timeout_ms);
}

bool read_secure_credential(char *out_id, size_t out_len)
{
	if (gActiveBackend == NULL)
	{
		return false;
	}
	return gActiveBackend->readSecureCredential(out_id, out_len);
}

void credential_reader_release_card()
{
	if (gActiveBackend == NULL)
	{
		return;
	}
	gActiveBackend->releaseCard();
}

SecureCredentialResult credential_reader_last_result()
{
	if (gActiveBackend == NULL)
	{
		return SECURE_CREDENTIAL_BACKEND_ERROR;
	}
	return gActiveBackend->lastResult();
}

const char *credential_reader_last_result_name()
{
	return resultName(credential_reader_last_result());
}

const char *credential_reader_backend_name()
{
	if (gActiveBackend == NULL)
	{
		return "none";
	}
	return gActiveBackend->name();
}

const char *credential_reader_technology()
{
	if (gActiveBackend == NULL)
	{
		return "unknown";
	}
	return gActiveBackend->technology();
}

const char *credential_reader_auth_mode()
{
	if (gActiveBackend == NULL)
	{
		return "unknown";
	}
	return gActiveBackend->authMode();
}
