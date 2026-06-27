import { HARDWARE_CONFIG } from "../hardware/hardwareConfig";
import {
  createBlankAssignment,
  createConsumerAssignment,
  createKeyboardAssignment,
  type DeviceKeymap,
} from "./keymapTypes";

export function createInitialKeymap(): DeviceKeymap {
  const keymap = Array.from({ length: HARDWARE_CONFIG.layerCount }, () =>
    Array.from({ length: HARDWARE_CONFIG.keyCount }, createBlankAssignment),
  );

  keymap[0] = [
    createConsumerAssignment(0x0070),
    createConsumerAssignment(0x006f),
    createConsumerAssignment(0x00e2),
    createConsumerAssignment(0x00ea),
    createConsumerAssignment(0x00e9),
    createConsumerAssignment(0x00b6),
    createConsumerAssignment(0x00cd),
    createConsumerAssignment(0x00b5),
  ];

  keymap[1] = [
    createKeyboardAssignment(0x14),
    createKeyboardAssignment(0x1a),
    createKeyboardAssignment(0x08),
    createKeyboardAssignment(0x15),
    createKeyboardAssignment(0x04),
    createKeyboardAssignment(0x16),
    createKeyboardAssignment(0x07),
    createKeyboardAssignment(0x09),
  ];

  keymap[2] = [
    createKeyboardAssignment(0x52),
    createKeyboardAssignment(0x51),
    createKeyboardAssignment(0x50),
    createKeyboardAssignment(0x4f),
    createKeyboardAssignment(0x4a),
    createKeyboardAssignment(0x4d),
    createKeyboardAssignment(0x4b),
    createKeyboardAssignment(0x4e),
  ];

  return keymap;
}
