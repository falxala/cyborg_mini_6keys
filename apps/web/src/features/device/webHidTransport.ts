import type { HidDevice, HidInputReportEvent, HidNavigator } from "./webHidTypes";
import { CONFIG_REPORT_ID } from "./hidProtocol";
import { CYBORG_MINI_USB, LEGACY_WAVESHARE_USB } from "./usbIdentity";

export class WebHidTransport {
  private device: HidDevice | null = null;

  get connected() {
    return this.device?.opened ?? false;
  }

  async requestDevice() {
    const hid = this.getHidApi();
    const devices = await hid.requestDevice({
      filters: [
        {
          vendorId: CYBORG_MINI_USB.vendorId,
          productId: CYBORG_MINI_USB.productId,
        },
        {
          vendorId: LEGACY_WAVESHARE_USB.vendorId,
          productId: LEGACY_WAVESHARE_USB.productId,
        },
      ],
    });

    if (devices.length > 0) {
      this.device = devices[0];
      return this.device;
    }

    const fallbackDevices = await hid.requestDevice({ filters: [] });

    if (fallbackDevices.length === 0) {
      throw new Error(
        "Cyborg Mini が見つかりません。接続後にもう一度試すか、ファームウェアを書き込み直してください",
      );
    }

    this.device = fallbackDevices[0];
    return this.device;
  }

  async open() {
    if (!this.device) {
      throw new Error("接続するHIDデバイスがありません");
    }

    if (!this.device.opened) {
      await this.device.open();
    }
  }

  async close() {
    if (this.device?.opened) {
      await this.device.close();
    }
  }

  async requestConfigReport(report: Uint8Array, timeoutMs = 1000) {
    const device = this.requireOpenDevice();

    return new Promise<Uint8Array>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("HIDデバイスからの応答がタイムアウトしました"));
      }, timeoutMs);

      const listener = (event: HidInputReportEvent) => {
        if (event.reportId !== CONFIG_REPORT_ID) {
          return;
        }

        cleanup();
        const view = new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength);
        resolve(Uint8Array.from(view));
      };

      const cleanup = () => {
        window.clearTimeout(timeout);
        device.removeEventListener("inputreport", listener);
      };

      device.addEventListener("inputreport", listener);
      device.sendReport(CONFIG_REPORT_ID, toArrayBuffer(report)).catch((error) => {
        cleanup();
        reject(error);
      });
    });
  }

  async sendConfigReport(report: Uint8Array) {
    const device = this.requireOpenDevice();
    await device.sendReport(CONFIG_REPORT_ID, toArrayBuffer(report));
  }

  private getHidApi() {
    const hid = (navigator as HidNavigator).hid;

    if (!hid) {
      throw new Error("このブラウザはWebHIDに対応していません");
    }

    return hid;
  }

  private requireOpenDevice() {
    if (!this.device || !this.device.opened) {
      throw new Error("HIDデバイスが接続されていません");
    }

    return this.device;
  }
}

function toArrayBuffer(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}
