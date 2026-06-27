import { useEffect, useMemo, useState } from "react";
import { EditorPanel } from "./components/EditorPanel";
import { FirmwarePanel } from "./components/FirmwarePanel";
import { HardwarePanel } from "./components/HardwarePanel";
import { KeyboardPickerPanel } from "./components/KeyboardPickerPanel";
import { RemapPanel } from "./components/RemapPanel";
import { updateKeymap } from "./updateKeymap";
import {
  enterDeviceBootloader,
  getDeviceState,
  readDeviceKeymap,
  sendRemapperHeartbeat,
  setDeviceLayer,
  setDeviceKey,
  subscribeDeviceKeyEvents,
  type DeviceState,
} from "../features/device/deviceCommands";
import { WebHidTransport } from "../features/device/webHidTransport";
import {
  canInstallUf2FromBrowser,
  downloadFirmwareUf2,
  installFirmwareUf2,
} from "../features/firmware/firmwareUpdater";
import { HARDWARE_CONFIG } from "../features/hardware/hardwareConfig";
import {
  type ConsumerKeyOption,
  type KeyboardLayoutMode,
  type KeyPickerOption,
} from "../features/keymap/keyPickerOptions";
import {
  createBlankAssignment,
  createConsumerAssignment,
  createKeyboardAssignment,
  formatHex,
  normalizeAssignment,
  sameAssignment,
  type KeyAssignment,
  type KeyAssignmentKind,
} from "../features/keymap/keymapTypes";
import { t } from "../shared/i18n";

const homeUrl = `${import.meta.env.BASE_URL}`;
const remapperUrl = `${import.meta.env.BASE_URL}remapper.html`;
const diagnosticsUrl = `${import.meta.env.BASE_URL}diagnostics.html`;

export function App() {
  return <HomePage />;
}

