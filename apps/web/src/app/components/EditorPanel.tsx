import { modifierOptions } from "../../features/keymap/keyPickerOptions";
import {
  formatHex,
  type KeyAssignment,
  type KeyAssignmentKind,
} from "../../features/keymap/keymapTypes";
import { t } from "../../shared/i18n";

type EditorPanelProps = {
  selectedKey: number;
  draftAssignment: KeyAssignment;
  onUpdateKind: (kind: KeyAssignmentKind) => void;
  onUpdateUsage: (usage: number) => void;
  modifierSlots: number[];
  onUpdateModifierSlot: (index: number, modifier: number) => void;
};

export function EditorPanel({
  selectedKey,
  draftAssignment,
  onUpdateKind,
  onUpdateUsage,
  modifierSlots,
  onUpdateModifierSlot,
}: EditorPanelProps) {
  return (
    <aside className="panel editor-panel">
      <div className="panel-heading compact">
        <div className="panel-meta">
          <span className="panel-kicker">{t.assignment.kicker}</span>
          <h2>{t.keymap.key(selectedKey + 1)}</h2>
        </div>
      </div>

      <label>
        <span>{t.assignment.type}</span>
        <select
          value={draftAssignment.kind}
          onChange={(event) => onUpdateKind(event.currentTarget.value as KeyAssignmentKind)}
        >
          <option value="none">{t.assignment.none}</option>
          <option value="keyboard">{t.assignment.keyboard}</option>
          <option value="consumer">{t.assignment.consumer}</option>
        </select>
      </label>

      <label>
        <span>{t.assignment.usage}</span>
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
        <span>{t.assignment.modifier}</span>
        <div className="modifier-selects">
          {modifierSlots.map((value, index) => (
            <select
              key={index}
              value={value}
              disabled={draftAssignment.kind !== "keyboard"}
              onChange={(event) => onUpdateModifierSlot(index, Number(event.currentTarget.value))}
            >
              <option value={0}>{t.assignment.none}</option>
              {modifierOptions.map((option) => (
                <option
                  key={option.modifier}
                  value={option.modifier}
                  disabled={
                    value !== option.modifier &&
                    modifierSlots.some((selectedModifier) => selectedModifier === option.modifier)
                  }
                >
                  {option.label}
                </option>
              ))}
            </select>
          ))}
        </div>
      </label>

      <dl className="assignment-summary">
        <div>
          <dt>{t.assignment.label}</dt>
          <dd>{draftAssignment.label}</dd>
        </div>
        <div>
          <dt>{t.assignment.usageHex}</dt>
          <dd>{formatHex(draftAssignment.usage, draftAssignment.kind === "consumer" ? 4 : 2)}</dd>
        </div>
      </dl>
    </aside>
  );
}
