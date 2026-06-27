import type { HidDevice, HidInputReportEvent, HidNavigator } from "./webHidTypes";
import { CONFIG_REPORT_ID } from "./hidProtocol";

export class WebHidTransport {
  private device: HidDevice | null = null;

  get connected() {
    return this.device?.opened ?? false;
  }

  async requestDevice() {
    const hid = this.getHidApi();
    const devices = await hid.requestDevice({ filters: [] });

    if (devices.length === 0) {
      throw new Error("HIDデバイスが選択されませんでした");
    }

    this.device = devices[0];
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
