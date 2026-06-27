#include "key_scanner.h"

#include "config.h"

#ifndef digitalReadFast
#define digitalReadFast digitalRead
#endif

namespace {

uint8_t stableMask = 0;
uint8_t lastRawMask = 0;
uint8_t oldStableMask = 0;
uint32_t lastRawChangeUs = 0;

uint8_t readRawKeyMask() {
  uint8_t mask = 0;

  for (uint8_t i = 0; i < Config::KEY_COUNT; i++) {
    if (!digitalReadFast(Config::KEY_PINS[i])) {
      mask |= static_cast<uint8_t>(1U << i);
    }
  }

  return mask;
}

}  // namespace

void beginKeyScanner() {
  for (uint8_t i = 0; i < Config::VIRTUAL_GROUND_COUNT; i++) {
    digitalWrite(Config::VIRTUAL_GROUND_PINS[i], LOW);
    pinMode(Config::VIRTUAL_GROUND_PINS[i], OUTPUT);
  }

  for (uint8_t i = 0; i < Config::KEY_COUNT; i++) {
    pinMode(Config::KEY_PINS[i], INPUT_PULLUP);
  }

  stableMask = readRawKeyMask();
  oldStableMask = stableMask;
  lastRawMask = stableMask;
  lastRawChangeUs = micros();
}

bool updateKeyScanner(bool lowLatencyPress) {
  const uint8_t rawMask = readRawKeyMask();
  const uint32_t nowUs = micros();

  if (rawMask != lastRawMask) {
    lastRawMask = rawMask;
    lastRawChangeUs = nowUs;

    if (lowLatencyPress) {
      const uint8_t newlyPressed = rawMask & ~stableMask;
      if (newlyPressed != 0) {
        oldStableMask = stableMask;
        stableMask |= newlyPressed;
        return true;
      }
    }

    return false;
  }

  if (rawMask == stableMask) {
    return false;
  }

  if (static_cast<uint32_t>(nowUs - lastRawChangeUs) < Config::DEBOUNCE_US) {
    return false;
  }

  oldStableMask = stableMask;
  stableMask = rawMask;
  return true;
}

uint8_t currentKeyMask() {
  return stableMask;
}

uint8_t previousKeyMask() {
  return oldStableMask;
}
