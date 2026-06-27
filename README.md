# Cyborg Mini 8 Keys

RP2040 Zero / 互換ボードを使う8キー小型キーボードと、WebHIDベースの設定ツールです。

## Current State

- 8キー Direct input
- 6 layers x 8 keys のキーマップ
- Keyboard / Consumer Control HID output
- WebHID Remapper
- Diagnostics for production inspection
- Browser-based firmware updater / bundled UF2 download
- GitHub Pages deployment from `main`

旧6キー版のWeb / firmware / hardwareは `legacy/` に退避しています。現行実装は旧Web Serial方式ではなく、USB HID / WebHID を使います。

## Pages

Vite multi-page buildで以下を出力します。

| Page | Path | Purpose |
| --- | --- | --- |
| Home | `/` | 製品ページと入口 |
| Remapper | `/remapper.html` | キーマップ読込、編集、保存、ファームウェア更新 |
| Diagnostics | `/diagnostics.html` | 出荷前/販売前の個体検査 |

Remapper / Diagnostics は別HTMLとして直接開けます。ブランドクリックはHomeへ戻ります。

## Repository Layout

```text
apps/web/                       React + TypeScript + Vite web app
firmware/cyborg-mini-8key/      RP2040 firmware
hardware/cyborg-mini-8key/      現行8キー版ハードウェアメモ
docs/hid-report.md              WebHID config report protocol
legacy/                         旧6キー版 reference
scripts/                        Arduino CLI wrapper / firmware build scripts
```

## Hardware Summary

現在のピンマップは `hardware/cyborg-mini-8key/pinout.md` と `firmware/cyborg-mini-8key/cyborg_mini_8key/config.h` を正とします。

| Logical key | Firmware index | GPIO | Virtual ground |
| --- | ---: | ---: | --- |
| Key 1 | 0 | 7 | VGND1 GPIO 1 |
| Key 2 | 1 | 6 | VGND1 GPIO 1 |
| Key 3 | 2 | 5 | VGND1 GPIO 1 |
| Key 4 | 3 | 4 | VGND1 GPIO 1 |
| Key 5 | 4 | 12 | VGND2 GPIO 8 |
| Key 6 | 5 | 11 | VGND2 GPIO 8 |
| Key 7 | 6 | 10 | VGND2 GPIO 8 |
| Key 8 | 7 | 9 | VGND2 GPIO 8 |

Key 5を押しながらUSB接続すると、Read-only README driveをその起動だけ表示します。通常は非表示です。

## Firmware

Sketch:

```text
firmware/cyborg-mini-8key/cyborg_mini_8key/
```

主な実装:

- `key_scanner.*`: 8本Direct入力 + 2本仮想GND
- `keymap.*`: RAM上の6 layer x 8 key assignment
- `keymap_storage.*`: Flash-backed EEPROM emulationへの永続化
- `hid_device.*`: Keyboard / Consumer / vendor config report
- `readme_drive.*`: Key 5起動時だけ表示するRead-only drive
- `status_led.*`: 本体LED状態表示

Firmware buildはRP2040 Arduino coreの `waveshare_rp2040_zero` を使い、CPU clockを `125 MHz` に固定します。

```sh
pnpm firmware:build
pnpm firmware:web
```

`pnpm firmware:web` は `apps/web/public/firmware/cyborg-mini-8key.uf2` も更新します。

## Diagnostics

Diagnosticsは全個体検査向けです。

- WebHID support
- Device connection
- Physical key press event
- Diagnostic HID report send/receive
- Keymap storage write/read/restore
- Firmware-reported key count

Storage testは実際のFlash-backed keymap保存領域へ書き込みます。出荷検査など必要な時だけ実行してください。検査はテストパターンを書き、再読込検証後に元のキーマップを復元します。

## Development

```sh
pnpm install
pnpm dev
pnpm typecheck
pnpm build
pnpm firmware:build
pnpm firmware:web
```

## Deployment

GitHub Pages deploy workflowは `main` へのpush、または手動実行で動きます。PR / feature branchではPages deployを走らせません。

The workflow uses Node.js 24 and builds `apps/web/dist`.

## USB Identity

Default firmware identity:

| Field | Value |
| --- | --- |
| Vendor ID | `0xCAFE` |
| Product ID | `0xC608` |
| Manufacturer | `Cyborg Project` |
| Product | `Cyborg Mini 8 Keys` |

This VID/PID is for development. Replace it with an assigned VID/PID before commercial distribution.

WebHID filter is managed in `apps/web/src/features/device/usbIdentity.ts`.

## Reference

- HID protocol: `docs/hid-report.md`
- Web app notes: `apps/web/README.md`
- Firmware notes: `firmware/cyborg-mini-8key/README.md`
- Sketch notes: `firmware/cyborg-mini-8key/cyborg_mini_8key/README.md`
- Hardware pinout: `hardware/cyborg-mini-8key/pinout.md`
- Legacy 6-key implementation: `legacy/`
