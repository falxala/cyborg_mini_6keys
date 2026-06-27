import type { HidDevice, HidInputReportEvent, HidNavigator } from "./webHidTypes";
import { CONFIG_REPORT_ID } from "./hidProtocol";
import { CYBORG_MINI_USB } from "./usbIdentity";

export class WebHidTransport {
  private device: HidDevice | null = null;

  get connected() {
    return this.device?.opened ?? false;
  }

  async requestDevice() {
    const hid = this.getHidApi();
    console.info("[hid] requesting device with filters", [CYBORG_MINI_USB]);
    const devices = await hid.requestDevice({
      filters: [
        {
          vendorId: CYBORG_MINI_USB.vendorId,
          productId: CYBORG_MINI_USB.productId,
        },
      ],
    });

    if (devices.length > 0) {
      this.device = devices[0];
      this.logSelectedDevice(this.device);
      return this.device;
    }

    throw new Error(
      "Cyborg Mini が見つかりません。接続後にもう一度試すか、ファームウェアを書き込み直してください",
    );
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

  private logSelectedDevice(device: HidDevice) {
    console.info("[hid] selected device", {
      productName: device.productName,
      vendorId: `0x${device.vendorId.toString(16).padStart(4, "0").toUpperCase()}`,
      productId: `0x${device.productId.toString(16).padStart(4, "0").toUpperCase()}`,
    });
  }
}

function toArrayBuffer(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}
