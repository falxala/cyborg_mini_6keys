#pragma once

#include <Arduino.h>

enum HidReportId : uint8_t {
  RID_KEYBOARD_1 = 1,
  RID_KEYBOARD_2,
  RID_KEYBOARD_3,
  RID_KEYBOARD_4,
  RID_KEYBOARD_5,
  RID_KEYBOARD_6,
  RID_KEYBOARD_7,
  RID_KEYBOARD_8,
  RID_CONSUMER_CONTROL,
  RID_CONFIG,
};

enum class ConfigCommand : uint8_t {
  None = 0x00,
  GetState = 0x01,
  SetLayer = 0x02,
  GetKey = 0x03,
  SetKey = 0x04,
};

enum class ConfigStatus : uint8_t {
  Ok = 0x00,
  InvalidLength = 0x01,
  OutOfRange = 0x02,
  StorageError = 0x03,
  UnknownCommand = 0xFF,
};
