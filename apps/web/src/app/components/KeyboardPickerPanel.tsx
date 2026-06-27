import type { CSSProperties } from "react";

import {
  blankOption,
  consumerOptions,
  keyboardRows,
  keyOptionLabel,
  navigationRows,
  numpadRows,
  type ConsumerKeyOption,
  type KeyboardLayoutMode,
  type KeyPickerOption,
} from "../../features/keymap/keyPickerOptions";
import type { KeyAssignment } from "../../features/keymap/keymapTypes";

type KeyboardPickerPanelProps = {
  draftAssignment: KeyAssignment;
  keyboardLayout: KeyboardLayoutMode;
  onKeyboardLayoutChange: (layout: KeyboardLayoutMode) => void;
  onPickerOption: (option: KeyPickerOption) => void;
  onConsumerOption: (option: ConsumerKeyOption) => void;
};

export function KeyboardPickerPanel({
  draftAssignment,
  keyboardLayout,
  onKeyboardLayoutChange,
  onPickerOption,
  onConsumerOption,
}: KeyboardPickerPanelProps) {
  const systemRows = navigationRows.slice(0, 1);
  const navigationBodyRows = navigationRows.slice(1);

  function pickerOptionClassName(option: KeyPickerOption) {
    if (option.kind === "spacer") {
      return "picker-spacer";
    }

    const accent = option.accent ? " layout-accent" : "";
    const active =
      (option.kind === "blank" && draftAssignment.kind === "none") ||
      (option.kind === "key" &&
        draftAssignment.kind === "keyboard" &&
        draftAssignment.usage === option.code) ||
      (option.kind === "modifier" &&
        draftAssignment.kind === "keyboard" &&
        (draftAssignment.modifier & option.modifier) !== 0);

    return active ? `picker-key active${accent}` : `picker-key${accent}`;
  }

  function renderPickerOption(option: KeyPickerOption, key: string) {
    const width = option.kind === "spacer" ? option.width : option.width ?? 1;
    const style = { "--key-units": width } as CSSProperties;

    if (option.kind === "spacer") {
      return <span key={key} className="picker-spacer" style={style} />;
    }

    return (
      <button
        key={key}
        type="button"
        className={pickerOptionClassName(option)}
        style={style}
        onClick={() => onPickerOption(option)}
      >
        {keyOptionLabel(option, keyboardLayout)}
      </button>
    );
  }

  return (
    <section className="panel picker-panel">
      <div className="panel-heading">
        <h2>Keyboard</h2>
        <div className="layout-tabs" aria-label="Keyboard layout selector">
          <button
            type="button"
            className={keyboardLayout === "jis" ? "active" : ""}
            onClick={() => onKeyboardLayoutChange("jis")}
          >
            JIS
          </button>
          <button
            type="button"
            className={keyboardLayout === "us" ? "active" : ""}
            onClick={() => onKeyboardLayoutChange("us")}
          >
            US
          </button>
        </div>
      </div>

      <div className="consumer-board">
        <div className="consumer-strip">
          {consumerOptions.map((option) => (
            <button
              key={option.usage}
              type="button"
              className={
                draftAssignment.kind === "consumer" && draftAssignment.usage === option.usage
                  ? "picker-key active"
                  : "picker-key"
              }
              onClick={() => onConsumerOption(option)}
            >
              {option.label}
            </button>
          ))}
          {renderPickerOption(blankOption, "blank")}
        </div>
      </div>

      <div className={`keyboard-picker ${keyboardLayout}`}>
        <div className="keyboard-main">
          {keyboardRows.map((row, rowIndex) => (
            <div key={rowIndex} className="picker-row">
              {row.map((option, optionIndex) => renderPickerOption(option, `main-${rowIndex}-${optionIndex}`))}
            </div>
          ))}
        </div>

        <div className="keyboard-indicator" aria-hidden="true">
          <span>No others needed...</span>
          <strong>CYBORG</strong>
          <div>
            <i />
            <i />
            <i />
          </div>
        </div>

        <div className="keyboard-cluster system-cluster">
          {systemRows.map((row, rowIndex) => (
            <div key={rowIndex} className="picker-row compact">
              {row.map((option, optionIndex) => renderPickerOption(option, `sys-${rowIndex}-${optionIndex}`))}
            </div>
          ))}
        </div>

        <div className="keyboard-cluster navigation-cluster">
          {navigationBodyRows.map((row, rowIndex) => (
            <div key={rowIndex} className="picker-row compact">
              {row.map((option, optionIndex) => renderPickerOption(option, `nav-${rowIndex}-${optionIndex}`))}
            </div>
          ))}
        </div>

        <div className="keyboard-cluster numpad-cluster">
          {numpadRows.map((row, rowIndex) => (
            <div key={rowIndex} className="picker-row compact">
              {row.map((option, optionIndex) => renderPickerOption(option, `num-${rowIndex}-${optionIndex}`))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
