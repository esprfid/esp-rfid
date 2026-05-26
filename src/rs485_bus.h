#pragma once

#include <stddef.h>
#include <stdint.h>

enum Rs485MessageType
{
	RS485_MSG_CARD_READ = 0x01,
	RS485_MSG_AUTH_FAILED = 0x02,
	RS485_MSG_READ_FAILED = 0x03,
	RS485_MSG_HEARTBEAT = 0x04,
	RS485_MSG_TAMPER = 0x05,
	RS485_MSG_STATUS = 0x06,
};

void rs485_init();
bool rs485_is_ready();
bool rs485_send_event(Rs485MessageType messageType, const char *reader_id, const uint8_t *payload, size_t payload_len);
bool rs485_send_card_event(const char *reader_id, const char *credential_id);
bool rs485_send_status_event(const char *reader_id, const char *status_text);
bool rs485_send_heartbeat(const char *reader_id, const char *status_text);
