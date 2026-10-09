#include "roles.h"

#if defined(ESP32)
#include <SPIFFS.h>
#else
#include <FS.h>
#endif

namespace
{
AccessRole gRoles[MAX_ACCESS_ROLES];
uint8_t gRoleCount = 0;

const char *ROLES_FILE = "/roles.json";
const size_t ROLES_JSON_DOC_SIZE = 6144;
const uint8_t ALL_RELAYS_MASK = 0x0F;

void copyName(char *dst, size_t dstLen, const char *src, const char *fallback)
{
	if (dst == NULL || dstLen == 0)
	{
		return;
	}
	const char *chosen = (src != NULL && src[0] != '\0') ? src : fallback;
	snprintf(dst, dstLen, "%s", chosen ? chosen : "");
}

uint32_t fullDayMask()
{
	return 0x00FFFFFFUL;
}

uint32_t scheduleStringToMask(const char *hours)
{
	uint32_t mask = 0;
	if (hours == NULL)
	{
		return fullDayMask();
	}
	for (uint8_t h = 0; h < 24 && hours[h] != '\0'; ++h)
	{
		if (hours[h] == '1')
		{
			mask |= (1UL << h);
		}
	}
	return mask;
}

void maskToScheduleString(uint32_t mask, char out[25])
{
	for (uint8_t h = 0; h < 24; ++h)
	{
		out[h] = (mask & (1UL << h)) ? '1' : '0';
	}
	out[24] = '\0';
}

void setAllSchedule(AccessRole &role, bool allowed)
{
	for (uint8_t d = 0; d < 7; ++d)
	{
		role.schedule[d] = allowed ? fullDayMask() : 0;
	}
}

void setScheduleFromLegacy(AccessRole &role, const char *legacyOpeningHours[7])
{
	for (uint8_t d = 0; d < 7; ++d)
	{
		role.schedule[d] = scheduleStringToMask(legacyOpeningHours ? legacyOpeningHours[d] : NULL);
	}
}

AccessRole makeRole(int id, const char *name, bool enabled, bool admin, uint8_t relayMask)
{
	AccessRole role;
	role.id = id;
	copyName(role.name, sizeof(role.name), name, "");
	role.enabled = enabled;
	role.admin = admin;
	role.relayMask = relayMask & ALL_RELAYS_MASK;
	setAllSchedule(role, admin || enabled);
	return role;
}

int findRoleIndex(int id)
{
	for (uint8_t i = 0; i < gRoleCount; ++i)
	{
		if (gRoles[i].id == id)
		{
			return i;
		}
	}
	return -1;
}

bool appendRole(const AccessRole &role)
{
	if (gRoleCount >= MAX_ACCESS_ROLES || findRoleIndex(role.id) >= 0)
	{
		return false;
	}
	gRoles[gRoleCount++] = role;
	return true;
}

bool parseSchedule(JsonVariant value, AccessRole &role)
{
	if (!value.is<JsonArray>() || value.as<JsonArray>().size() != 7)
	{
		return false;
	}
	for (uint8_t d = 0; d < 7; ++d)
	{
		const char *day = value[d].as<const char *>();
		if (day == NULL || strlen(day) != 24 || strspn(day, "01") != 24)
		{
			return false;
		}
		role.schedule[d] = scheduleStringToMask(day);
	}
	return true;
}

bool loadRolesArray(JsonArray roles)
{
	if (roles.isNull() || roles.size() < 3 || roles.size() > MAX_ACCESS_ROLES)
	{
		return false;
	}

	gRoleCount = 0;
	for (JsonObject roleJson : roles)
	{
		if (!roleJson["id"].is<int>() || !roleJson["name"].is<const char *>() ||
			!roleJson["enabled"].is<bool>() || !roleJson["admin"].is<bool>() ||
			!roleJson["relay_mask"].is<int>())
		{
			return false;
		}
		AccessRole role;
		role.id = roleJson["id"].as<int>();
		const char *name = roleJson["name"].as<const char *>();
		int relayMask = roleJson["relay_mask"].as<int>();
		if (role.id < 0 || (role.id > MAX_ACCESS_ROLES && role.id != ACCESS_ROLE_ADMIN) ||
			findRoleIndex(role.id) >= 0 || name[0] == '\0' || strlen(name) >= sizeof(role.name) ||
			relayMask < 0 || relayMask > ALL_RELAYS_MASK || !parseSchedule(roleJson["schedule"], role))
		{
			return false;
		}
		copyName(role.name, sizeof(role.name), name, "");
		role.enabled = roleJson["enabled"].as<bool>();
		role.admin = roleJson["admin"].as<bool>();
		role.relayMask = relayMask;
		if (role.admin && role.id != ACCESS_ROLE_ADMIN)
		{
			return false;
		}
		if (role.id == ACCESS_ROLE_DISABLED)
		{
			role.enabled = false;
			role.admin = false;
			role.relayMask = 0;
			setAllSchedule(role, false);
		}
		if (role.id == ACCESS_ROLE_ADMIN)
		{
			role.enabled = true;
			role.admin = true;
			role.relayMask = ALL_RELAYS_MASK;
			setAllSchedule(role, true);
		}
		appendRole(role);
	}
	return findRoleIndex(ACCESS_ROLE_DISABLED) >= 0 &&
		findRoleIndex(ACCESS_ROLE_STANDARD) >= 0 &&
		findRoleIndex(ACCESS_ROLE_ADMIN) >= 0;
}
} // namespace

