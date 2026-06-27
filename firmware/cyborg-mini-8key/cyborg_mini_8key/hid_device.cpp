#include "hid_device.h"

#include "Adafruit_TinyUSB.h"
#include "config.h"
#include "hid_report_descriptor.h"
#include "hid_reports.h"
#include "key_assignment.h"
#include "keymap.h"
#include "keymap_storage.h"
#include "readme_drive.h"

bool remapperConnected();

namespace {

Adafruit_USBD_HID usbHid(
  hidReportDescriptor(),
  hidReportDescriptorSize(),
  HID_ITF_PROTOCOL_KEYBOARD,
  2,
  false
);
uint32_t lastRemapperHeartbeatMs = 0;
bool consumerReleasePending = false;
uint32_t consumerReleaseDueUs = 0;

uint8_t keyboardReportIdFor(uint8_t keyIndex) {
  return static_cast<uint8_t>(RID_KEYBOARD_1 + keyIndex);
}

void sendConfigResponse(ConfigCommand command, ConfigStatus status, const uint8_t* payload, uint8_t length) {
  if (!usbHid.ready()) {
    return;
  }

  uint8_t report[Config::CONFIG_REPORT_SIZE] = { 0 };
  report[0] = static_cast<uint8_t>(command);
  report[1] = static_cast<uint8_t>(status);
  report[2] = length;
  if (report[2] > Config::CONFIG_REPORT_SIZE - 3) {
    report[2] = Config::CONFIG_REPORT_SIZE - 3;
  }

  for (uint8_t i = 0; i < report[2]; i++) {
    report[3 + i] = payload[i];
  }

  usbHid.sendReport(RID_CONFIG, report, sizeof(report));
}

void handleGetState() {
  const uint8_t payload[] = {
    activeLayer(),
    Config::LAYER_COUNT,
    Config::KEY_COUNT,
    Config::VIRTUAL_GROUND_COUNT,
  };

  sendConfigResponse(ConfigCommand::GetState, ConfigStatus::Ok, payload, sizeof(payload));
}

void handleSetLayer(const uint8_t* buffer, uint16_t size) {
  if (size < 2) {
    sendConfigResponse(ConfigCommand::SetLayer, ConfigStatus::InvalidLength, nullptr, 0);
    return;
  }

  const uint8_t layer = buffer[1];
  if (layer >= Config::LAYER_COUNT) {
    sendConfigResponse(ConfigCommand::SetLayer, ConfigStatus::OutOfRange, nullptr, 0);
    return;
  }

  setActiveLayer(layer);
  sendConfigResponse(ConfigCommand::SetLayer, ConfigStatus::Ok, &layer, 1);
}

void handleGetKey(const uint8_t* buffer, uint16_t size) {
  if (size < 3) {
    sendConfigResponse(ConfigCommand::GetKey, ConfigStatus::InvalidLength, nullptr, 0);
    return;
  }

  const uint8_t layer = buffer[1];
  const uint8_t keyIndex = buffer[2];
  if (layer >= Config::LAYER_COUNT || keyIndex >= Config::KEY_COUNT) {
    sendConfigResponse(ConfigCommand::GetKey, ConfigStatus::OutOfRange, nullptr, 0);
    return;
  }

  const KeyAssignment& assignment = assignmentFor(layer, keyIndex);

  uint8_t payload[12] = { 0 };
  payload[0] = layer;
  payload[1] = keyIndex;
  payload[2] = static_cast<uint8_t>(assignment.kind);
  payload[3] = assignment.modifier;
  for (uint8_t i = 0; i < Config::KEYBOARD_REPORT_SLOTS; i++) {
    payload[4 + i] = assignment.keycodes[i];
  }
  payload[10] = static_cast<uint8_t>(assignment.consumerUsage & 0xFF);
  payload[11] = static_cast<uint8_t>((assignment.consumerUsage >> 8) & 0xFF);

  sendConfigResponse(ConfigCommand::GetKey, ConfigStatus::Ok, payload, sizeof(payload));
}

void handleSetKey(const uint8_t* buffer, uint16_t size) {
  if (size < 13) {
    sendConfigResponse(ConfigCommand::SetKey, ConfigStatus::InvalidLength, nullptr, 0);
    return;
  }

  const uint8_t layer = buffer[1];
  const uint8_t keyIndex = buffer[2];
  KeyAssignment assignment = blankAssignment();
  assignment.kind = static_cast<AssignmentKind>(buffer[3]);
  assignment.modifier = buffer[4];

  if (assignment.kind != AssignmentKind::None &&
      assignment.kind != AssignmentKind::Keyboard &&
      assignment.kind != AssignmentKind::Consumer) {
    sendConfigResponse(ConfigCommand::SetKey, ConfigStatus::OutOfRange, nullptr, 0);
    return;
  }

  for (uint8_t i = 0; i < Config::KEYBOARD_REPORT_SLOTS; i++) {
    assignment.keycodes[i] = buffer[5 + i];
  }

  assignment.consumerUsage = static_cast<uint16_t>(buffer[11]) |
                             (static_cast<uint16_t>(buffer[12]) << 8);

  if (!setAssignment(layer, keyIndex, assignment)) {
    sendConfigResponse(ConfigCommand::SetKey, ConfigStatus::OutOfRange, nullptr, 0);
    return;
  }

  if (!saveAssignmentToStorage(layer, keyIndex)) {
    sendConfigResponse(ConfigCommand::SetKey, ConfigStatus::StorageError, nullptr, 0);
    return;
  }

  const uint8_t payload[] = { layer, keyIndex };
  sendConfigResponse(ConfigCommand::SetKey, ConfigStatus::Ok, payload, sizeof(payload));
}

void handleEnterBootloader() {
#if defined(ARDUINO_ARCH_RP2040)
  sendConfigResponse(ConfigCommand::EnterBootloader, ConfigStatus::Ok, nullptr, 0);
  delay(100);
  rp2040.rebootToBootloader();
#else
  sendConfigResponse(ConfigCommand::EnterBootloader, ConfigStatus::Unsupported, nullptr, 0);
#endif
}

void handleRemapperHeartbeat() {
  lastRemapperHeartbeatMs = millis();
}

void sendKeyEvent(uint8_t layer, uint8_t keyIndex, bool pressed) {
  if (!remapperConnected()) {
    return;
  }

  const uint8_t payload[] = {
    layer,
    keyIndex,
    static_cast<uint8_t>(pressed ? 1 : 0),
  };

  sendConfigResponse(ConfigCommand::KeyEvent, ConfigStatus::Ok, payload, sizeof(payload));
}

void setReportCallback(uint8_t reportId, hid_report_type_t reportType, uint8_t const* buffer, uint16_t size) {
  if (reportId != RID_CONFIG || (reportType != HID_REPORT_TYPE_OUTPUT && reportType != HID_REPORT_TYPE_FEATURE)) {
    return;
  }

  if (size == 0) {
    return;
  }

  const ConfigCommand command = static_cast<ConfigCommand>(buffer[0]);

  switch (command) {
    case ConfigCommand::GetState:
      handleGetState();
      break;
    case ConfigCommand::SetLayer:
      handleSetLayer(buffer, size);
      break;
    case ConfigCommand::GetKey:
      handleGetKey(buffer, size);
      break;
    case ConfigCommand::SetKey:
      handleSetKey(buffer, size);
      break;
    case ConfigCommand::EnterBootloader:
      handleEnterBootloader();
      break;
    case ConfigCommand::RemapperHeartbeat:
      handleRemapperHeartbeat();
      break;
    case ConfigCommand::KeyEvent:
      sendConfigResponse(command, ConfigStatus::Unsupported, nullptr, 0);
      break;
    default:
      sendConfigResponse(command, ConfigStatus::UnknownCommand, nullptr, 0);
      break;
  }
}

void sendKeyboardAssignment(uint8_t reportId, const KeyAssignment& assignment) {
  uint8_t keycodes[Config::KEYBOARD_REPORT_SLOTS] = { 0 };
  for (uint8_t i = 0; i < Config::KEYBOARD_REPORT_SLOTS; i++) {
    keycodes[i] = assignment.keycodes[i];
  }

  usbHid.keyboardReport(reportId, assignment.modifier, keycodes);
}

void releaseKeyboardReport(uint8_t reportId) {
  usbHid.keyboardRelease(reportId);
}

void sendConsumerTap(uint16_t usage) {
  if (consumerReleasePending) {
    usbHid.sendReport16(RID_CONSUMER_CONTROL, 0);
    consumerReleasePending = false;
  }

  usbHid.sendReport16(RID_CONSUMER_CONTROL, usage);
  consumerReleaseDueUs = micros() + 2000;
  consumerReleasePending = true;
}

}  // namespace

