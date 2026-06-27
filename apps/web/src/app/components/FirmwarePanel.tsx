type FirmwarePanelProps = {
  connected: boolean;
  firmwareInstallSupported: boolean;
  firmwareStatus: string;
  onEnterBootloader: () => void;
  onInstallFirmware: () => void;
  onDownloadFirmware: () => void;
};

export function FirmwarePanel({
  connected,
  firmwareInstallSupported,
  firmwareStatus,
  onEnterBootloader,
  onInstallFirmware,
  onDownloadFirmware,
}: FirmwarePanelProps) {
  return (
    <div className="firmware-panel">
      <div className="firmware-summary">
        <h2>Firmware</h2>
        <span>{firmwareStatus}</span>
      </div>
      <div className="firmware-help">
        <section>
          <h3>通常の更新</h3>
          <ol>
            <li>デバイスを接続した状態で <strong>BOOTSEL</strong> を押します。</li>
            <li><strong>Install UF2</strong> を押します。</li>
            <li>フォルダ選択では、PCに現れた <strong>RPI-RP2</strong> または <strong>UF2ブートローダ</strong> のドライブを選びます。</li>
          </ol>
        </section>
        <section>
          <h3>接続できない時の修復</h3>
          <ol>
            <li>本体の <strong>BOOT</strong> を押したままにします。</li>
            <li><strong>RESET</strong> を押して離します。</li>
            <li>最後に <strong>BOOT</strong> を離します。</li>
            <li>PCに出た <strong>RPI-RP2</strong> / <strong>UF2</strong> ドライブを選んで書き込みます。</li>
          </ol>
        </section>
      </div>
      <div className="firmware-actions">
        <button type="button" className="primary-action" onClick={onEnterBootloader} disabled={!connected}>
          BOOTSEL
        </button>
        <button type="button" onClick={onInstallFirmware} disabled={!firmwareInstallSupported}>
          Install UF2
        </button>
        <button type="button" onClick={onDownloadFirmware}>
          Download UF2
        </button>
      </div>
    </div>
  );
}
