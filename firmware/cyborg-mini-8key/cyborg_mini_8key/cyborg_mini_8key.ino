#include "hid_device.h"
#include "key_scanner.h"
#include "keymap.h"
#include "status_led.h"

#if defined(ARDUINO_ARCH_RP2040)
#include "pico/time.h"
#endif

namespace {

constexpr uint32_t IDLE_SLEEP_US = 100;
constexpr uint32_t REMAPPER_SLEEP_US = 1000;

void sleepBetweenScans(bool remapperActive) {
#if defined(ARDUINO_ARCH_RP2040)
  sleep_us(remapperActive ? REMAPPER_SLEEP_US : IDLE_SLEEP_US);
#else
  (void)remapperActive;
#endif
}

}  // namespace

void setup() {
  beginStatusLed();
  beginKeymap();
  beginKeyScanner();
  beginHidDevice();
}

void loop() {
  const bool remapperActive = remapperConnected();

  if (updateKeyScanner(!remapperActive)) {
    sendKeyChanges(previousKeyMask(), currentKeyMask(), activeLayer());
  }

  updateHidDevice();
  updateStatusHeartbeat(hidDeviceMounted(), remapperActive);
  sleepBetweenScans(remapperActive);
}
