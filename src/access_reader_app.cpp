#include "Arduino.h"
#include "config.h"
#include "credential_reader.h"
#include "magicnumbers.h"
#include "nfc_pn532.h"
#include "rs485_bus.h"
#include "access_reader_app.h"

extern Config config;

extern void beeperAccessDenied();
extern void beeperValidAccess();
extern void ledAccessDeniedOn();
extern void writeEvent(String type, String src, String desc, String data);

namespace
{
bool gAppInitialized = false;
bool gBackendReady = false;
bool gWaitingForRemoval = false;
unsigned long gNextInitAttempt = 0;
unsigned long gLastHeartbeat = 0;
unsigned long gLastCardSeen = 0;
unsigned long gLastCredentialTs = 0;
char gLastCredentialId[64] = "";

const unsigned long BACKEND_RETRY_MS = 2000;
const unsigned long CARD_REMOVAL_GRACE_MS = 250;

const char *readerId()
{
	if (config.secureReader.readerId == NULL || config.secureReader.readerId[0] == '\0')
	{
		return "door_01";
	}
	return config.secureReader.readerId;
}

void logUidIfEnabled()
{
	if (!config.secureReader.debugUid)
	{
		return;
	}

	char uidBuffer[32] = "";
	pn532_get_last_uid_hex(uidBuffer, sizeof(uidBuffer));
	if (uidBuffer[0] != '\0')
	{
		Serial.printf("[ INFO ] Secure backend saw UID for debug only: %s\n", uidBuffer);
	}
}

bool shouldSuppressDuplicate(const char *credentialId)
{
	if (credentialId == NULL || credentialId[0] == '\0')
	{
		return false;
	}
	return strcmp(gLastCredentialId, credentialId) == 0 &&
		   (millis() - gLastCredentialTs) < config.secureReader.cardDebounceMs;
}

void rememberCredential(const char *credentialId)
{
	if (credentialId == NULL)
	{
		return;
	}
	strlcpy(gLastCredentialId, credentialId, sizeof(gLastCredentialId));
	gLastCredentialTs = millis();
}

void sendNamedStatus(const char *statusText)
{
	rs485_send_status_event(readerId(), statusText);
	writeEvent("WARN", "secure", statusText, "");
	beeperAccessDenied();
	ledAccessDeniedOn();
}

void tryInitBackend()
{
	gBackendReady = credential_reader_begin();
	if (gBackendReady)
	{
		writeEvent("INFO", "secure", "Secure credential backend ready", credential_reader_backend_name());
		Serial.printf("[ INFO ] Secure backend ready: %s\n", credential_reader_backend_name());
		return;
	}

	gNextInitAttempt = millis() + BACKEND_RETRY_MS;
	rs485_send_status_event(readerId(), "reader_init_failed");
	writeEvent("ERRO", "secure", "Secure credential backend init failed", credential_reader_backend_name());
	Serial.printf("[ WARN ] Secure backend init failed, retry in %lu ms\n", BACKEND_RETRY_MS);
}
} // namespace

bool access_reader_app_is_active()
{
	return config.readertype == READER_SECURE_ACCESS;
}

void access_reader_app_begin()
{
	rs485_init();
	gAppInitialized = true;
	gBackendReady = false;
	gWaitingForRemoval = false;
	gNextInitAttempt = 0;
	gLastHeartbeat = 0;
	gLastCardSeen = 0;
	gLastCredentialTs = 0;
	gLastCredentialId[0] = '\0';
	tryInitBackend();
}

void access_reader_app_loop()
{
	if (!access_reader_app_is_active())
	{
		return;
	}

	if (!gAppInitialized)
	{
		access_reader_app_begin();
	}

	unsigned long now = millis();
	if (config.secureReader.heartbeatIntervalMs > 0 &&
		(now - gLastHeartbeat) >= config.secureReader.heartbeatIntervalMs)
	{
		rs485_send_heartbeat(readerId(), "ok");
		gLastHeartbeat = now;
	}

	if (!gBackendReady)
	{
		if (now >= gNextInitAttempt)
		{
			tryInitBackend();
		}
		return;
	}

	bool cardPresent = credential_reader_wait_for_card(0);
	if (!cardPresent)
	{
		if (gWaitingForRemoval && (now - gLastCardSeen) >= CARD_REMOVAL_GRACE_MS)
		{
			gWaitingForRemoval = false;
			credential_reader_release_card();
		}
		return;
	}

	gLastCardSeen = now;
	if (gWaitingForRemoval)
	{
		return;
	}

	logUidIfEnabled();

	char credentialId[64] = "";
	bool credentialOk = read_secure_credential(credentialId, sizeof(credentialId));
	SecureCredentialResult result = credential_reader_last_result();

	if (credentialOk)
	{
		if (!shouldSuppressDuplicate(credentialId))
		{
			rs485_send_card_event(readerId(), credentialId);
			writeEvent("INFO", "secure", "Secure credential read", credentialId);
			Serial.printf("[ INFO ] Secure credential read: %s\n", credentialId);
			rememberCredential(credentialId);
			beeperValidAccess();
		}
		else
		{
			Serial.printf("[ INFO ] Secure credential suppressed by debounce: %s\n", credentialId);
		}
	}
	else
	{
		switch (result)
		{
		case SECURE_CREDENTIAL_UNSUPPORTED_CARD:
			sendNamedStatus("unsupported_card");
			break;
		case SECURE_CREDENTIAL_AUTH_FAILED:
			rs485_send_event(RS485_MSG_AUTH_FAILED, readerId(), NULL, 0);
			writeEvent("WARN", "secure", "DESFire authentication failed", credential_reader_auth_mode());
			beeperAccessDenied();
			ledAccessDeniedOn();
			break;
		case SECURE_CREDENTIAL_READ_FAILED:
			rs485_send_event(RS485_MSG_READ_FAILED, readerId(), NULL, 0);
			writeEvent("WARN", "secure", "DESFire protected file read failed", credential_reader_technology());
			beeperAccessDenied();
			ledAccessDeniedOn();
			break;
		case SECURE_CREDENTIAL_BACKEND_ERROR:
		case SECURE_CREDENTIAL_NO_CARD:
		default:
			sendNamedStatus(credential_reader_last_result_name());
			break;
		}
	}

	credential_reader_release_card();
	gWaitingForRemoval = true;
}
