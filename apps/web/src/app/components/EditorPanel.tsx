import { modifierOptions } from "../../features/keymap/keyPickerOptions";
import {
  formatHex,
  formatModifier,
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
  const modifierChoices = [{ value: 0, label: "None" }, ...modifierOptions.map((option) => ({
    value: option.modifier,
    label: option.label,
  }))];

  if (
    modifierValue !== 0 &&
    !modifierChoices.some((choice) => choice.value === modifierValue)
  ) {
    modifierChoices.push({
      value: modifierValue,
      label: formatModifier(modifierValue),
    });
  }

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

      <label>
        <span>Modifier</span>
        <select
          value={modifierValue}
          disabled={draftAssignment.kind !== "keyboard"}
          onChange={(event) => onUpdateModifier(Number(event.currentTarget.value))}
        >
          {modifierChoices.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
      </label>

      <label className="modifier-summary">
        <span>Modifier</span>
        <div>{draftAssignment.kind === "keyboard" ? draftAssignment.label : "-"}</div>
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
