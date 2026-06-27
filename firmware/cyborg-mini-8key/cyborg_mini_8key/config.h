#pragma once

#include <Arduino.h>

namespace Config {

constexpr uint8_t KEY_COUNT = 8;
constexpr uint8_t LAYER_COUNT = 6;
constexpr uint8_t KEYBOARD_REPORT_SLOTS = 6;
constexpr uint8_t VIRTUAL_GROUND_COUNT = 2;
constexpr uint8_t CONFIG_REPORT_SIZE = 32;

constexpr uint8_t KEY_PINS[KEY_COUNT] = {
  7, 6, 5, 4, 12, 11, 10, 9
};

// These pins are driven LOW and used as virtual ground rails.
constexpr uint8_t VIRTUAL_GROUND_PINS[VIRTUAL_GROUND_COUNT] = {
  1, 8
};

enum class StatusLedKind : uint8_t {
  None,
  Digital,
  NeoPixel,
};

#if defined(PIN_NEOPIXEL)
constexpr StatusLedKind STATUS_LED_KIND = StatusLedKind::NeoPixel;
constexpr uint8_t STATUS_LED_PIN = PIN_NEOPIXEL;
#elif defined(LED_BUILTIN)
constexpr StatusLedKind STATUS_LED_KIND = StatusLedKind::Digital;
constexpr uint8_t STATUS_LED_PIN = LED_BUILTIN;
#elif defined(PIN_LED)
constexpr StatusLedKind STATUS_LED_KIND = StatusLedKind::Digital;
constexpr uint8_t STATUS_LED_PIN = PIN_LED;
#else
constexpr StatusLedKind STATUS_LED_KIND = StatusLedKind::None;
constexpr uint8_t STATUS_LED_PIN = 255;
#endif

constexpr uint8_t STATUS_LED_BRIGHTNESS = 255;
constexpr uint8_t STATUS_KEYBOARD_WHITE = 12;

constexpr uint16_t DEBOUNCE_US = 5000;
constexpr uint16_t STATUS_COLOR_WHEEL_MS = 40;
constexpr uint16_t REMAPPER_HEARTBEAT_TIMEOUT_MS = 3000;

}  // namespace Config
