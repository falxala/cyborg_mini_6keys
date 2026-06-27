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
          {layerAssignments.map((assignment, keyIndex) => (
            <button
              key={keyIndex}
              type="button"
              className={keyIndex === selectedKey ? "key-tile active" : "key-tile"}
              onClick={() => onSelectKey(keyIndex)}
            >
              <span>K{keyIndex + 1}</span>
              <strong>{assignment.label}</strong>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
