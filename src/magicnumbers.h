// reader types

#define READER_MFRC522 0
#define READER_WIEGAND 1
#define READER_PN532 2
#define READER_RDM6300 3
#define READER_MFRC522_RDM6300 4
#define READER_WIEGAND_RDM6300 5
#define READER_PN532_RDM6300 6

// timing constants

#define COOLDOWN_MILIS 2000          // Milliseconds the RFID reader will be blocked between inputs
#define KEYBOARD_TIMEOUT_MILIS 10000 // timeout in milis for keyboard input

// user related numbers

#define ACCESS_GRANTED 1
#define ACCESS_ADMIN 99
#define ACCCESS_DENIED 0

// Reader defines

#define WIEGANDTYPE_KEYPRESS4 4
#define WIEGANDTYPE_KEYPRESS8 8
#define WIEGANDTYPE_PICC26 26
#define WIEGANDTYPE_PICC34 34

// hardware defines

#define MAX_NUM_RELAYS 4

#define LOCKTYPE_MOMENTARY 0
#define LOCKTYPE_CONTINUOUS 1
