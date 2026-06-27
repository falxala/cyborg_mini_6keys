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
    <section className="panel firmware-panel">
      <div>
        <h2>Firmware</h2>
        <span>{firmwareStatus}</span>
      </div>
      <div className="firmware-actions">
        <button type="button" onClick={onEnterBootloader} disabled={!connected}>
          BOOTSEL
        </button>
        <button type="button" onClick={onInstallFirmware} disabled={!firmwareInstallSupported}>
          Install UF2
        </button>
        <button type="button" onClick={onDownloadFirmware}>
          Download UF2
        </button>
      </div>
    </section>
  );
}
