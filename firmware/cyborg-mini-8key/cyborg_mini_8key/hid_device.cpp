#include "hid_device.h"

#include "Adafruit_TinyUSB.h"
#include "config.h"
#include "hid_reports.h"
#include "key_assignment.h"
#include "keymap.h"
#include "keymap_storage.h"

namespace {

uint8_t const descHidReport[] = {
  TUD_HID_REPORT_DESC_KEYBOARD(HID_REPORT_ID(RID_KEYBOARD_1)),
  TUD_HID_REPORT_DESC_KEYBOARD(HID_REPORT_ID(RID_KEYBOARD_2)),
  TUD_HID_REPORT_DESC_KEYBOARD(HID_REPORT_ID(RID_KEYBOARD_3)),
  TUD_HID_REPORT_DESC_KEYBOARD(HID_REPORT_ID(RID_KEYBOARD_4)),
  TUD_HID_REPORT_DESC_KEYBOARD(HID_REPORT_ID(RID_KEYBOARD_5)),
  TUD_HID_REPORT_DESC_KEYBOARD(HID_REPORT_ID(RID_KEYBOARD_6)),
  TUD_HID_REPORT_DESC_KEYBOARD(HID_REPORT_ID(RID_KEYBOARD_7)),
  TUD_HID_REPORT_DESC_KEYBOARD(HID_REPORT_ID(RID_KEYBOARD_8)),
  TUD_HID_REPORT_DESC_CONSUMER(HID_REPORT_ID(RID_CONSUMER_CONTROL)),

  0x06, 0x00, 0xFF,                    // Usage Page (Vendor Defined)
  0x09, 0x01,                          // Usage (Vendor Usage 1)
  0xA1, 0x01,                          // Collection (Application)
  0x85, RID_CONFIG,                    // Report ID
  0x15, 0x00,                          // Logical Minimum (0)
  0x26, 0xFF, 0x00,                    // Logical Maximum (255)
  0x75, 0x08,                          // Report Size (8)
  0x95, Config::CONFIG_REPORT_SIZE,    // Report Count
  0x09, 0x01,                          // Usage (Vendor Usage 1)
  0x81, 0x02,                          // Input (Data, Variable, Absolute)
  0x95, Config::CONFIG_REPORT_SIZE,    // Report Count
  0x09, 0x02,                          // Usage (Vendor Usage 2)
  0x91, 0x02,                          // Output (Data, Variable, Absolute)
  0x95, Config::CONFIG_REPORT_SIZE,    // Report Count
  0x09, 0x03,                          // Usage (Vendor Usage 3)
  0xB1, 0x02,                          // Feature (Data, Variable, Absolute)
  0xC0,                                // End Collection
};

Adafruit_USBD_HID usbHid(descHidReport, sizeof(descHidReport), HID_ITF_PROTOCOL_KEYBOARD, 2, false);

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
  usbHid.sendReport16(RID_CONSUMER_CONTROL, usage);
  delay(2);
  usbHid.sendReport16(RID_CONSUMER_CONTROL, 0);
}

}  // namespace

void beginHidDevice() {
#if defined(ARDUINO_ARCH_MBED) && defined(ARDUINO_ARCH_RP2040)
  TinyUSB_Device_Init(0);
#endif

  usbHid.setReportCallback(nullptr, setReportCallback);
  usbHid.begin();
}

bool hidDeviceMounted() {
  return TinyUSBDevice.mounted();
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

  for (uint8_t keyIndex = 0; keyIndex < Config::KEY_COUNT; keyIndex++) {
    const uint8_t bit = static_cast<uint8_t>(1U << keyIndex);
    if ((changed & bit) == 0) {
      continue;
    }

    const uint8_t reportId = keyboardReportIdFor(keyIndex);
    const bool pressed = (newMask & bit) != 0;
    const KeyAssignment& assignment = assignmentFor(layer, keyIndex);

    if (!pressed) {
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
