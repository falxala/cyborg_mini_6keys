#include "status_led.h"

#include <Adafruit_NeoPixel.h>

#include "config.h"

namespace {

uint32_t lastUpdateMs = 0;
bool heartbeatState = false;
uint8_t colorWheelPosition = 0;
Adafruit_NeoPixel statusPixel(1, Config::STATUS_LED_PIN, NEO_GRB + NEO_KHZ800);

uint32_t colorWheel(uint8_t position) {
  position = 255 - position;

  if (position < 85) {
    return statusPixel.Color(255 - position * 3, 0, position * 3);
  }

  if (position < 170) {
    position -= 85;
    return statusPixel.Color(0, position * 3, 255 - position * 3);
  }

  position -= 170;
  return statusPixel.Color(position * 3, 255 - position * 3, 0);
}

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
    statusPixel.setPixelColor(0, on ? colorWheel(colorWheelPosition) : 0);
    statusPixel.show();
  }
}

void updateStatusHeartbeat(bool mounted) {
  if (!mounted) {
    setStatusLed(false);
    heartbeatState = false;
    lastUpdateMs = 0;
    return;
  }

  const uint32_t now = millis();

  if (Config::STATUS_LED_KIND == Config::StatusLedKind::NeoPixel) {
    if (lastUpdateMs != 0 && now - lastUpdateMs < Config::STATUS_COLOR_WHEEL_MS) {
      return;
    }

    lastUpdateMs = now;
    colorWheelPosition += 2;
    statusPixel.setPixelColor(0, colorWheel(colorWheelPosition));
    statusPixel.show();
    return;
  }

  if (Config::STATUS_LED_KIND == Config::StatusLedKind::Digital) {
    if (lastUpdateMs != 0 && now - lastUpdateMs < Config::STATUS_DIGITAL_HEARTBEAT_MS) {
      return;
    }

    lastUpdateMs = now;
    heartbeatState = !heartbeatState;
    setStatusLed(heartbeatState);
  }
}
