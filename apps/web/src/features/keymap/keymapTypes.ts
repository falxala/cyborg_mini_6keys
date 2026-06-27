export type KeyAssignmentKind = "none" | "keyboard" | "consumer";

export type KeyAssignment = {
  kind: KeyAssignmentKind;
  modifier: number;
  usage: number;
  label: string;
};

export type LayerKeymap = KeyAssignment[];

export type DeviceKeymap = LayerKeymap[];

export function createBlankAssignment(): KeyAssignment {
  return {
    kind: "none",
    modifier: 0,
    usage: 0,
    label: "Blank",
  };
}
