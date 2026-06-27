import type { HidDevice, HidNavigator } from "./webHidTypes";

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

  private getHidApi() {
    const hid = (navigator as HidNavigator).hid;

    if (!hid) {
      throw new Error("このブラウザはWebHIDに対応していません");
    }

    return hid;
  }
}
