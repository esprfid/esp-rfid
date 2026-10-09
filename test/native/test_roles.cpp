#include <assert.h>
#include <string>
#include <ArduinoJson.h>
#include "FS.h"
#include "roles.h"

FakeSPIFFS SPIFFS;

static std::string validRoles()
{
	DynamicJsonDocument doc(6144);
	doc["command"] = "rolesfile";
	JsonArray roles = doc.createNestedArray("roles");
	roles_serialize(roles);
	JsonObject custom = roles.createNestedObject();
	custom["id"] = 2;
	custom["name"] = "Guests";
	custom["enabled"] = true;
	custom["admin"] = false;
	custom["relay_mask"] = 3;
	JsonArray schedule = custom.createNestedArray("schedule");
	for (int day = 0; day < 7; ++day)
	{
		schedule.add("000000001111111100000000");
	}
	std::string json;
	serializeJson(doc, json);
	return json;
}

int main()
{
	const char *legacy[7] = {
		"100000000000000000000000", "000000000000000000000000",
		"000000000000000000000000", "000000000000000000000000",
		"000000000000000000000000", "000000000000000000000000",
		"000000000000000000000000"};
	assert(roles_load(legacy));
	assert(roles_count() == 3);
	assert(roles_is_allowed_now(roles_find(ACCESS_ROLE_STANDARD), 0, 0));
	assert(!roles_is_allowed_now(roles_find(ACCESS_ROLE_STANDARD), 0, 1));
	assert(!roles_is_allowed_now(roles_find(ACCESS_ROLE_DISABLED), 0, 0));

	std::string json = validRoles();
	assert(roles_save_from_json_string(json.c_str()));
	assert(roles_count() == 4);
	assert(roles_relay_mask(roles_find(2)) == 3);
	assert(roles_is_allowed_now(roles_find(2), 0, 8));
	assert(!roles_is_allowed_now(roles_find(2), 0, 7));
	assert(roles_load(legacy));
	assert(roles_count() == 4);
	assert(roles_find(2) != nullptr);

	DynamicJsonDocument doc(6144);
	assert(!deserializeJson(doc, json));
	doc["roles"][0]["enabled"] = true;
	doc["roles"][0]["relay_mask"] = 15;
	doc["roles"][2]["enabled"] = false;
	doc["roles"][2]["admin"] = false;
	std::string changed;
	serializeJson(doc, changed);
	assert(roles_save_from_json_string(changed.c_str()));
	assert(!roles_find(ACCESS_ROLE_DISABLED)->enabled);
	assert(roles_relay_mask(roles_find(ACCESS_ROLE_DISABLED)) == 0);
	assert(roles_find(ACCESS_ROLE_ADMIN)->enabled && roles_find(ACCESS_ROLE_ADMIN)->admin);
	assert(roles_load(legacy));
	assert(roles_find(ACCESS_ROLE_ADMIN)->admin);
	std::string saved = SPIFFS.contents;

	doc.clear();
	assert(!deserializeJson(doc, json));
	doc["roles"][3]["schedule"][0] = "not-a-schedule";
	std::string invalid;
	serializeJson(doc, invalid);
	assert(!roles_save_from_json_string(invalid.c_str()));
	assert(roles_count() == 4 && SPIFFS.contents == saved);

	doc.clear();
	assert(!deserializeJson(doc, json));
	doc["roles"][3]["id"] = 1;
	invalid.clear();
	serializeJson(doc, invalid);
	assert(!roles_save_from_json_string(invalid.c_str()));
	assert(roles_count() == 4 && SPIFFS.contents == saved);

	SPIFFS.failOpen = true;
	assert(!roles_save_from_json_string(json.c_str()));
	assert(roles_count() == 4 && SPIFFS.contents == saved);
	SPIFFS.failOpen = false;

	SPIFFS.contents = "{broken";
	assert(!roles_load(legacy));
	assert(roles_count() == 3);
}
