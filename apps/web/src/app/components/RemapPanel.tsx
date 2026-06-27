import { ConsumerKeycapSvg } from "./ConsumerKeycapSvg";
import { consumerOptionByUsage } from "../../features/keymap/keyPickerOptions";
import type { KeyAssignment } from "../../features/keymap/keymapTypes";

type RemapPanelProps = {
  activeLayer: number;
  selectedKey: number;
  layerCount: number;
  layerAssignments: KeyAssignment[];
  onSelectLayer: (layerIndex: number) => void;
  onSelectKey: (keyIndex: number) => void;
};

export function RemapPanel({
  activeLayer,
  selectedKey,
  layerCount,
  layerAssignments,
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
        <div className="selection-pill">K{selectedKey + 1}</div>
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
                <span>K{keyIndex + 1}</span>
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
