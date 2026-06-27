import type { KeyAssignment } from "../keymap/keymapTypes";
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
  return response.payload;
}

export async function setDeviceKey(
  transport: WebHidTransport,
  layer: number,
  keyIndex: number,
  assignment: KeyAssignment,
) {
  const payload = new Uint8Array(12);
  payload[0] = layer;
  payload[1] = keyIndex;
  payload[2] = encodeAssignmentKind(assignment.kind);
  payload[3] = assignment.modifier;

  if (assignment.kind === "keyboard") {
    payload[4] = assignment.usage & 0xff;
  }

  if (assignment.kind === "consumer") {
    payload[10] = assignment.usage & 0xff;
    payload[11] = (assignment.usage >> 8) & 0xff;
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
