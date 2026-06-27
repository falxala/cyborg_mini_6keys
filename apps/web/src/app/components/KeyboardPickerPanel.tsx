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

    if (option.kind === "decoration") {
      return "picker-decor";
    }

    const accent = option.accent ? " layout-accent" : "";
    const specialShape =
      option.kind === "key"
        ? option.code === 40 && keyboardLayout === "jis"
          ? " enter-key-svg enter-key-jis"
          : option.code === 88
            ? " enter-key-svg enter-key-numpad"
            : ""
        : "";
    const active =
      (option.kind === "blank" && draftAssignment.kind === "none") ||
      (option.kind === "key" &&
        draftAssignment.kind === "keyboard" &&
        draftAssignment.usage === option.code) ||
      (option.kind === "modifier" &&
        draftAssignment.kind === "keyboard" &&
        (draftAssignment.modifier & option.modifier) !== 0);

    return active
      ? `picker-key active${accent}${specialShape}`
      : `picker-key${accent}${specialShape}`;
  }

  function renderPickerOption(option: KeyPickerOption, key: string) {
    const width = option.kind === "spacer" ? option.width : option.width ?? 1;
    const style = { "--key-units": width } as CSSProperties;

    if (option.kind === "spacer") {
      return <span key={key} className="picker-spacer" style={style} />;
    }

    if (option.kind === "decoration") {
      if (option.decoration === "jis-enter-lower" && keyboardLayout !== "jis") {
        return null;
      }

      return <span key={key} className={`picker-decor ${option.decoration}`} style={style} aria-hidden="true" />;
    }

    const className = pickerOptionClassName(option);
    const label = keyOptionLabel(option, keyboardLayout);

    if (option.kind === "key" && option.code === 40 && keyboardLayout === "jis") {
      return (
        <button
          key={key}
          type="button"
          className={className}
          style={style}
          onClick={() => onPickerOption(option)}
        >
          <svg viewBox="0 0 92 94" aria-hidden="true">
            <path
              className="shape-fill"
              d="M1 1H91V93H49V45H1V1Z"
            />
            <path
              className="shape-shadow"
              d="M2 40H46V88H88V92H48V44H2V40Z"
            />
            <path
              className="shape-stroke"
              d="M1 1H91V93H49V45H1V1Z"
            />
            <text x="47" y="27" textAnchor="middle" className="shape-label">
              {label}
            </text>
          </svg>
        </button>
      );
    }

    if (option.kind === "key" && option.code === 88) {
      return (
        <button
          key={key}
          type="button"
          className={className}
          style={style}
          onClick={() => onPickerOption(option)}
        >
          <svg viewBox="0 0 44 94" aria-hidden="true">
            <path className="shape-fill" d="M1 1H43V93H1V1Z" />
            <path className="shape-shadow" d="M2 88H42V92H2V88Z" />
            <path className="shape-stroke" d="M1 1H43V93H1V1Z" />
            <text x="22" y="45" textAnchor="middle" className="shape-label">
              {label}
            </text>
          </svg>
        </button>
      );
    }

    return (
      <button
        key={key}
        type="button"
        className={className}
        style={style}
        onClick={() => onPickerOption(option)}
      >
        {label}
      </button>
    );
  }

  return (
    <section className="panel picker-panel">
      <div className="panel-heading">
        <div className="panel-meta">
          <span className="panel-kicker">Palette</span>
          <h2>Keyboard</h2>
        </div>
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

      <div className="keyboard-scroll">
        <div className={`keyboard-picker ${keyboardLayout}`}>
          <div className="keyboard-main">
            {keyboardRows.map((row, rowIndex) => (
              <div key={rowIndex} className="picker-row">
                {row.map((option, optionIndex) => renderPickerOption(option, `main-${rowIndex}-${optionIndex}`))}
              </div>
            ))}
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
      </div>
    </section>
  );
}
