#include "hid_device.h"
#include "key_scanner.h"
#include "keymap.h"
#include "status_led.h"

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
}
