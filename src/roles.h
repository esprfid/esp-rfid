#pragma once

#include "Arduino.h"
#include <ArduinoJson.h>
#include "magicnumbers.h"

struct AccessRole
{
	int id = ACCESS_ROLE_DISABLED;
	char name[ACCESS_ROLE_NAME_LEN] = {0};
	bool enabled = false;
	bool admin = false;
	uint8_t relayMask = 0;
	uint32_t schedule[7] = {0};
};

void roles_init_defaults(const char *legacyOpeningHours[7]);
bool roles_load(const char *legacyOpeningHours[7]);
bool roles_save_from_json_string(const char *json);
void roles_serialize(JsonArray out);
uint8_t roles_count();
const AccessRole *roles_find(int roleId);
const AccessRole *roles_for_user(JsonObject user);
int roles_user_role_id(JsonObject user);
int roles_legacy_access_type(const AccessRole *role);
bool roles_is_allowed_now(const AccessRole *role, uint8_t dayFromMonday, uint8_t hour);
const char *roles_name(const AccessRole *role);
const char *roles_name_by_id(int roleId);
uint8_t roles_relay_mask(const AccessRole *role);
