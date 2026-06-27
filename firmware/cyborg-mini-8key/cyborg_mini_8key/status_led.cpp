#include "status_led.h"

#include <Adafruit_NeoPixel.h>

#include "config.h"

namespace {

uint32_t lastToggleMs = 0;
bool heartbeatState = false;
Adafruit_NeoPixel statusPixel(1, Config::STATUS_LED_PIN, NEO_GRB + NEO_KHZ800);

}  // namespace

void beginStatusLed() {
  if (Config::STATUS_LED_KIND == Config::StatusLedKind::Digital) {
    pinMode(Config::STATUS_LED_PIN, OUTPUT);
  } else if (Config::STATUS_LED_KIND == Config::StatusLedKind::NeoPixel) {
    statusPixel.begin();
    statusPixel.setBrightness(Config::STATUS_LED_BRIGHTNESS);
  }

  setStatusLed(false);
}

void setStatusLed(bool on) {
  if (Config::STATUS_LED_KIND == Config::StatusLedKind::Digital) {
    digitalWrite(Config::STATUS_LED_PIN, on ? HIGH : LOW);
  } else if (Config::STATUS_LED_KIND == Config::StatusLedKind::NeoPixel) {
    statusPixel.setPixelColor(0, on ? statusPixel.Color(0, 0, 24) : 0);
    statusPixel.show();
  }
}

void updateStatusHeartbeat(bool mounted) {
  if (!mounted) {
    setStatusLed(false);
    heartbeatState = false;
    return;
  }

  const uint32_t now = millis();
  if (now - lastToggleMs < Config::STATUS_HEARTBEAT_MS) {
    return;
  }

  lastToggleMs = now;
  heartbeatState = !heartbeatState;
  setStatusLed(heartbeatState);
}
