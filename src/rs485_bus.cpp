#include "Arduino.h"
#include "config.h"
#include "crc16.h"
#include "rs485_bus.h"

extern Config config;

namespace
{
#if defined(ESP32)
HardwareSerial *rs485Serial = NULL;
#endif

bool gRs485Ready = false;

const uint8_t RS485_STX = 0x02;
const uint8_t RS485_ETX = 0x03;
const size_t RS485_MAX_READER_ID_LEN = 64;
const size_t RS485_MAX_PAYLOAD_LEN = 256;
const size_t RS485_MAX_FRAME_LEN = 2 + 2 + 1 + RS485_MAX_READER_ID_LEN + 1 + 2 + RS485_MAX_PAYLOAD_LEN + 2 + 1;

void setTransmitMode(bool enabled)
{
#if defined(ESP32)
	digitalWrite(config.secureReader.rs485DeRePin, enabled ? HIGH : LOW);
#else
	(void)enabled;
#endif
}
} // namespace

void rs485_init()
{
#if defined(ESP32)
	if (rs485Serial != NULL)
	{
		rs485Serial->end();
		delete rs485Serial;
		rs485Serial = NULL;
	}

	pinMode(config.secureReader.rs485DeRePin, OUTPUT);
	setTransmitMode(false);

	int uartPort = config.secureReader.rs485Uart;
#if defined(CONFIG_IDF_TARGET_ESP32C3)
	const int maxUartPort = 1;
#else
	const int maxUartPort = 2;
#endif
	if (uartPort < 0 || uartPort > maxUartPort)
	{
	#ifdef DEBUG
		Serial.printf("[ WARN ] Invalid RS-485 UART %d, using UART%d\n", uartPort, DEFAULT_RS485_UART);
	#endif
		uartPort = DEFAULT_RS485_UART;
	}

	rs485Serial = new HardwareSerial((uint8_t)uartPort);
	rs485Serial->begin(
		config.secureReader.rs485BaudRate,
		SERIAL_8N1,
		config.secureReader.rs485RxPin,
		config.secureReader.rs485TxPin);
	gRs485Ready = true;
#else
	gRs485Ready = false;
#endif
}

bool rs485_is_ready()
{
	return gRs485Ready;
}

bool rs485_send_event(Rs485MessageType messageType, const char *reader_id, const uint8_t *payload, size_t payload_len)
{
	if (!gRs485Ready || reader_id == NULL)
	{
		return false;
	}

	size_t readerIdLen = strlen(reader_id);
	if (readerIdLen == 0 || readerIdLen > RS485_MAX_READER_ID_LEN || payload_len > RS485_MAX_PAYLOAD_LEN)
	{
		return false;
	}

	uint8_t body[1 + RS485_MAX_READER_ID_LEN + 1 + 2 + RS485_MAX_PAYLOAD_LEN];
	size_t bodyLen = 0;
	body[bodyLen++] = (uint8_t)readerIdLen;
	memcpy(&body[bodyLen], reader_id, readerIdLen);
	bodyLen += readerIdLen;
	body[bodyLen++] = (uint8_t)messageType;
	body[bodyLen++] = (uint8_t)(payload_len & 0xFFU);
	body[bodyLen++] = (uint8_t)((payload_len >> 8) & 0xFFU);
	if (payload_len > 0 && payload != NULL)
	{
		memcpy(&body[bodyLen], payload, payload_len);
		bodyLen += payload_len;
	}

	uint16_t crc = crc16_ccitt(body, bodyLen);
	uint16_t lengthField = (uint16_t)(bodyLen + 2U);

	uint8_t frame[RS485_MAX_FRAME_LEN];
	size_t frameLen = 0;
	frame[frameLen++] = RS485_STX;
	frame[frameLen++] = (uint8_t)(lengthField & 0xFFU);
	frame[frameLen++] = (uint8_t)((lengthField >> 8) & 0xFFU);
	memcpy(&frame[frameLen], body, bodyLen);
	frameLen += bodyLen;
	frame[frameLen++] = (uint8_t)(crc & 0xFFU);
	frame[frameLen++] = (uint8_t)((crc >> 8) & 0xFFU);
	frame[frameLen++] = RS485_ETX;

#if defined(ESP32)
	if (rs485Serial == NULL)
	{
		return false;
	}
	setTransmitMode(true);
	rs485Serial->write(frame, frameLen);
	rs485Serial->flush();
	setTransmitMode(false);
	return true;
#else
	(void)frame;
	(void)frameLen;
	return false;
#endif
}

bool rs485_send_card_event(const char *reader_id, const char *credential_id)
{
	if (credential_id == NULL)
	{
		return false;
	}
	return rs485_send_event(
		RS485_MSG_CARD_READ,
		reader_id,
		(const uint8_t *)credential_id,
		strlen(credential_id));
}

bool rs485_send_status_event(const char *reader_id, const char *status_text)
{
	if (status_text == NULL)
	{
		return false;
	}
	return rs485_send_event(
		RS485_MSG_STATUS,
		reader_id,
		(const uint8_t *)status_text,
		strlen(status_text));
}

bool rs485_send_heartbeat(const char *reader_id, const char *status_text)
{
	if (status_text == NULL)
	{
		status_text = "ok";
	}
	return rs485_send_event(
		RS485_MSG_HEARTBEAT,
		reader_id,
		(const uint8_t *)status_text,
		strlen(status_text));
}
