import { modifierOptions } from "../../features/keymap/keyPickerOptions";
import {
  formatHex,
  type KeyAssignment,
  type KeyAssignmentKind,
} from "../../features/keymap/keymapTypes";

type EditorPanelProps = {
  selectedKey: number;
  connected: boolean;
  draftAssignment: KeyAssignment;
  onRead: () => void;
  onSave: () => void;
  onUpdateKind: (kind: KeyAssignmentKind) => void;
  onUpdateUsage: (usage: number) => void;
  onUpdateModifier: (modifier: number) => void;
};

export function EditorPanel({
  selectedKey,
  connected,
  draftAssignment,
  onRead,
  onSave,
  onUpdateKind,
  onUpdateUsage,
  onUpdateModifier,
}: EditorPanelProps) {
  const modifierValue = draftAssignment.kind === "keyboard" ? draftAssignment.modifier : 0;
  const selectedModifiers = selectedModifiersFromMask(modifierValue);

  return (
    <aside className="panel editor-panel">
      <div className="panel-heading compact">
        <div className="panel-meta">
          <span className="panel-kicker">Assignment</span>
          <h2>K{selectedKey + 1}</h2>
        </div>
        <div className="editor-actions">
          <button type="button" onClick={onRead} disabled={!connected}>
            Read
          </button>
          <button type="button" className="primary-action" onClick={onSave} disabled={!connected}>
            Save
          </button>
        </div>
      </div>

      <label>
        <span>Type</span>
        <select
          value={draftAssignment.kind}
          onChange={(event) => onUpdateKind(event.currentTarget.value as KeyAssignmentKind)}
        >
          <option value="none">None</option>
          <option value="keyboard">Keyboard</option>
          <option value="consumer">Consumer</option>
        </select>
      </label>

      <label>
        <span>Usage</span>
        <input
          type="number"
          min={0}
          max={draftAssignment.kind === "consumer" ? 65535 : 255}
          value={draftAssignment.usage}
          disabled={draftAssignment.kind === "none"}
          onChange={(event) => onUpdateUsage(Number(event.currentTarget.value))}
        />
      </label>

      <label className="modifier-field">
        <span>Modifier</span>
        <div className="modifier-selects">
          {selectedModifiers.map((value, index) => (
            <select
              key={index}
              value={value}
              disabled={draftAssignment.kind !== "keyboard"}
              onChange={(event) =>
                onUpdateModifier(updateModifierMask(selectedModifiers, index, Number(event.currentTarget.value)))
              }
            >
              <option value={0}>None</option>
              {modifierOptions.map((option) => (
                <option key={option.modifier} value={option.modifier}>
                  {option.label}
                </option>
              ))}
            </select>
          ))}
        </div>
      </label>

      <dl className="assignment-summary">
        <div>
          <dt>Label</dt>
          <dd>{draftAssignment.label}</dd>
        </div>
        <div>
          <dt>Usage hex</dt>
          <dd>{formatHex(draftAssignment.usage, draftAssignment.kind === "consumer" ? 4 : 2)}</dd>
        </div>
      </dl>
    </aside>
  );
}

function selectedModifiersFromMask(mask: number) {
  const values = modifierOptions
    .filter((option) => (mask & option.modifier) !== 0)
    .map((option) => option.modifier)
    .slice(0, 3);

  while (values.length < 3) {
    values.push(0);
  }

  return values;
}

function updateModifierMask(current: number[], index: number, nextValue: number) {
  const next = current.map((value, currentIndex) => (currentIndex === index ? nextValue : value));
  let mask = 0;

  for (const value of next) {
    if (value !== 0) {
      mask |= value;
    }
  }

  return mask;
}
