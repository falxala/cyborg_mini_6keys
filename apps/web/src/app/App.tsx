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

export function App() {
  const transport = useMemo(() => new WebHidTransport(), []);
  const [activeLayer, setActiveLayer] = useState(0);
  const [selectedKey, setSelectedKey] = useState(0);
  const [firmwareModalOpen, setFirmwareModalOpen] = useState(false);
  const [status, setStatus] = useState("未接続");
  const [firmwareStatus, setFirmwareStatus] = useState("UF2 ready");
  const [deviceState, setDeviceState] = useState<DeviceState | null>(null);
  const [readKeymap, setReadKeymap] = useState(createBlankKeymap);
  const [writeKeymap, setWriteKeymap] = useState(createBlankKeymap);
  const [keyboardLayout, setKeyboardLayout] = useState<KeyboardLayoutMode>("jis");
  const readAssignment = readKeymap[activeLayer]?.[selectedKey] ?? normalizeAssignment({ kind: "none" });
  const selectedAssignment = writeKeymap[activeLayer]?.[selectedKey] ?? normalizeAssignment({ kind: "none" });
  const [draftAssignment, setDraftAssignment] = useState<KeyAssignment>(selectedAssignment);
  const [modifierSlots, setModifierSlots] = useState<number[]>(createModifierSlotsFromMask(0));
  const connected = deviceState !== null && transport.connected;
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
      setReadKeymap(loadedKeymap);
      setWriteKeymap(loadedKeymap);
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

    if (sameAssignment(readAssignment, normalized)) {
      setStatus(`Layer ${activeLayer} Key ${selectedKey + 1} は変更なしのため書き込みをスキップしました`);
      return;
    }

    try {
      await setDeviceKey(transport, activeLayer, selectedKey, normalized);
      setReadKeymap((current) => updateKeymap(current, activeLayer, selectedKey, normalized));
      setWriteKeymap((current) => updateKeymap(current, activeLayer, selectedKey, normalized));
      setStatus(`Layer ${activeLayer} Key ${selectedKey + 1} を保存しました`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存に失敗しました");
    }
  }

  async function enterBootloaderMode() {
    if (!connected) {
      setFirmwareStatus("HIDデバイスが接続されていません");
      return;
    }

    try {
      setFirmwareStatus("BOOTSELへ切替中");
      await enterDeviceBootloader(transport);
      await transport.close().catch(() => undefined);
      setDeviceState(null);
      setStatus("BOOTSEL mode");
      setFirmwareStatus("BOOTSEL drive ready");
    } catch (error) {
      setFirmwareStatus(error instanceof Error ? error.message : "BOOTSEL切替に失敗しました");
    }
  }

  async function installBundledFirmware() {
    try {
      setFirmwareStatus("UF2書き込み中");
      const result = await installFirmwareUf2();
      setFirmwareStatus(`${result.fileName} written (${Math.ceil(result.size / 1024)} KB)`);
    } catch (error) {
      setFirmwareStatus(error instanceof Error ? error.message : "UF2書き込みに失敗しました");
    }
  }

  async function downloadBundledFirmware() {
    try {
      setFirmwareStatus("UF2ダウンロード中");
      await downloadFirmwareUf2();
      setFirmwareStatus("UF2 downloaded");
    } catch (error) {
      setFirmwareStatus(error instanceof Error ? error.message : "UF2ダウンロードに失敗しました");
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
            <span className="eyebrow">Cyborg Project</span>
            <h1>Mini Remapper</h1>
            <p>WebHID keymap editor for the 8-key RP2040 board</p>
          </div>
        </div>
        <div className="connection">
          <div className="connection-meta">
            <span className={connected ? "status-badge online" : "status-badge offline"}>
              {connected ? "Connected" : "Idle"}
            </span>
            <span className="connection-text">{status}</span>
          </div>
          <div className="connection-actions">
            <button type="button" className="ghost-button" onClick={() => setFirmwareModalOpen(true)}>
              Updater
            </button>
            <button type="button" onClick={connectDevice}>
              {connected ? "Reconnect" : "Connect"}
            </button>
          </div>
        </div>
      </header>

      <section className="workspace" aria-label="Remapper workspace">
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
                <span className="panel-kicker">Updater</span>
                <h2 id="firmware-modal-title">Firmware</h2>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setFirmwareModalOpen(false)}
                aria-label="Close firmware updater"
              >
                Close
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