void roles_init_defaults(const char *legacyOpeningHours[7])
{
	gRoleCount = 0;

	AccessRole disabled = makeRole(ACCESS_ROLE_DISABLED, "Disabled", false, false, 0);
	setAllSchedule(disabled, false);
	appendRole(disabled);

	AccessRole standard = makeRole(ACCESS_ROLE_STANDARD, "Standard", true, false, ALL_RELAYS_MASK);
	setScheduleFromLegacy(standard, legacyOpeningHours);
	appendRole(standard);

	AccessRole admin = makeRole(ACCESS_ROLE_ADMIN, "Admin", true, true, ALL_RELAYS_MASK);
	setAllSchedule(admin, true);
	appendRole(admin);
}

bool roles_load(const char *legacyOpeningHours[7])
{
	roles_init_defaults(legacyOpeningHours);

	if (!SPIFFS.exists(ROLES_FILE))
	{
		return true;
	}

	File file = SPIFFS.open(ROLES_FILE, "r");
	if (!file)
	{
		return false;
	}

	DynamicJsonDocument doc(ROLES_JSON_DOC_SIZE);
	DeserializationError error = deserializeJson(doc, file);
	file.close();
	if (error)
	{
		roles_init_defaults(legacyOpeningHours);
		return false;
	}

	JsonArray roles = doc["roles"].as<JsonArray>();
	if (!loadRolesArray(roles))
	{
		roles_init_defaults(legacyOpeningHours);
		return false;
	}
	return true;
}

bool roles_save_from_json_string(const char *json)
{
	if (json == NULL)
	{
		return false;
	}

	DynamicJsonDocument doc(ROLES_JSON_DOC_SIZE);
	DeserializationError error = deserializeJson(doc, json);
	if (error)
	{
		return false;
	}

	AccessRole previousRoles[MAX_ACCESS_ROLES];
	memcpy(previousRoles, gRoles, sizeof(gRoles));
	uint8_t previousCount = gRoleCount;
	JsonArray roles = doc["roles"].as<JsonArray>();
	if (!loadRolesArray(roles))
	{
		memcpy(gRoles, previousRoles, sizeof(gRoles));
		gRoleCount = previousCount;
		return false;
	}

	DynamicJsonDocument normalized(ROLES_JSON_DOC_SIZE);
	JsonArray normalizedRoles = normalized.createNestedArray("roles");
	roles_serialize(normalizedRoles);
	if (normalized.overflowed())
	{
		memcpy(gRoles, previousRoles, sizeof(gRoles));
		gRoleCount = previousCount;
		return false;
	}
	File file = SPIFFS.open(ROLES_FILE, "w");
	if (!file)
	{
		memcpy(gRoles, previousRoles, sizeof(gRoles));
		gRoleCount = previousCount;
		return false;
	}
	size_t expected = measureJson(normalized);
	size_t written = serializeJson(normalized, file);
	file.close();
	if (written != expected)
	{
		memcpy(gRoles, previousRoles, sizeof(gRoles));
		gRoleCount = previousCount;
		return false;
	}
	return true;
}

void roles_serialize(JsonArray out)
{
	for (uint8_t i = 0; i < gRoleCount; ++i)
	{
		JsonObject role = out.createNestedObject();
		role["id"] = gRoles[i].id;
		role["name"] = gRoles[i].name;
		role["enabled"] = gRoles[i].enabled;
		role["admin"] = gRoles[i].admin;
		role["relay_mask"] = gRoles[i].relayMask;
		JsonArray schedule = role.createNestedArray("schedule");
		for (uint8_t d = 0; d < 7; ++d)
		{
			char day[25];
			maskToScheduleString(gRoles[i].schedule[d], day);
			schedule.add(day);
		}
	}
}

uint8_t roles_count()
{
	return gRoleCount;
}

const AccessRole *roles_find(int roleId)
{
	int index = findRoleIndex(roleId);
	return index >= 0 ? &gRoles[index] : NULL;
}

int roles_user_role_id(JsonObject user)
{
	if (!user.isNull())
	{
		if (user.containsKey("role_id"))
		{
			return user["role_id"] | ACCESS_ROLE_DISABLED;
		}
		if (user.containsKey("role"))
		{
			return user["role"] | ACCESS_ROLE_DISABLED;
		}
	}

	int legacyType = user["acctype"] | ACCESS_ROLE_DISABLED;
	if (legacyType == ACCESS_ADMIN)
	{
		return ACCESS_ROLE_ADMIN;
	}
	if (legacyType == ACCESS_GRANTED)
	{
		return ACCESS_ROLE_STANDARD;
	}
	return ACCESS_ROLE_DISABLED;
}

const AccessRole *roles_for_user(JsonObject user)
{
	const AccessRole *role = roles_find(roles_user_role_id(user));
	return role ? role : roles_find(ACCESS_ROLE_DISABLED);
}

int roles_legacy_access_type(const AccessRole *role)
{
	if (role == NULL || !role->enabled)
	{
		return ACCESS_DENIED;
	}
	if (role->admin)
	{
		return ACCESS_ADMIN;
	}
	return ACCESS_GRANTED;
}

bool roles_is_allowed_now(const AccessRole *role, uint8_t dayFromMonday, uint8_t hour)
{
	if (role == NULL || !role->enabled)
	{
		return false;
	}
	if (role->admin)
	{
		return true;
	}
	if (dayFromMonday >= 7 || hour >= 24)
	{
		return false;
	}
	return (role->schedule[dayFromMonday] & (1UL << hour)) != 0;
}

const char *roles_name(const AccessRole *role)
{
	return role ? role->name : "Disabled";
}

const char *roles_name_by_id(int roleId)
{
	return roles_name(roles_find(roleId));
}

uint8_t roles_relay_mask(const AccessRole *role)
{
	if (role == NULL || !role->enabled)
	{
		return 0;
	}
	if (role->admin)
	{
		return ALL_RELAYS_MASK;
	}
	return role->relayMask & ALL_RELAYS_MASK;
}
