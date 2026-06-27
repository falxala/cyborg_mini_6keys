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
  if (updateKeyScanner()) {
    sendKeyChanges(previousKeyMask(), currentKeyMask(), activeLayer());
  }

  updateStatusHeartbeat(hidDeviceMounted());
}