void beginHidDevice() {
#if defined(ARDUINO_ARCH_MBED) && defined(ARDUINO_ARCH_RP2040)
  TinyUSB_Device_Init(0);
#endif

  beginReadmeDrive();

  usbHid.setReportCallback(nullptr, setReportCallback);
  usbHid.begin();
}

bool hidDeviceMounted() {
  return TinyUSBDevice.mounted();
}

void updateHidDevice() {
  if (!consumerReleasePending) {
    return;
  }

  if (static_cast<uint32_t>(micros() - consumerReleaseDueUs) < 0x80000000UL) {
    usbHid.sendReport16(RID_CONSUMER_CONTROL, 0);
    consumerReleasePending = false;
  }
}

bool remapperConnected() {
  if (lastRemapperHeartbeatMs == 0) {
    return false;
  }

  if (millis() - lastRemapperHeartbeatMs > Config::REMAPPER_HEARTBEAT_TIMEOUT_MS) {
    lastRemapperHeartbeatMs = 0;
    return false;
  }

  return true;
}

void sendKeyChanges(uint8_t oldMask, uint8_t newMask, uint8_t layer) {
  if (TinyUSBDevice.suspended()) {
    TinyUSBDevice.remoteWakeup();
    return;
  }

  if (!usbHid.ready()) {
    return;
  }

  const uint8_t changed = oldMask ^ newMask;
  const bool remapperActive = remapperConnected();

  for (uint8_t keyIndex = 0; keyIndex < Config::KEY_COUNT; keyIndex++) {
    const uint8_t bit = static_cast<uint8_t>(1U << keyIndex);
    if ((changed & bit) == 0) {
      continue;
    }

    const uint8_t reportId = keyboardReportIdFor(keyIndex);
    const bool pressed = (newMask & bit) != 0;
    const KeyAssignment& assignment = assignmentFor(layer, keyIndex);

    if (pressed && remapperActive) {
      sendKeyEvent(layer, keyIndex, pressed);
    }

    if (!pressed) {
      releaseKeyboardReport(reportId);
      continue;
    }

    if (remapperActive) {
      releaseKeyboardReport(reportId);
      continue;
    }

    switch (assignment.kind) {
      case AssignmentKind::Keyboard:
        sendKeyboardAssignment(reportId, assignment);
        break;
      case AssignmentKind::Consumer:
        sendConsumerTap(assignment.consumerUsage);
        break;
      case AssignmentKind::None:
      default:
        releaseKeyboardReport(reportId);
        break;
    }
  }
}
