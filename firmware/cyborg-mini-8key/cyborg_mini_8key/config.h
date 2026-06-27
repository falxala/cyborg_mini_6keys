#pragma once

#include <Arduino.h>

namespace Config {

constexpr uint8_t KEY_COUNT = 8;
constexpr uint8_t LAYER_COUNT = 6;
constexpr uint8_t KEYBOARD_REPORT_SLOTS = 6;
constexpr uint8_t VIRTUAL_GROUND_COUNT = 2;
constexpr uint8_t CONFIG_REPORT_SIZE = 32;

// TODO: Replace these placeholders with the final PCB pinout before flashing.
constexpr uint8_t KEY_PINS[KEY_COUNT] = {
  0, 1, 2, 3, 4, 5, 6, 7
};

// These pins are driven LOW and used as virtual ground rails.
constexpr uint8_t VIRTUAL_GROUND_PINS[VIRTUAL_GROUND_COUNT] = {
  8, 9
};

constexpr uint8_t STATUS_LED_PIN = LED_BUILTIN;

constexpr uint16_t DEBOUNCE_US = 5000;
constexpr uint16_t STATUS_HEARTBEAT_MS = 1000;

}  // namespace Config