export function HomePage() {
  return (
    <main className="app-shell home-shell">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="brand home-brand">
          <img src={`${import.meta.env.BASE_URL}cy.png`} alt="" />
          <div className="brand-copy">
            <span className="eyebrow">{t.home.eyebrow}</span>
            <h1 id="home-title">{t.home.title}</h1>
            <p>{t.home.description}</p>
          </div>
        </div>
      </section>

      <section className="product-grid" aria-label={t.home.productListLabel}>
        {t.home.products.map((product) => (
          <article className="product-card" key={product.name}>
            <div className="product-card-copy">
              <span className="eyebrow">{product.status}</span>
              <h2>{product.name}</h2>
              <p>{product.description}</p>
            </div>
            <dl className="product-specs">
              <div>
                <dt>{t.home.keys}</dt>
                <dd>{HARDWARE_CONFIG.keyCount}</dd>
              </div>
              <div>
                <dt>{t.home.layers}</dt>
                <dd>{HARDWARE_CONFIG.layerCount}</dd>
              </div>
              <div>
                <dt>{t.home.connection}</dt>
                <dd>{t.home.connectionValue}</dd>
              </div>
            </dl>
            <div className="product-actions">
              <a className="product-action" href={remapperUrl}>
                {t.home.openRemapper}
              </a>
              <a className="product-action secondary" href={diagnosticsUrl}>
                {t.home.openDiagnostics}
              </a>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

type RemapperAppProps = {
  homeHref?: string;
};

export function RemapperApp({ homeHref = homeUrl }: RemapperAppProps) {
  const transport = useMemo(() => new WebHidTransport(), []);
  const [activeLayer, setActiveLayer] = useState(0);
  const [selectedKey, setSelectedKey] = useState(0);
  const [firmwareModalOpen, setFirmwareModalOpen] = useState(false);
  const [status, setStatus] = useState<string>(t.connection.initialStatus);
  const [firmwareStatus, setFirmwareStatus] = useState<string>(t.firmware.initialStatus);
  const [deviceState, setDeviceState] = useState<DeviceState | null>(null);
  const [readKeymap, setReadKeymap] = useState(createBlankKeymap);
  const [writeKeymap, setWriteKeymap] = useState(createBlankKeymap);
  const [keyboardLayout, setKeyboardLayout] = useState<KeyboardLayoutMode>("jis");
  const readAssignment = readKeymap[activeLayer]?.[selectedKey] ?? normalizeAssignment({ kind: "none" });
  const selectedAssignment = writeKeymap[activeLayer]?.[selectedKey] ?? normalizeAssignment({ kind: "none" });
  const [draftAssignment, setDraftAssignment] = useState<KeyAssignment>(selectedAssignment);
  const [modifierSlots, setModifierSlots] = useState<number[]>(createModifierSlotsFromMask(0));
  const connected = deviceState !== null && transport.connected;
  const deviceLayerCount = deviceState?.layerCount ?? 0;
  const deviceKeyCount = deviceState?.keyCount ?? 0;
  const firmwareInstallSupported = canInstallUf2FromBrowser();

  useEffect(() => {
    setDraftAssignment(selectedAssignment);
    setModifierSlots(
      createModifierSlotsFromMask(selectedAssignment.kind === "keyboard" ? selectedAssignment.modifier : 0),
    );
  }, [selectedAssignment]);

  useEffect(() => {
    if (!connected) {
      return;
    }

    let cancelled = false;
    const ping = async () => {
      try {
        await sendRemapperHeartbeat(transport);
      } catch {
        if (!cancelled) {
          window.clearInterval(interval);
        }
      }
    };
    const interval = window.setInterval(() => void ping(), 1000);
    void ping();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [connected, transport]);

  useEffect(() => {
    if (!connected || deviceLayerCount === 0 || deviceKeyCount === 0) {
      return;
    }

    return subscribeDeviceKeyEvents(transport, (event) => {
      if (!event.pressed) {
        return;
      }

      if (event.layer >= deviceLayerCount || event.keyIndex >= deviceKeyCount) {
        return;
      }

      setActiveLayer(event.layer);
      setSelectedKey(event.keyIndex);
      setDeviceState((current) =>
        current && current.activeLayer !== event.layer ? { ...current, activeLayer: event.layer } : current,
      );
    });
  }, [connected, deviceKeyCount, deviceLayerCount, transport]);

  async function connectDevice() {
    try {
      const device = await transport.requestDevice();
      await transport.open();
      await sendRemapperHeartbeat(transport);
      const state = await getDeviceState(transport);
      const loadedKeymap = await readDeviceKeymap(transport, state.layerCount, state.keyCount);
      console.info("[hid] connected", {
        productName: device.productName,
        vendorId: `0x${device.vendorId.toString(16).padStart(4, "0").toUpperCase()}`,
        productId: `0x${device.productId.toString(16).padStart(4, "0").toUpperCase()}`,
      });
      setDeviceState(state);
      setReadKeymap(loadedKeymap);
      setWriteKeymap(loadedKeymap);
      setActiveLayer(state.activeLayer);
      setStatus(t.connection.connectedTo(device.productName || t.device.fallbackName));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t.connection.connectFailed);
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
      setStatus(error instanceof Error ? error.message : t.connection.layerChangeFailed);
    }
  }

  async function readAllAssignments() {
    if (!connected || !deviceState) {
      setStatus(t.connection.deviceNotConnected);
      return;
    }

    try {
      setStatus(t.keymap.reading);
      const loadedKeymap = await readDeviceKeymap(transport, deviceState.layerCount, deviceState.keyCount);
      setReadKeymap(loadedKeymap);
      setWriteKeymap(loadedKeymap);
      setStatus(t.keymap.readComplete);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t.keymap.readFailed);
    }
  }

  async function saveSelectedAssignment() {
    if (!connected) {
      setStatus(t.connection.deviceNotConnected);
      return;
    }

    const normalized = normalizeAssignment(draftAssignment);

    if (sameAssignment(readAssignment, normalized)) {
      setStatus(t.keymap.saveSkipped(activeLayer, selectedKey + 1));
      return;
    }

    try {
      await setDeviceKey(transport, activeLayer, selectedKey, normalized);
      setReadKeymap((current) => updateKeymap(current, activeLayer, selectedKey, normalized));
      setWriteKeymap((current) => updateKeymap(current, activeLayer, selectedKey, normalized));
      setStatus(t.keymap.saved(activeLayer, selectedKey + 1));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t.keymap.saveFailed);
    }
  }

  async function enterBootloaderMode() {
    if (!connected) {
      setFirmwareStatus(t.connection.deviceNotConnected);
      return;
    }

    try {
      setFirmwareStatus(t.firmware.enteringBootloader);
      await enterDeviceBootloader(transport);
      await transport.close().catch(() => undefined);
      setDeviceState(null);
      setStatus(t.firmware.bootMode);
      setFirmwareStatus(t.firmware.bootDriveReady);
    } catch (error) {
      setFirmwareStatus(error instanceof Error ? error.message : t.firmware.enterBootloaderFailed);
    }
  }

  async function installBundledFirmware() {
    try {
      setFirmwareStatus(t.firmware.writing);
      const result = await installFirmwareUf2();
      setFirmwareStatus(t.firmware.written(result.fileName, Math.ceil(result.size / 1024)));
    } catch (error) {
      setFirmwareStatus(error instanceof Error ? error.message : t.firmware.writeFailed);
    }
  }

  async function downloadBundledFirmware() {
    try {
      setFirmwareStatus(t.firmware.downloading);
      await downloadFirmwareUf2();
      setFirmwareStatus(t.firmware.downloaded);
    } catch (error) {
      setFirmwareStatus(error instanceof Error ? error.message : t.firmware.downloadFailed);
    }
  }

  function updateDraftKind(kind: KeyAssignmentKind) {
    updateSelectedAssignment((current) => normalizeAssignment({ ...current, kind }));
    setModifierSlots((current) => (kind === "keyboard" ? current : createModifierSlotsFromMask(0)));
  }

  function updateDraftUsage(usage: number) {
    updateSelectedAssignment((current) =>
      normalizeAssignment({
        ...current,
        usage,
        keycodes: current.kind === "keyboard" ? [usage, 0, 0, 0, 0, 0] : current.keycodes,
      }),
    );
  }

  function updateDraftModifier(modifier: number) {
    updateSelectedAssignment((current) => {
      const usage = current.kind === "keyboard" ? current.usage : 0;
      const keycodes = current.kind === "keyboard" ? current.keycodes : [0, 0, 0, 0, 0, 0];
      return createKeyboardAssignment(usage, modifier, keycodes);
    });
  }

  function updateDraftModifierSlot(index: number, modifier: number) {
    setModifierSlots((current) => {
      const next = current.map((value, currentIndex) => (currentIndex === index ? modifier : value));
      updateDraftModifier(createModifierMaskFromSlots(next));
      return next;
    });
  }

  function applyPickerOption(option: KeyPickerOption) {
    if (option.kind === "spacer" || option.kind === "decoration") {
      return;
    }

    if (option.kind === "blank") {
      updateSelectedAssignment(() => createBlankAssignment());
      setModifierSlots(createModifierSlotsFromMask(0));
      return;
    }

    if (option.kind === "modifier") {
      updateSelectedAssignment((current) => {
        const modifier = current.kind === "keyboard" ? current.modifier : 0;
        const usage = current.kind === "keyboard" ? current.usage : 0;
        const keycodes = current.kind === "keyboard" ? current.keycodes : [0, 0, 0, 0, 0, 0];
        const nextModifier = modifier ^ option.modifier;
        setModifierSlots(createModifierSlotsFromMask(nextModifier));
        return createKeyboardAssignment(usage, nextModifier, keycodes);
      });
      return;
    }

    updateSelectedAssignment((current) => {
      const modifier = current.kind === "keyboard" ? current.modifier : 0;
      return createKeyboardAssignment(option.code, modifier);
    });
  }

  function applyConsumerOption(option: ConsumerKeyOption) {
    updateSelectedAssignment(() => createConsumerAssignment(option.usage));
  }

  function updateSelectedAssignment(updater: (current: KeyAssignment) => KeyAssignment) {
    setDraftAssignment((current) => {
      const next = normalizeAssignment(updater(current));
      setWriteKeymap((currentKeymap) => updateKeymap(currentKeymap, activeLayer, selectedKey, next));
      return next;
    });
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}cy.png`} alt="" />
          <div className="brand-copy">
            <span className="eyebrow">{t.app.eyebrow}</span>
            <h1>{t.app.title}</h1>
            <p>{t.app.description}</p>
          </div>
        </div>
        <div className="connection">
          <div className="connection-meta">
            <span className={connected ? "status-badge online" : "status-badge offline"}>
              {connected ? t.connection.connected : t.connection.idle}
            </span>
            <span className="connection-text">{status}</span>
          </div>
          <div className="connection-actions">
            <a className="ghost-button nav-button" href={homeHref}>
              {t.home.backHome}
            </a>
            <a className="ghost-button nav-button" href={diagnosticsUrl}>
              {t.diagnostics.nav}
            </a>
            <button type="button" className="ghost-button" onClick={() => setFirmwareModalOpen(true)}>
              {t.connection.updater}
            </button>
            <button type="button" onClick={connectDevice}>
              {connected ? t.connection.reconnect : t.connection.connect}
            </button>
          </div>
        </div>
      </header>

      <section className="workspace" aria-label={t.app.workspaceLabel}>
        <HardwarePanel deviceState={deviceState} />
        <RemapPanel
          activeLayer={activeLayer}
          selectedKey={selectedKey}
          connected={connected}
          layerCount={writeKeymap.length}
          layerAssignments={writeKeymap[activeLayer]}
          onRead={() => void readAllAssignments()}
          onSave={() => void saveSelectedAssignment()}
          onSelectLayer={(layerIndex) => void selectLayer(layerIndex)}
          onSelectKey={setSelectedKey}
        />
        <EditorPanel
          selectedKey={selectedKey}
          draftAssignment={draftAssignment}
          onUpdateKind={updateDraftKind}
          onUpdateUsage={updateDraftUsage}
          modifierSlots={modifierSlots}
          onUpdateModifierSlot={updateDraftModifierSlot}
        />
        <KeyboardPickerPanel
          draftAssignment={draftAssignment}
          keyboardLayout={keyboardLayout}
          onKeyboardLayoutChange={setKeyboardLayout}
          onPickerOption={applyPickerOption}
          onConsumerOption={applyConsumerOption}
        />
      </section>

      {firmwareModalOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setFirmwareModalOpen(false)}
        >
          <div
            className="modal-shell"
            role="dialog"
            aria-modal="true"
            aria-labelledby="firmware-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div className="panel-meta">
                <span className="panel-kicker">{t.firmware.updater}</span>
                <h2 id="firmware-modal-title">{t.firmware.title}</h2>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setFirmwareModalOpen(false)}
                aria-label={t.firmware.closeLabel}
              >
                {t.firmware.close}
              </button>
            </div>
            <FirmwarePanel
              connected={connected}
              firmwareInstallSupported={firmwareInstallSupported}
              firmwareStatus={firmwareStatus}
              onEnterBootloader={() => void enterBootloaderMode()}
              onInstallFirmware={() => void installBundledFirmware()}
              onDownloadFirmware={() => void downloadBundledFirmware()}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}

export function DiagnosticsApp() {
  const transport = useMemo(() => new WebHidTransport(), []);
  const [status, setStatus] = useState<string>(t.connection.initialStatus);
  const [deviceState, setDeviceState] = useState<DeviceState | null>(null);
  const [testedKeys, setTestedKeys] = useState<boolean[]>(() =>
    Array.from({ length: HARDWARE_CONFIG.keyCount }, () => false),
  );
  const [lastKey, setLastKey] = useState<number | null>(null);
  const connected = deviceState !== null && transport.connected;
  const testedCount = testedKeys.filter(Boolean).length;
  const allKeysPassed = testedCount === testedKeys.length;

  useEffect(() => {
    if (!connected) {
      return;
    }

    let cancelled = false;
    const ping = async () => {
      try {
        await sendRemapperHeartbeat(transport);
      } catch {
        if (!cancelled) {
          window.clearInterval(interval);
        }
      }
    };
    const interval = window.setInterval(() => void ping(), 1000);
    void ping();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [connected, transport]);

  useEffect(() => {
    if (!connected || !deviceState) {
      return;
    }

    return subscribeDeviceKeyEvents(transport, (event) => {
      if (!event.pressed || event.keyIndex >= deviceState.keyCount) {
        return;
      }

      setLastKey(event.keyIndex);
      setTestedKeys((current) =>
        current.map((tested, index) => (index === event.keyIndex ? true : tested)),
      );
    });
  }, [connected, deviceState, transport]);

  async function connectDevice() {
    try {
      const device = await transport.requestDevice();
      await transport.open();
      await sendRemapperHeartbeat(transport);
      const state = await getDeviceState(transport);
      setDeviceState(state);
      setTestedKeys(Array.from({ length: state.keyCount }, () => false));
      setLastKey(null);
      setStatus(t.connection.connectedTo(device.productName || t.device.fallbackName));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t.connection.connectFailed);
    }
  }

  function resetDiagnostics() {
    setTestedKeys(Array.from({ length: deviceState?.keyCount ?? HARDWARE_CONFIG.keyCount }, () => false));
    setLastKey(null);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}cy.png`} alt="" />
          <div className="brand-copy">
            <span className="eyebrow">{t.diagnostics.kicker}</span>
            <h1>{t.diagnostics.title}</h1>
            <p>{t.diagnostics.description}</p>
          </div>
        </div>
        <div className="connection">
          <div className="connection-meta">
            <span className={connected ? "status-badge online" : "status-badge offline"}>
              {connected ? t.connection.connected : t.connection.idle}
            </span>
            <span className="connection-text">{status}</span>
          </div>
          <div className="connection-actions">
            <a className="ghost-button nav-button" href={homeUrl}>
              {t.home.backHome}
            </a>
            <a className="ghost-button nav-button" href={remapperUrl}>
              {t.home.openRemapper}
            </a>
            <button type="button" onClick={connectDevice}>
              {connected ? t.connection.reconnect : t.connection.connect}
            </button>
          </div>
        </div>
      </header>

      <section className="diagnostics-workspace" aria-label={t.diagnostics.title}>
        <section className="panel diagnostics-panel">
          <div className="panel-heading">
            <div className="panel-meta">
              <span className="panel-kicker">{t.diagnostics.keyCheckKicker}</span>
              <h2>{t.diagnostics.keyCheckTitle}</h2>
            </div>
            <button type="button" className="ghost-button" onClick={resetDiagnostics}>
              {t.diagnostics.reset}
            </button>
          </div>

          <div className="diagnostics-summary">
            <strong>{allKeysPassed ? t.diagnostics.pass : t.diagnostics.waiting}</strong>
            <span>{t.diagnostics.progress(testedCount, testedKeys.length)}</span>
            <span>{lastKey === null ? t.diagnostics.noLastKey : t.diagnostics.lastKey(lastKey + 1)}</span>
          </div>

          <div className="diagnostic-key-grid">
            {testedKeys.map((tested, index) => (
              <div
                className={tested ? "diagnostic-key passed" : "diagnostic-key"}
                key={index}
              >
                <span>{t.keymap.key(index + 1)}</span>
                <strong>{tested ? t.diagnostics.checked : t.diagnostics.unchecked}</strong>
              </div>
            ))}
          </div>
        </section>

        <aside className="panel diagnostics-panel">
          <div className="panel-meta">
            <span className="panel-kicker">{t.diagnostics.functionCheckKicker}</span>
            <h2>{t.diagnostics.functionCheckTitle}</h2>
          </div>
          <dl className="diagnostics-list">
            <div>
              <dt>{t.diagnostics.webHid}</dt>
              <dd>{typeof navigator !== "undefined" && "hid" in navigator ? t.diagnostics.ok : t.diagnostics.ng}</dd>
            </div>
            <div>
              <dt>{t.diagnostics.deviceConnection}</dt>
              <dd>{connected ? t.diagnostics.ok : t.diagnostics.ng}</dd>
            </div>
            <div>
              <dt>{t.diagnostics.keyEvent}</dt>
              <dd>{testedCount > 0 ? t.diagnostics.ok : t.diagnostics.ng}</dd>
            </div>
            <div>
              <dt>{t.diagnostics.reportKeys}</dt>
              <dd>{deviceState?.keyCount ?? "-"}</dd>
            </div>
          </dl>
        </aside>
      </section>
    </main>
  );
}

function createModifierSlotsFromMask(mask: number) {
  const slots: number[] = [];
  const modifierBits = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80];

  for (const bit of modifierBits) {
    if ((mask & bit) !== 0) {
      slots.push(bit);
    }
  }

  while (slots.length < 3) {
    slots.push(0);
  }

  return slots.slice(0, 3);
}

function createModifierMaskFromSlots(slots: number[]) {
  let mask = 0;

  for (const slot of slots) {
    if (slot !== 0) {
      mask |= slot;
    }
  }

  return mask;
}

function createBlankKeymap() {
  return Array.from({ length: HARDWARE_CONFIG.layerCount }, () =>
    Array.from({ length: HARDWARE_CONFIG.keyCount }, createBlankAssignment),
  );
}
