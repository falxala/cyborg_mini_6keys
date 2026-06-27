import { ConsumerKeycapSvg } from "./ConsumerKeycapSvg";
import { consumerOptionByUsage } from "../../features/keymap/keyPickerOptions";
import type { KeyAssignment } from "../../features/keymap/keymapTypes";

type RemapPanelProps = {
  activeLayer: number;
  selectedKey: number;
  layerCount: number;
  layerAssignments: KeyAssignment[];
  draftAssignment: KeyAssignment;
  onSelectLayer: (layerIndex: number) => void;
  onSelectKey: (keyIndex: number) => void;
};

export function RemapPanel({
  activeLayer,
  selectedKey,
  layerCount,
  layerAssignments,
  draftAssignment,
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
            const hasDraftChange = isSelected && !sameAssignment(assignment, draftAssignment);

            return (
              <button
                key={keyIndex}
                type="button"
                className={isSelected ? "key-tile active" : "key-tile"}
                onClick={() => onSelectKey(keyIndex)}
              >
                <span>K{keyIndex + 1}</span>
                <div className="key-tile-assignments">
                  <AssignmentPreview assignment={assignment} label={isSelected ? "Read" : undefined} />
                  {isSelected ? (
                    <AssignmentPreview
                      assignment={draftAssignment}
                      label="Edit"
                      changed={hasDraftChange}
                    />
                  ) : null}
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
  label,
  changed = false,
}: {
  assignment: KeyAssignment;
  label?: string;
  changed?: boolean;
}) {
  const consumerOption =
    assignment.kind === "consumer" ? consumerOptionByUsage(assignment.usage) : undefined;

  return (
    <div className={changed ? "assignment-preview changed" : "assignment-preview"}>
      {label ? <em>{label}</em> : null}
      {consumerOption ? (
        <ConsumerKeycapSvg icon={consumerOption.icon} label={assignment.label} variant="tile" />
      ) : (
        <strong>{assignment.label}</strong>
      )}
    </div>
  );
}

function sameAssignment(first: KeyAssignment, second: KeyAssignment) {
  return (
    first.kind === second.kind &&
    first.modifier === second.modifier &&
    first.usage === second.usage &&
    first.keycodes.every((keycode, index) => keycode === second.keycodes[index])
  );
}
