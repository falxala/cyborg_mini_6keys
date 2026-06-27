# Firmware Sketch

Arduino IDE / Arduino CLI で開くスケッチ本体です。

## Files

| File | Role |
| --- | --- |
| `cyborg_mini_8key.ino` | `setup()` / `loop()` |
| `config.h` | ピン番号、キー数、reportサイズなどの設定 |
| `key_scanner.*` | 8本Direct入力 + 2本仮想GNDのスキャン |
| `keymap.*` | レイヤー別キーマップ |
| `keymap_storage.*` | EEPROMエミュレーション上のキーマップ永続化 |
| `key_assignment.*` | キー割り当て型 |
| `hid_device.*` | USB HID keyboard / consumer / config report |
| `hid_reports.h` | HID report ID と設定コマンド |
| `readme_drive.*` | Read-only USB MSC README / URL shortcut drive |
| `status_led.*` | 本体LED表示 |

設定用HID report仕様は `../../../docs/hid-report.md` を参照します。

## Before Flashing

`config.h` のピン番号は仮値です。実際のPCBピンに合わせて以下を更新します。

- `KEY_PINS`
- `VIRTUAL_GROUND_PINS`
- `STATUS_LED_KIND`
- `STATUS_LED_PIN`
- `README_DRIVE_ENABLED`

## Build

リポジトリルートで Arduino CLI wrapper を使います。

```sh
scripts/arduino-cli.sh compile \
  --fqbn rp2040:rp2040:waveshare_rp2040_zero \
  --board-options usbstack=tinyusb,freq=125 \
  firmware/cyborg-mini-8key/cyborg_mini_8key
```

`--board-options usbstack=tinyusb,freq=125` は必須です。設定用 vendor HID report を Adafruit TinyUSB で扱い、CPU クロックを 125 MHz に固定します。

## Current Scope

このスケッチは新ハードウェア対応の土台です。

- 通常HID keyboard / consumer output
- WebHID向けvendor-defined config reportの受け口
- RAM上のキーマップ更新
- EEPROMエミュレーションへのキーマップ永続化
- Key 5 起動時だけ表示する Read-only README drive with `README.TXT` and `REMAPPER.URL`
- 通常時は低輝度白、Remapper接続中はカラーホイールの本体LED状態表示
- 通常時のみ押下を低遅延化し、Remapper接続中は通常キー送信を抑止

## README Drive

既定では、READMEドライブは表示しません。`config.h` の `README_DRIVE_ENABLED` は `false` です。

Key 5 を押しながらUSB接続した時だけ、PCに小さいRead-only USBメモリとして `CYBORG8` ドライブを表示します。Key 5 は firmware index `4`、GPIO `12` です。

含まれるファイルは以下のみです。

- `README.TXT`
- `REMAPPER.URL`

常時表示したい場合は `config.h` の `README_DRIVE_ENABLED` を `true` にします。

## Diagnostics Mode

Webの `diagnostics.html` は販売前/出荷前チェック用です。

- WebHID接続状態
- 物理キー8個の押下確認
- `KeyEvent` 受信確認
- firmwareが返す report key count

Diagnostics接続中は Remapper heartbeat が有効になり、通常のkeyboard / consumer outputは止まります。検査中のキー押下はPC入力として送信されず、Web UIの押下チェックだけに使われます。

実機フラッシュとWebHID経由の実機通信確認は次工程です。
