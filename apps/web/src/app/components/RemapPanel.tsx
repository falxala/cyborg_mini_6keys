import { ConsumerKeycapSvg } from "./ConsumerKeycapSvg";
import { consumerOptionByUsage } from "../../features/keymap/keyPickerOptions";
import type { KeyAssignment } from "../../features/keymap/keymapTypes";

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
          <span className="panel-kicker">Keymap</span>
          <h2>Layers</h2>
        </div>
        <div className="remap-actions">
          <button type="button" onClick={onRead} disabled={!connected}>
            Read
          </button>
          <button type="button" className="primary-action" onClick={onSave} disabled={!connected}>
            Save
          </button>
        </div>
      </div>

      <div className="remap-strip">
        <span className="strip-label">Layer</span>
        <div className="layer-tabs" aria-label="Layer selector">
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
        <span className="strip-label">Keys</span>
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
                <span>Key {keyIndex + 1}</span>
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
        <strong>{assignment.kind === "none" ? "なし" : assignment.label}</strong>
      )}
    </div>
  );
}
