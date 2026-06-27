import type { DeviceState } from "../../features/device/deviceCommands";
import { CYBORG_MINI_USB, formatUsbId } from "../../features/device/usbIdentity";
import { HARDWARE_CONFIG } from "../../features/hardware/hardwareConfig";

type HardwarePanelProps = {
  deviceState: DeviceState | null;
};

export function HardwarePanel({ deviceState }: HardwarePanelProps) {
  return (
    <aside className="panel hardware-panel">
      <div className="panel-meta">
        <span className="panel-kicker">Board Profile</span>
        <h2>Hardware</h2>
      </div>
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
          <dt>USB ID</dt>
          <dd>
            {formatUsbId(CYBORG_MINI_USB.vendorId)}:{formatUsbId(CYBORG_MINI_USB.productId)}
          </dd>
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
  );
}
