export type KeyAssignmentKind = "none" | "keyboard" | "consumer";

export type KeyAssignment = {
  kind: KeyAssignmentKind;
  modifier: number;
  usage: number;
  keycodes: number[];
  label: string;
};

export type LayerKeymap = KeyAssignment[];

export type DeviceKeymap = LayerKeymap[];

export function createBlankAssignment(): KeyAssignment {
  return normalizeAssignment({ kind: "none" });
}

export function createKeyboardAssignment(
  usage: number,
  modifier = 0,
  keycodes: number[] = [usage],
): KeyAssignment {
  return normalizeAssignment({ kind: "keyboard", modifier, usage, keycodes });
}

export function createConsumerAssignment(usage: number): KeyAssignment {
  return normalizeAssignment({ kind: "consumer", usage });
}

export function normalizeAssignment(
  assignment: Partial<KeyAssignment> & { kind: KeyAssignmentKind },
): KeyAssignment {
  const kind = assignment.kind;

  if (kind === "none") {
    return {
      kind,
      modifier: 0,
      usage: 0,
      keycodes: createEmptyKeycodes(),
      label: "Blank",
    };
  }

  if (kind === "consumer") {
    const usage = clampBytePair(assignment.usage ?? 0);

    return {
      kind,
      modifier: 0,
      usage,
      keycodes: createEmptyKeycodes(),
      label: consumerLabels[usage] ?? `Consumer ${formatHex(usage, 4)}`,
    };
  }

  const keycodes = normalizeKeycodes(assignment.keycodes ?? [assignment.usage ?? 0]);
  const usage = keycodes[0] ?? 0;
  const modifier = clampByte(assignment.modifier ?? 0);
  const prefix = formatModifier(modifier);
  const label = keyboardLabels[usage] ?? `Key ${formatHex(usage)}`;

  return {
    kind,
    modifier,
    usage,
    keycodes,
    label: prefix ? `${prefix}+${label}` : label,
  };
}

export function formatHex(value: number, width = 2) {
  return `0x${value.toString(16).toUpperCase().padStart(width, "0")}`;
}

function createEmptyKeycodes() {
  return [0, 0, 0, 0, 0, 0];
}

function normalizeKeycodes(keycodes: number[]) {
  const next = createEmptyKeycodes();

  for (let i = 0; i < next.length && i < keycodes.length; i++) {
    next[i] = clampByte(keycodes[i] ?? 0);
  }

  return next;
}

function clampByte(value: number) {
  return Math.max(0, Math.min(0xff, Math.trunc(value)));
}

function clampBytePair(value: number) {
  return Math.max(0, Math.min(0xffff, Math.trunc(value)));
}

function formatModifier(modifier: number) {
  const names = [
    [0x01, "Ctrl"],
    [0x02, "Shift"],
    [0x04, "Alt"],
    [0x08, "Meta"],
    [0x10, "RCtrl"],
    [0x20, "RShift"],
    [0x40, "RAlt"],
    [0x80, "RMeta"],
  ] as const;

  return names
    .filter(([bit]) => (modifier & bit) !== 0)
    .map(([, name]) => name)
    .join("+");
}

const keyboardLabels: Record<number, string> = {
  0x00: "None",
  0x04: "A",
  0x05: "B",
  0x06: "C",
  0x07: "D",
  0x08: "E",
  0x09: "F",
  0x0a: "G",
  0x0b: "H",
  0x0c: "I",
  0x0d: "J",
  0x0e: "K",
  0x0f: "L",
  0x10: "M",
  0x11: "N",
  0x12: "O",
  0x13: "P",
  0x14: "Q",
  0x15: "R",
  0x16: "S",
  0x17: "T",
  0x18: "U",
  0x19: "V",
  0x1a: "W",
  0x1b: "X",
  0x1c: "Y",
  0x1d: "Z",
  0x2c: "Space",
  0x4a: "Home",
  0x4b: "Page Up",
  0x4d: "End",
  0x4e: "Page Down",
  0x4f: "Right",
  0x50: "Left",
  0x51: "Down",
  0x52: "Up",
};

const consumerLabels: Record<number, string> = {
  0x006f: "Brightness +",
  0x0070: "Brightness -",
  0x00b5: "Next",
  0x00b6: "Previous",
  0x00cd: "Play/Pause",
  0x00e2: "Mute",
  0x00e9: "Volume +",
  0x00ea: "Volume -",
};
