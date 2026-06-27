#include "status_led.h"

#include "config.h"

namespace {

uint32_t lastToggleMs = 0;
bool heartbeatState = false;

}  // namespace

void beginStatusLed() {
  pinMode(Config::STATUS_LED_PIN, OUTPUT);
  setStatusLed(false);
}

void setStatusLed(bool on) {
  digitalWrite(Config::STATUS_LED_PIN, on ? HIGH : LOW);
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
