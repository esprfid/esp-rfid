#pragma once

#include <stddef.h>
#include <stdint.h>

bool pn532_init();
bool pn532_wait_for_card(uint32_t timeout_ms);
bool pn532_transceive_apdu(const uint8_t *tx, size_t tx_len, uint8_t *rx, size_t *rx_len);
void pn532_release_card();
bool pn532_last_card_is_desfire();
void pn532_get_last_uid_hex(char *out_uid, size_t out_len);
