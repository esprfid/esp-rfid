struct Config {
#ifdef OFFICIALBOARD
    int relayPin[MAX_NUM_RELAYS] = {13};
#else
    int relayPin[MAX_NUM_RELAYS];
#endif
    uint8_t accessdeniedpin = 255;
    unsigned long activateTime[MAX_NUM_RELAYS];
    unsigned long autoRestartIntervalSeconds = 0;
    char *deviceHostname = NULL;
    uint8_t doorbellpin = 255;
    uint8_t doorstatpin = 255;
    char *httpPass = NULL;
    int lockType[MAX_NUM_RELAYS];
    uint8_t maxOpenDoorTime = 0;
    int mqttEnabled = 0;
    bool mqttEvents = false;	  // Sends events over MQTT disables SPIFFS file logging
    bool mqttHA = false; // Sends events over simple MQTT topics and AutoDiscovery
    char *mqttHost = NULL;
    unsigned long mqttInterval = 180; // Add to GUI & json config
    char *mqttPass = NULL;
    int mqttPort;
    char *mqttTopic = NULL;
    char *mqttUser = NULL;
    int numRelays = 1;
    uint8_t openlockpin = 255;
    bool pinCodeRequested;
    int readertype;
    int relayType[MAX_NUM_RELAYS];
    int timeZone;
	uint8_t wifipin = 255;
    unsigned long wifiTimeout = 0;
    int wmode;
};