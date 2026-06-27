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
import { createInitialKeymap } from "../features/keymap/defaultKeymap";
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
  type KeyAssignment,
  type KeyAssignmentKind,
} from "../features/keymap/keymapTypes";

export function App() {
  const transport = useMemo(() => new WebHidTransport(), []);
  const [activeLayer, setActiveLayer] = useState(0);
  const [selectedKey, setSelectedKey] = useState(0);
  const [status, setStatus] = useState("未接続");
  const [firmwareStatus, setFirmwareStatus] = useState("UF2 ready");
  const [deviceState, setDeviceState] = useState<DeviceState | null>(null);
  const [keymap, setKeymap] = useState(createInitialKeymap);
  const [keyboardLayout, setKeyboardLayout] = useState<KeyboardLayoutMode>("jis");
  const selectedAssignment = keymap[activeLayer]?.[selectedKey] ?? normalizeAssignment({ kind: "none" });
  const [draftAssignment, setDraftAssignment] = useState<KeyAssignment>(selectedAssignment);
  const connected = deviceState !== null && transport.connected;
  const firmwareInstallSupported = canInstallUf2FromBrowser();

  useEffect(() => {
    setDraftAssignment(selectedAssignment);
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

  function applyPickerOption(option: KeyPickerOption) {
    if (option.kind === "spacer") {
      return;
    }

    if (option.kind === "blank") {
      setDraftAssignment(createBlankAssignment());
      return;
    }

    if (option.kind === "modifier") {
      setDraftAssignment((current) => {
        const modifier = current.kind === "keyboard" ? current.modifier : 0;
        const usage = current.kind === "keyboard" ? current.usage : 0;
        const keycodes = current.kind === "keyboard" ? current.keycodes : [0, 0, 0, 0, 0, 0];

        return createKeyboardAssignment(usage, modifier ^ option.modifier, keycodes);
      });
      return;
    }

    setDraftAssignment((current) => {
      const modifier = current.kind === "keyboard" ? current.modifier : 0;
      return createKeyboardAssignment(option.code, modifier);
    });
  }

  function applyConsumerOption(option: ConsumerKeyOption) {
    setDraftAssignment(createConsumerAssignment(option.usage));
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
        <HardwarePanel deviceState={deviceState} />
        <RemapPanel
          activeLayer={activeLayer}
          selectedKey={selectedKey}
          layerCount={keymap.length}
          layerAssignments={keymap[activeLayer]}
          onSelectLayer={(layerIndex) => void selectLayer(layerIndex)}
          onSelectKey={setSelectedKey}
        />
        <EditorPanel
          selectedKey={selectedKey}
          connected={connected}
          draftAssignment={draftAssignment}
          onRead={() => void readAllAssignments()}
          onSave={() => void saveSelectedAssignment()}
          onUpdateKind={updateDraftKind}
          onUpdateUsage={updateDraftUsage}
          onToggleModifier={(modifier) =>
            applyPickerOption({ kind: "modifier", modifier, label: "", width: 1 })
          }
        />
        <FirmwarePanel
          connected={connected}
          firmwareInstallSupported={firmwareInstallSupported}
          firmwareStatus={firmwareStatus}
          onEnterBootloader={() => void enterBootloaderMode()}
          onInstallFirmware={() => void installBundledFirmware()}
          onDownloadFirmware={() => void downloadBundledFirmware()}
        />
        <KeyboardPickerPanel
          draftAssignment={draftAssignment}
          keyboardLayout={keyboardLayout}
          onKeyboardLayoutChange={setKeyboardLayout}
          onPickerOption={applyPickerOption}
          onConsumerOption={applyConsumerOption}
        />
      </section>
    </main>
  );
}
