import { useMemo, useState } from "react";
import { WebHidTransport } from "../features/device/webHidTransport";
import { HARDWARE_CONFIG } from "../features/hardware/hardwareConfig";
import { createInitialKeymap } from "../features/keymap/defaultKeymap";

export function App() {
  const transport = useMemo(() => new WebHidTransport(), []);
  const [activeLayer, setActiveLayer] = useState(0);
  const [status, setStatus] = useState("未接続");
  const keymap = useMemo(() => createInitialKeymap(), []);

  async function connectDevice() {
    try {
      const device = await transport.requestDevice();
      await transport.open();
      setStatus(`${device.productName || "HID device"} に接続`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "接続に失敗しました");
    }
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
                  onClick={() => setActiveLayer(layerIndex)}
                >
                  {layerIndex}
                </button>
              ))}
            </div>
          </div>

          <div className="key-grid">
            {keymap[activeLayer].map((assignment, keyIndex) => (
              <button key={keyIndex} type="button" className="key-tile">
                <span>K{keyIndex + 1}</span>
                <strong>{assignment.label}</strong>
              </button>
            ))}
          </div>
        </section>

        <aside className="panel migration-panel">
          <h2>Next</h2>
          <ol>
            <li>Define HID reports.</li>
            <li>Wire read/write commands.</li>
            <li>Replace firmware scan logic.</li>
          </ol>
        </aside>
      </section>
    </main>
  );
}
