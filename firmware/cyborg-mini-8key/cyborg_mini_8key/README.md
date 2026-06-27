# Firmware Sketch

Arduino IDE / Arduino CLI で開くスケッチ本体です。

## Files

| File | Role |
| --- | --- |
| `cyborg_mini_8key.ino` | `setup()` / `loop()` |
| `config.h` | ピン番号、キー数、reportサイズなどの設定 |
| `key_scanner.*` | 8本Direct入力 + 2本仮想GNDのスキャン |
| `keymap.*` | レイヤー別キーマップ |
| `key_assignment.*` | キー割り当て型 |
| `hid_device.*` | USB HID keyboard / consumer / config report |
| `hid_reports.h` | HID report ID と設定コマンド |
| `status_led.*` | 本体LED表示 |

設定用HID report仕様は `../../../docs/hid-report.md` を参照します。

## Before Flashing

`config.h` のピン番号は仮値です。実際のPCBピンに合わせて以下を更新します。

- `KEY_PINS`
- `VIRTUAL_GROUND_PINS`
- `STATUS_LED_KIND`
- `STATUS_LED_PIN`

## Build

リポジトリルートで Arduino CLI wrapper を使います。

```sh
scripts/arduino-cli.sh compile \
  --fqbn rp2040:rp2040:waveshare_rp2040_zero \
  --board-options usbstack=tinyusb \
  firmware/cyborg-mini-8key/cyborg_mini_8key
```

`--board-options usbstack=tinyusb` は必須です。設定用 vendor HID report を Adafruit TinyUSB で扱います。

## Current Scope

このスケッチは新ハードウェア対応の土台です。

- 通常HID keyboard / consumer output
- WebHID向けvendor-defined config reportの受け口
- RAM上のキーマップ更新
- 本体LEDのみの状態表示

EEPROM永続化とWeb側report実装は次工程です。
