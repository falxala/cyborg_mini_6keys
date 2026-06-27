import { ConsumerKeycapSvg } from "./ConsumerKeycapSvg";
import { consumerOptionByUsage } from "../../features/keymap/keyPickerOptions";
import type { KeyAssignment } from "../../features/keymap/keymapTypes";
import { t } from "../../shared/i18n";

type RemapPanelProps = {
  activeLayer: number;
  selectedKey: number;
  connected: boolean;
  layerCount: number;
  layerAssignments: KeyAssignment[];
  onRead: () => void;
  onSave: () => void;
  onSelectLayer: (layerIndex: number) => void;
  onSelectKey: (keyIndex: number) => void;
};

export function RemapPanel({
  activeLayer,
  selectedKey,
  connected,
  layerCount,
  layerAssignments,
  onRead,
  onSave,
  onSelectLayer,
  onSelectKey,
}: RemapPanelProps) {
  return (
    <section className="panel remap-panel">
      <div className="panel-heading">
        <div className="panel-meta">
          <span className="panel-kicker">{t.keymap.kicker}</span>
          <h2>{t.keymap.title}</h2>
        </div>
        <div className="remap-actions">
          <button type="button" onClick={onRead} disabled={!connected}>
            {t.keymap.read}
          </button>
          <button type="button" className="primary-action" onClick={onSave} disabled={!connected}>
            {t.keymap.save}
          </button>
        </div>
      </div>

      <div className="remap-strip">
        <span className="strip-label">{t.keymap.layer}</span>
        <div className="layer-tabs" aria-label={t.keymap.layer}>
          {Array.from({ length: layerCount }, (_, layerIndex) => (
            <button
              key={layerIndex}
              type="button"
              className={layerIndex === activeLayer ? "active" : ""}
              onClick={() => onSelectLayer(layerIndex)}
            >
              {layerIndex}
            </button>
          ))}
        </div>
      </div>

      <div className="remap-strip">
        <span className="strip-label">{t.keymap.keys}</span>
        <div className="key-grid">
          {layerAssignments.map((assignment, keyIndex) => {
            const isSelected = keyIndex === selectedKey;

            return (
              <button
                key={keyIndex}
                type="button"
                className={isSelected ? "key-tile active" : "key-tile"}
                onClick={() => onSelectKey(keyIndex)}
              >
                <span>{t.keymap.key(keyIndex + 1)}</span>
                <div className="key-tile-assignments">
                  <AssignmentPreview assignment={assignment} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AssignmentPreview({
  assignment,
}: {
  assignment: KeyAssignment;
}) {
  const consumerOption =
    assignment.kind === "consumer" ? consumerOptionByUsage(assignment.usage) : undefined;

  return (
    <div className="assignment-preview">
      {consumerOption ? (
        <ConsumerKeycapSvg icon={consumerOption.icon} label={assignment.label} variant="tile" />
      ) : (
        <strong>{assignment.kind === "none" ? t.keymap.noAssignment : assignment.label}</strong>
      )}
    </div>
  );
}
