import { useEffect, useMemo, useState } from "react";
import {
  getDeviceState,
  readDeviceKeymap,
  setDeviceLayer,
  setDeviceKey,
  type DeviceState,
} from "../features/device/deviceCommands";
import { WebHidTransport } from "../features/device/webHidTransport";
import { HARDWARE_CONFIG } from "../features/hardware/hardwareConfig";
import { createInitialKeymap } from "../features/keymap/defaultKeymap";
import {
  formatHex,
  normalizeAssignment,
  type KeyAssignment,
  type KeyAssignmentKind,
} from "../features/keymap/keymapTypes";

export function App() {
  const transport = useMemo(() => new WebHidTransport(), []);
  const [activeLayer, setActiveLayer] = useState(0);
  const [selectedKey, setSelectedKey] = useState(0);
  const [status, setStatus] = useState("未接続");
  const [deviceState, setDeviceState] = useState<DeviceState | null>(null);
  const [keymap, setKeymap] = useState(createInitialKeymap);
  const selectedAssignment = keymap[activeLayer]?.[selectedKey] ?? normalizeAssignment({ kind: "none" });
  const [draftAssignment, setDraftAssignment] = useState<KeyAssignment>(selectedAssignment);
  const connected = deviceState !== null && transport.connected;

  useEffect(() => {
    setDraftAssignment(selectedAssignment);
  }, [selectedAssignment]);

  async function connectDevice() {
    try {
      const device = await transport.requestDevice();
      await transport.open();
      const state = await getDeviceState(transport);
      const loadedKeymap = await readDeviceKeymap(transport, state.layerCount, state.keyCount);
      setDeviceState(state);
      setKeymap(loadedKeymap);
      setActiveLayer(state.activeLayer);
      setStatus(`${device.productName || "HID device"} に接続`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "接続に失敗しました");
    }
  }

  async function selectLayer(layerIndex: number) {
    setActiveLayer(layerIndex);

    if (!transport.connected) {
      return;
    }

    try {
      await setDeviceLayer(transport, layerIndex);
      setDeviceState((current) =>
        current ? { ...current, activeLayer: layerIndex } : current,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "レイヤー変更に失敗しました");
    }
  }

  async function readAllAssignments() {
    if (!connected || !deviceState) {
      setStatus("HIDデバイスが接続されていません");
      return;
    }

    try {
      setStatus("キーマップ読み込み中");
      const loadedKeymap = await readDeviceKeymap(transport, deviceState.layerCount, deviceState.keyCount);
      setKeymap(loadedKeymap);
      setStatus("キーマップを読み込みました");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "読み込みに失敗しました");
    }
  }

  async function saveSelectedAssignment() {
    if (!connected) {
      setStatus("HIDデバイスが接続されていません");
      return;
    }

    const normalized = normalizeAssignment(draftAssignment);

    try {
      await setDeviceKey(transport, activeLayer, selectedKey, normalized);
      setKeymap((current) => updateKeymap(current, activeLayer, selectedKey, normalized));
      setStatus(`Layer ${activeLayer} K${selectedKey + 1} を保存しました`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存に失敗しました");
    }
  }

  function updateDraftKind(kind: KeyAssignmentKind) {
    setDraftAssignment((current) => normalizeAssignment({ ...current, kind }));
  }

  function updateDraftUsage(usage: number) {
    setDraftAssignment((current) =>
      normalizeAssignment({
        ...current,
        usage,
        keycodes: current.kind === "keyboard" ? [usage, 0, 0, 0, 0, 0] : current.keycodes,
      }),
    );
  }

  function updateDraftModifier(modifier: number) {
    setDraftAssignment((current) => normalizeAssignment({ ...current, modifier }));
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/cy.png" alt="" />
          <div>
            <h1>Cyborg Mini Remapper</h1>
            <p>8-key WebHID migration workspace</p>
          </div>
        </div>
        <div className="connection">
          <span>{status}</span>
          <button type="button" onClick={connectDevice}>
            Connect
          </button>
        </div>
      </header>

      <section className="workspace" aria-label="Remapper workspace">
        <aside className="panel hardware-panel">
          <h2>Hardware</h2>
          <dl>
            <div>
              <dt>Keys</dt>
              <dd>{HARDWARE_CONFIG.keyCount}</dd>
            </div>
            <div>
              <dt>Virtual GND</dt>
              <dd>{HARDWARE_CONFIG.virtualGroundCount}</dd>
            </div>
            <div>
              <dt>Device layer</dt>
              <dd>{deviceState?.activeLayer ?? "-"}</dd>
            </div>
            <div>
              <dt>Report keys</dt>
              <dd>{deviceState?.keyCount ?? "-"}</dd>
            </div>
            <div>
              <dt>External RGB</dt>
              <dd>None</dd>
            </div>
            <div>
              <dt>OLED</dt>
              <dd>None</dd>
            </div>
          </dl>
        </aside>

        <section className="panel remap-panel">
          <div className="panel-heading">
            <h2>Layer {activeLayer}</h2>
            <div className="layer-tabs" aria-label="Layer selector">
              {keymap.map((_, layerIndex) => (
                <button
                  key={layerIndex}
                  type="button"
                  className={layerIndex === activeLayer ? "active" : ""}
                  onClick={() => void selectLayer(layerIndex)}
                >
                  {layerIndex}
                </button>
              ))}
            </div>
          </div>

          <div className="key-grid">
            {keymap[activeLayer].map((assignment, keyIndex) => (
              <button
                key={keyIndex}
                type="button"
                className={keyIndex === selectedKey ? "key-tile active" : "key-tile"}
                onClick={() => setSelectedKey(keyIndex)}
              >
                <span>K{keyIndex + 1}</span>
                <strong>{assignment.label}</strong>
              </button>
            ))}
          </div>
        </section>

        <aside className="panel editor-panel">
          <div className="panel-heading compact">
            <h2>K{selectedKey + 1}</h2>
            <button type="button" onClick={() => void readAllAssignments()} disabled={!connected}>
              Read
            </button>
          </div>

          <label>
            <span>Type</span>
            <select
              value={draftAssignment.kind}
              onChange={(event) => updateDraftKind(event.currentTarget.value as KeyAssignmentKind)}
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
              onChange={(event) => updateDraftUsage(Number(event.currentTarget.value))}
            />
          </label>

          <label>
            <span>Modifier</span>
            <input
              type="number"
              min={0}
              max={255}
              value={draftAssignment.modifier}
              disabled={draftAssignment.kind !== "keyboard"}
              onChange={(event) => updateDraftModifier(Number(event.currentTarget.value))}
            />
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

          <button
            type="button"
            className="primary-action"
            onClick={() => void saveSelectedAssignment()}
            disabled={!connected}
          >
            Save
          </button>
        </aside>
      </section>
    </main>
  );
}

function updateKeymap(
  keymap: KeyAssignment[][],
  layer: number,
  keyIndex: number,
  assignment: KeyAssignment,
) {
  return keymap.map((layerAssignments, layerIndex) =>
    layerIndex === layer
      ? layerAssignments.map((current, currentKeyIndex) =>
          currentKeyIndex === keyIndex ? assignment : current,
        )
      : layerAssignments,
  );
}
