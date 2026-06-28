#include "hid_device.h"
#include "config.h"
#include "key_scanner.h"
#include "keymap.h"
#include "serial_rescue.h"
#include "status_led.h"

#if defined(ARDUINO_ARCH_RP2040)
#include "pico/time.h"
#endif

namespace {

void sleepBetweenScans(bool remapperActive) {
#if defined(ARDUINO_ARCH_RP2040)
  sleep_us(remapperActive ? Config::REMAPPER_SCAN_SLEEP_US : Config::IDLE_SCAN_SLEEP_US);
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
  beginSerialRescue();
}

void loop() {
  const bool remapperActive = remapperConnected();
  const bool rescueActive = serialRescueActive();
  const bool configActive = remapperActive || rescueActive;

  if (updateKeyScanner(!configActive) && !rescueActive) {
    sendKeyChanges(previousKeyMask(), currentKeyMask(), activeLayer());
  }

  updateHidDevice();
  updateSerialRescue();
  updateStatusHeartbeat(hidDeviceMounted(), configActive);
  sleepBetweenScans(configActive);
}
