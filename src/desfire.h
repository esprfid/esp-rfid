#pragma once

#include <stddef.h>
#include <stdint.h>

enum DesfireStatus
{
	DESFIRE_STATUS_OK = 0,
	DESFIRE_STATUS_TRANSPORT_ERROR,
	DESFIRE_STATUS_PROTOCOL_ERROR,
	DESFIRE_STATUS_AUTH_REQUIRED,
	DESFIRE_STATUS_NOT_IMPLEMENTED,
	DESFIRE_STATUS_CRYPTO_ERROR,
	DESFIRE_STATUS_BUFFER_TOO_SMALL,
};

enum DesfireCommunicationMode
{
	DESFIRE_COMM_MODE_PLAIN = 0,
	DESFIRE_COMM_MODE_MACED,
	DESFIRE_COMM_MODE_FULL,
};

struct DesfireFileSettings
{
	uint8_t fileType = 0xFF;
	uint8_t rawCommunicationSettings = 0;
	DesfireCommunicationMode communicationMode = DESFIRE_COMM_MODE_PLAIN;
	uint16_t accessRights = 0;
	uint32_t fileSize = 0;
	bool hasFileSize = false;
};

typedef bool (*DesfireTransceiveFn)(const uint8_t *tx, size_t tx_len, uint8_t *rx, size_t *rx_len);

void desfire_bind_transport(DesfireTransceiveFn transport);
void desfire_set_communication_mode(DesfireCommunicationMode mode);
bool desfire_select_application(uint32_t aid);
bool desfire_authenticate_aes(uint8_t key_no, const uint8_t key[16]);
bool desfire_get_file_ids(uint8_t *out_ids, size_t *inout_count);
bool desfire_get_file_settings(uint8_t file_id, DesfireFileSettings *out_settings);
bool desfire_read_file(uint8_t file_id, uint8_t *out, size_t *out_len);
bool parse_credential_data(const uint8_t *data, size_t len, char *out_id, size_t out_len);
DesfireStatus desfire_last_status();
const char *desfire_last_status_name();
