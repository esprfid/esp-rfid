#pragma once

#include <stddef.h>
#include <stdint.h>

enum SecureCredentialResult
{
	SECURE_CREDENTIAL_OK = 0,
	SECURE_CREDENTIAL_NO_CARD,
	SECURE_CREDENTIAL_UNSUPPORTED_CARD,
	SECURE_CREDENTIAL_AUTH_FAILED,
	SECURE_CREDENTIAL_READ_FAILED,
	SECURE_CREDENTIAL_BACKEND_ERROR,
};

class ReaderBackend
{
public:
	virtual ~ReaderBackend() {}
	virtual bool begin() = 0;
	virtual bool waitForCard(uint32_t timeout_ms) = 0;
	virtual bool readSecureCredential(char *out_id, size_t out_len) = 0;
	virtual void releaseCard() = 0;
	virtual const char *name() const = 0;
	virtual const char *technology() const = 0;
	virtual const char *authMode() const = 0;
	virtual SecureCredentialResult lastResult() const = 0;
};

bool credential_reader_begin();
bool credential_reader_wait_for_card(uint32_t timeout_ms);
bool read_secure_credential(char *out_id, size_t out_len);
void credential_reader_release_card();
SecureCredentialResult credential_reader_last_result();
const char *credential_reader_last_result_name();
const char *credential_reader_backend_name();
const char *credential_reader_technology();
const char *credential_reader_auth_mode();
