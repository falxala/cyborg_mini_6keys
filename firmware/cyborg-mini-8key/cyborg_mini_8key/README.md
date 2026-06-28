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
| `serial_rescue.*` | Key 5起動時だけ有効な対話式Serial救済コマンド |
| `status_led.*` | 本体LED表示 |

設定用HID report仕様は `../../../docs/hid-report.md` を参照します。

## Before Flashing

`config.h` のピン番号は現行8キー版の配線に合わせています。ハードウェアを変更する場合は、以下と `hardware/cyborg-mini-8key/pinout.md` を同時に更新します。

- `KEY_PINS`
- `VIRTUAL_GROUND_PINS`
- `STATUS_LED_KIND`
- `STATUS_LED_PIN`
- `README_DRIVE_ENABLED`

## Timing Tuning

`config.h` の以下の値で、入力遅延・CPU負荷・WebHID応答待ちを調整します。

| Setting | Default | Purpose |
| --- | ---: | --- |
| `DEBOUNCE_US` | `5000` | キー入力のチャタリング除去時間 |
| `IDLE_SCAN_SLEEP_US` | `100` | 通常キーボード時のスキャン間sleep |
| `REMAPPER_SCAN_SLEEP_US` | `1000` | Remapper / Diagnostics接続中のスキャン間sleep |
| `CONFIG_RESPONSE_READY_RETRIES` | `20` | WebHID設定応答でHID readyを待つ回数 |
| `CONFIG_RESPONSE_RETRY_DELAY_US` | `100` | WebHID設定応答のretry間隔 |

通常入力の遅延を優先する場合は `IDLE_SCAN_SLEEP_US` を小さくします。発熱や消費電力を優先する場合は大きくします。

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

- 通常HID keyboard / consumer output
- WebHID向けvendor-defined config reportの受け口
- RAM上のキーマップ更新
- EEPROMエミュレーションへのキーマップ永続化
- Key 5 起動時だけ表示する Read-only README drive with `README.TXT`, `REMAPPER.URL`, and `RESCUE.CMD`
- Key 5 起動時だけ有効な対話式Serial rescue
- README drive / Serial rescue中は弱い緑の本体LED表示
- 通常時は低輝度白、Remapper接続中はカラーホイールの本体LED状態表示
- 通常時のみ押下を低遅延化し、Remapper接続中は通常キー送信を抑止
- USB suspendからのremote wakeup後にキー状態を再送
- Diagnostics用のreport送受信検査とkeymap storage write/read/restore検査

## README Drive

既定では、READMEドライブは表示しません。`config.h` の `README_DRIVE_ENABLED` は `false` です。

Key 5 を押しながらUSB接続した時だけ、PCに小さいRead-only USBメモリとして `CYBORG8` ドライブを表示します。Key 5 は firmware index `4`、GPIO `12` です。この起動中だけ、Serial rescueも有効になり、本体LEDは弱い緑で点灯します。

含まれるファイルは以下のみです。

- `README.TXT`
- `REMAPPER.URL`
- `RESCUE.CMD`

Windowsでは `RESCUE.CMD` を実行すると、PowerShellの `System.IO.Ports.SerialPort` を使う対話プロンプトを開きます。`help` でコマンド一覧を表示できます。
同じ `RESCUE.CMD` は `pnpm firmware:web` 実行時に `apps/web/public/firmware/` にも書き出されます。

主なSerial rescueコマンド:

```text
state
dump
layer 0
get 0 1
none 0 1
key 1 1 0x00 0x04
consumer 0 1 0x00e2
diag
bootloader
```

`none` / `key` / `consumer` は指定キーの割り当てをすぐ保存します。key番号は `1-8`、layerは `0-5` です。

常時表示したい場合は `config.h` の `README_DRIVE_ENABLED` を `true` にします。

## Diagnostics Mode

Webの `diagnostics.html` は販売前/出荷前チェック用です。

- WebHID接続状態
- 診断用 `DiagnosticReport` の送受信確認
- キーマップ保存領域を使った `DiagnosticStorage` の書込/読込/復元確認
- 物理キー8個の押下確認
- `KeyEvent` 受信確認
- firmwareが返す report key count

Diagnostics接続中は Remapper heartbeat が有効になり、通常のkeyboard / consumer outputは止まります。検査中のキー押下はPC入力として送信されず、Web UIの押下チェックだけに使われます。

Storage testは実際のFlash-backed keymap保存領域へ書き込みます。出荷検査など必要な時だけ実行してください。テスト後は元のキーマップを復元して保存します。
