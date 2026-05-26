#pragma once

#include "Arduino.h"
#include "IPAddress.h"
#include "magicnumbers.h"

#ifdef CONFIG_IDF_TARGET_ESP32C3
#define ESP_RFID_FIRMWARE_TARGET "esp32c3"
// ESP32-C3: GPIO 11-17 reserved for flash, 18-19 USB, 20-21 UART0
#define DEFAULT_RS485_UART     1
#define DEFAULT_RS485_TX_PIN   4
#define DEFAULT_RS485_RX_PIN   5
#define DEFAULT_RS485_DERE_PIN 3
#define DEFAULT_PN532_SCK_PIN  6
#define DEFAULT_PN532_MISO_PIN 2
#define DEFAULT_PN532_MOSI_PIN 7
#define DEFAULT_PN532_SS_PIN   10
#define DEFAULT_PN532_RST_PIN  9
#elif defined(ESP32)
#define ESP_RFID_FIRMWARE_TARGET "esp32"
#define DEFAULT_RS485_UART     2
#define DEFAULT_RS485_TX_PIN   17
#define DEFAULT_RS485_RX_PIN   16
#define DEFAULT_RS485_DERE_PIN 4
#define DEFAULT_PN532_SCK_PIN  18
#define DEFAULT_PN532_MISO_PIN 19
#define DEFAULT_PN532_MOSI_PIN 23
#define DEFAULT_PN532_SS_PIN   5
#define DEFAULT_PN532_RST_PIN  27
#else
#define ESP_RFID_FIRMWARE_TARGET "esp8266"
#define DEFAULT_RS485_UART     2
#define DEFAULT_RS485_TX_PIN   17
#define DEFAULT_RS485_RX_PIN   16
#define DEFAULT_RS485_DERE_PIN 4
#define DEFAULT_PN532_SCK_PIN  18
#define DEFAULT_PN532_MISO_PIN 19
#define DEFAULT_PN532_MOSI_PIN 23
#define DEFAULT_PN532_SS_PIN   5
#define DEFAULT_PN532_RST_PIN  27
#endif

struct SecureReaderConfig {
    bool enabled = false;
    const char *backendName = "PN532_DESFIRE";
    const char *readerId = "door_01";
    uint32_t desfireAid = 0x564F4C;
    uint8_t desfireFileId = 0x01;
    uint8_t desfireKeyNumber = 0;
    const char *desfireFileCommMode = "plain";
    uint8_t aesKey[16] = {0};
    int rs485Uart = DEFAULT_RS485_UART;
    int rs485BaudRate = 115200;
    int rs485TxPin = DEFAULT_RS485_TX_PIN;
    int rs485RxPin = DEFAULT_RS485_RX_PIN;
    int rs485DeRePin = DEFAULT_RS485_DERE_PIN;
    int pn532SckPin = DEFAULT_PN532_SCK_PIN;
    int pn532MisoPin = DEFAULT_PN532_MISO_PIN;
    int pn532MosiPin = DEFAULT_PN532_MOSI_PIN;
    int pn532SsPin = DEFAULT_PN532_SS_PIN;
    int pn532ResetPin = DEFAULT_PN532_RST_PIN;
    unsigned long cardDebounceMs = 1500;
    unsigned long heartbeatIntervalMs = 10000;
    bool debugUid = false;
};

struct Config {
    int relayPin[MAX_NUM_RELAYS];
    uint8_t accessdeniedpin = 255;
    bool accessPointMode = false;
    IPAddress accessPointIp;
    IPAddress accessPointSubnetIp;
    unsigned long activateTime[MAX_NUM_RELAYS];
    unsigned long autoRestartIntervalSeconds = 0;
    unsigned long beeperInterval = 0;
    unsigned long beeperOffTime = 0;
    uint8_t beeperpin = 255;
    byte bssid[6] = {0, 0, 0, 0, 0, 0};
    char *deviceHostname = NULL;
    bool dhcpEnabled = true;
    IPAddress dnsIp;
    uint8_t doorbellpin = 255;
    char *doorName[MAX_NUM_RELAYS];
    uint8_t doorstatpin = 255;
    bool fallbackMode = false;
    IPAddress gatewayIp;
    char *httpPass = NULL;
    IPAddress ipAddress;
    uint8_t ledwaitingpin = 255;
    int lockType[MAX_NUM_RELAYS];
    uint8_t maxOpenDoorTime = 0;
    bool mqttAutoTopic = false;
    bool mqttEnabled = false;
    bool mqttEvents = false;	  // Sends events over MQTT disables SPIFFS file logging
    bool mqttHA = false; // Sends events over simple MQTT topics and AutoDiscovery
    char *mqttHost = NULL;
    unsigned long mqttInterval = 180; // Add to GUI & json config
    char *mqttPass = NULL;
    int mqttPort;
    char *mqttTopic = NULL;
    char *mqttUser = NULL;
    bool networkHidden = false;
    char *ntpServer = NULL;
	int ntpInterval = 0;
    int numRelays = 1;
    char *openingHours[7];
    uint8_t openlockpin = 255;
    bool pinCodeRequested = false;
    bool pinCodeOnly = false;
    bool wiegandReadHex = true;
    bool present = false;
    int readertype;
    int relayType[MAX_NUM_RELAYS];
    bool removeParityBits = true;
    IPAddress subnetIp;
    const char *ssid;
    char *tzInfo = (char *)"";
    const char *wifiApIp = NULL;
    const char *wifiApSubnet = NULL;
	uint8_t wifipin = 255;
    const char *wifiPassword = NULL;
    unsigned long wifiTimeout = 0;
    SecureReaderConfig secureReader;
};
