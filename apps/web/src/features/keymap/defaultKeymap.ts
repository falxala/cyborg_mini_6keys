import { HARDWARE_CONFIG } from "../hardware/hardwareConfig";
import {
  createBlankAssignment,
  type DeviceKeymap,
} from "./keymapTypes";

export function createInitialKeymap(): DeviceKeymap {
  return Array.from({ length: HARDWARE_CONFIG.layerCount }, () =>
    Array.from({ length: HARDWARE_CONFIG.keyCount }, createBlankAssignment),
  );
}
