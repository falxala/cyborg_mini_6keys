import type { KeyAssignment } from "../features/keymap/keymapTypes";

export function updateKeymap(
  keymap: KeyAssignment[][],
  layer: number,
  keyIndex: number,
  assignment: KeyAssignment,
) {
  return keymap.map((layerAssignments, layerIndex) =>
    layerIndex === layer
      ? layerAssignments.map((current, currentKeyIndex) =>
          currentKeyIndex === keyIndex ? assignment : current,
        )
      : layerAssignments,
  );
}
