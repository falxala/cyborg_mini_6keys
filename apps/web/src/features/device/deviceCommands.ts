import type { KeyAssignment } from "../keymap/keymapTypes";
import {
  createBlankAssignment,
  createConsumerAssignment,
  createKeyboardAssignment,
  normalizeAssignment,
} from "../keymap/keymapTypes";
import {
  assertConfigOk,
  ConfigCommand,
  createConfigReport,
  decodeConfigResponse,
  type ConfigResponse,
} from "./hidProtocol";
import type { WebHidTransport } from "./webHidTransport";

export type DeviceState = {
  activeLayer: number;
  layerCount: number;
  keyCount: number;
  virtualGroundCount: number;
};

export async function getDeviceState(transport: WebHidTransport): Promise<DeviceState> {
  const response = await sendCommand(transport, ConfigCommand.GetState);
  assertConfigOk(response);

  return {
    activeLayer: response.payload[0] ?? 0,
    layerCount: response.payload[1] ?? 0,
    keyCount: response.payload[2] ?? 0,
    virtualGroundCount: response.payload[3] ?? 0,
  };
}

export async function setDeviceLayer(transport: WebHidTransport, layer: number) {
  const response = await sendCommand(transport, ConfigCommand.SetLayer, [layer]);
  assertConfigOk(response);
}

export async function getDeviceKey(transport: WebHidTransport, layer: number, keyIndex: number) {
  const response = await sendCommand(transport, ConfigCommand.GetKey, [layer, keyIndex]);
  assertConfigOk(response);
  return decodeAssignmentPayload(response.payload);
}

export async function readDeviceKeymap(
  transport: WebHidTransport,
  layerCount: number,
  keyCount: number,
) {
  const keymap: KeyAssignment[][] = [];

  for (let layer = 0; layer < layerCount; layer++) {
    const layerAssignments: KeyAssignment[] = [];

    for (let keyIndex = 0; keyIndex < keyCount; keyIndex++) {
      layerAssignments.push(await getDeviceKey(transport, layer, keyIndex));
    }

    keymap.push(layerAssignments);
  }

  return keymap;
}

export async function setDeviceKey(
  transport: WebHidTransport,
  layer: number,
  keyIndex: number,
  assignment: KeyAssignment,
) {
  const normalized = normalizeAssignment(assignment);
  const payload = new Uint8Array(12);
  payload[0] = layer;
  payload[1] = keyIndex;
  payload[2] = encodeAssignmentKind(normalized.kind);
  payload[3] = normalized.modifier;

  if (normalized.kind === "keyboard") {
    for (let i = 0; i < 6; i++) {
      payload[4 + i] = normalized.keycodes[i] ?? 0;
    }
  }

  if (normalized.kind === "consumer") {
    payload[10] = normalized.usage & 0xff;
    payload[11] = (normalized.usage >> 8) & 0xff;
  }

  const response = await sendCommand(transport, ConfigCommand.SetKey, payload);
  assertConfigOk(response);
}

async function sendCommand(
  transport: WebHidTransport,
  command: ConfigCommand,
  payload: ArrayLike<number> = [],
): Promise<ConfigResponse> {
  const raw = await transport.requestConfigReport(createConfigReport(command, payload));
  const response = decodeConfigResponse(raw);

  if (response.command !== command) {
    throw new Error(`Unexpected HID response command ${response.command}; expected ${command}`);
  }

  return response;
}

function encodeAssignmentKind(kind: KeyAssignment["kind"]) {
  switch (kind) {
    case "keyboard":
      return 1;
    case "consumer":
      return 2;
    case "none":
    default:
      return 0;
  }
}

function decodeAssignmentPayload(payload: Uint8Array): KeyAssignment {
  const kind = payload[2] ?? 0;
  const modifier = payload[3] ?? 0;
  const keycodes = Array.from(payload.slice(4, 10));
  const consumerUsage = (payload[10] ?? 0) | ((payload[11] ?? 0) << 8);

  if (kind === 1) {
    return createKeyboardAssignment(keycodes[0] ?? 0, modifier, keycodes);
  }

  if (kind === 2) {
    return createConsumerAssignment(consumerUsage);
  }

  return createBlankAssignment();
}
