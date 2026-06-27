# Cyborg Mini 8 Keys

RP2040 Zero を使った 8 キー小型キーボードと、そのキー割り当て Web ツールです。

Web 側は `pnpm` + React + TypeScript + Vite に置き換え、PC との設定通信を Web Serial から USB HID / WebHID に移行します。旧6キー版のWeb/firmware/hardwareは `legacy/` に退避し、UIと機能の参考実装として扱います。

## 移行後の前提

今回の移行では、現行コードをそのまま移植するのではなく、UIと機能の参考実装として扱います。Web側もファームウェア側もファイルを役割ごとに構造化し、React / WebHID / 新ハードウェア仕様に合わせて作り直します。

新しいハードウェア仕様は以下を前提にします。

- 物理キーは 6 キーから 8 キーへ変更
- ロータリーエンコーダは取り除く
- エンコーダ関連の設計は、将来拡張用として残せる形に分離する
- キーマップは 8 個の物理キーを主対象にする
- キースキャンはマトリクスではなく、8本のDirect入力を個別に読む
- 仮想GND用GPIOは2本に分け、どちらも `OUTPUT LOW` としてGND相当に使う
- 外付けRGB LEDは廃止する
- OLEDは廃止する
- LED表示は本体LEDのみを使う
- 現行のレイヤー、キー割り当て、JIS/US表示、Consumer Control の考え方は参考にする

## 現在の構成

```text
.
├── apps/
│   └── web/
│       ├── index.html
│       ├── package.json
│       ├── public/
│       └── src/
├── hardware/
│   └── cyborg-mini-8key/
├── firmware/
│   └── cyborg-mini-8key/
│       └── cyborg_mini_8key/
├── legacy/
│   ├── firmware/cyborg-mini-6key/
│   ├── hardware/cyborg-mini-6key/
│   └── web/
├── package.json
└── pnpm-workspace.yaml
```

`legacy/firmware/cyborg-mini-6key/build/` には旧6キー版のビルド済み `.uf2` / `.bin` / `.elf` / `.map` が含まれています。旧ソースとして主に確認する対象は `legacy/firmware/cyborg-mini-6key/*.ino` です。

## React Web App

新しいWebアプリは `apps/web/` です。

```text
apps/web/src/
├── app/
├── features/
│   ├── device/
│   ├── hardware/
│   └── keymap/
└── shared/
```

主な責務:

- `app/`: Reactアプリの画面構成
- `features/device/`: WebHID接続、送受信
- `features/hardware/`: 8キー新ハードウェア定義
- `features/keymap/`: レイヤー別キーマップ型と初期状態

開発コマンド:

```sh
pnpm install
pnpm dev
pnpm typecheck
pnpm build
```

## 8-Key Firmware

新しいファームウェアスケッチは `firmware/cyborg-mini-8key/cyborg_mini_8key/` です。

主な責務:

- `config.h`: 8本のDirect入力、2本の仮想GND、本体LEDなどのピン設定
- `key_scanner.*`: `INPUT_PULLUP` のDirect入力と `OUTPUT LOW` の仮想GNDによる8キー読み取り
- `keymap.*`: 6レイヤー x 8キーのRAM上キーマップ
- `hid_device.*`: 通常HID keyboard / consumer出力とWebHID向けvendor-defined report
- `status_led.*`: 本体LEDのみの状態表示

設定用HID report仕様は `docs/hid-report.md` にまとめています。

`config.h` のピン番号は仮値です。実際のPCBピンが確定したら、`hardware/cyborg-mini-8key/pinout.md` と合わせて更新します。

現時点の新firmwareは土台です。EEPROM永続化、Web側report送受信、実機コンパイル確認は次工程で行います。

## 現行 Web ツール

旧 Web ツールは `legacy/web/index.html`、`legacy/web/script.js`、`legacy/web/style.css` の3ファイルで動作します。

- ブラウザ API: Web Serial API
- 接続フィルタ: `usbVendorId` が `0xcafe` または `0x239a`
- 通信速度: `115200`
- UI: 6個の物理キー、ロータリーエンコーダ左右、6レイヤー、JIS/US表示切替、Consumer Controlキー
- 状態管理: DOM上の checked 状態とグローバル変数
- 書き込み方式: hidden `textarea` に行ベースのコマンドを蓄積し、WRITE時に順次送信

主な処理は `legacy/web/script.js` に集約されています。

| 処理 | 現行関数 |
| --- | --- |
| 初期化 | `window.onload` |
| Serial接続 | `SerialBegin`, `openSerial`, `closeSerial`, `readUntilClosed` |
| キー選択 | `typed` |
| 書き込みデータ作成 | `create_senddata` |
| デバイスからの応答処理 | `readfunction` |
| レイヤー切替 | `setLayerNum`, `prev`, `next`, `send_layer` |
| レイヤーマスク | `layerMask` |
| 表示用キー名変換 | `mod2str`, `code2str` |

## 現行 Serial プロトコル

Web とファームウェアの設定通信は、改行区切りのテキストコマンドです。

| コマンド | 方向 | 概要 | 例 |
| --- | --- | --- | --- |
| `M_<layer>_<key>_[...]` | Web -> device | キー割り当てを書き込む | `M_0_1_[0x00,0x04,0x00,0x00,0x00,0x00,0x00]` |
| `A_` | Web -> device | 全レイヤーの割り当てを読み出す | `A_` |
| `A<layer><key> ...` | device -> Web | 割り当て読み出し結果 | `A01 | 0 4 0` |
| `L_<layer>` | Web -> device | 現在レイヤーを変更 | `L_2` |
| `MASK_<bitmask>` | Web -> device | 有効レイヤーのマスクを保存 | `MASK_63` |
| `B_<brightness>` | Web -> device | LED輝度を保存 | `B_64` |
| `E_<0 or 1>` | Web -> device | エンコーダ方向反転を保存 | `E_1` |
| `D_` | Web -> device | EEPROMダンプ | `D_` |
| `lyr:<n>` | device -> Web | 現在レイヤー通知 | `lyr:0` |
| `kys:<bit>` | device -> Web | 押下キー状態通知 | `kys:1` |
| `enc:+` / `enc:-` | device -> Web | エンコーダ回転通知 | `enc:+` |

現行の `M_` コマンドは7バイト分の配列を文字列化していますが、ファームウェア側では主に先頭3要素を EEPROM に保存しています。

```text
[0] modifier
[1] key code または 0xFF
[2] consumer control code
[3..6] 予約/将来拡張相当
```

## 現行ファームウェア

旧ファームウェアは Arduino IDE 向けの複数 `.ino` ファイルです。新8キー版は `firmware/cyborg-mini-8key/` に作成します。

### 必要環境

旧ソースコメント上の前提は以下です。

- Board manager: Raspberry Pi Pico/RP2040 by Earle F. Philhower
- Library: Adafruit TinyUSB Library
- Library: Adafruit NeoPixel
- EEPROM emulation

### 主要ファイル

| ファイル | 役割 |
| --- | --- |
| `legacy/firmware/cyborg-mini-6key/cyborg_rp2040zero_mini_6key.ino` | ピン定義、グローバル状態、TinyUSB HID descriptor、`setup`, `loop`, EEPROM初期化 |
| `legacy/firmware/cyborg-mini-6key/main_function.ino` | キー読み取り、レイヤー変更、Serialコマンド処理、HID送信、エンコーダ処理 |
| `legacy/firmware/cyborg-mini-6key/sub_function.ino` | ステータス出力、LED制御、JIS入力補助、EEPROM補助 |
| `legacy/firmware/cyborg-mini-6key/default_keys.ino` | 初期キーマップ |
| `legacy/firmware/cyborg-mini-6key/interrupt.ino` | ロータリーエンコーダ割り込み |

### ハードウェア定義

旧ハードウェアの定義です。移行後は8キー仕様に置き換え、外付けRGB LEDとOLEDは使いません。

| 用途 | 定義 |
| --- | --- |
| キー入力 | `ROW1..ROW6` = GPIO `0, 1, 2, 3, 6, 7` |
| ロータリーエンコーダ | `SIGA1 = 12`, `SIGB1 = 11` |
| 押しボタン | `PB1 = 10` |
| WS2812B | `PIN = 9` |
| 内蔵LED相当 | `WS_BUILTIN = 16` |
| 最大輝度 | `MAXIMUM_BRIGHTNESS = 128` |

移行後の表示方針:

- 外付けRGB LED / WS2812B は廃止
- OLED は廃止
- 状態表示は本体LEDのみで行う
- レイヤー表示を本体LEDだけで行う場合は、点灯/点滅パターンで表現する
- 現行の `Adafruit_NeoPixel` 前提のLED制御は移植対象ではなく参考扱いにする

移行後のキースキャン方針:

- `keyPins[8]`: 8本のDirect入力ピン
- `virtualGroundPins[2]`: 2本の仮想GND出力ピン
- `virtualGroundPins` は両方とも常時 `OUTPUT LOW`
- `keyPins` は `INPUT_PULLUP`
- 押下時はDirect入力が `LOW` になる
- 8キーの押下状態は1バイトのビットマスクで扱う
- マトリクスではないため、同時押し時のゴーストは発生しない

### キーマップ

現在のキーマップ配列は以下です。

```cpp
uint8_t layer_keys[6][10][7];
```

実際のUIで扱う入力は以下の8箇所です。

- `0..5`: 物理キー6個
- `6`: ロータリーエンコーダ右回転
- `7`: ロータリーエンコーダ左回転

配列上は `10` キー分ありますが、現行UIと読み出し処理は主に `0..7` を使っています。

### HID出力

通常のキーボードとしてのHID出力は既にTinyUSBで実装されています。

- Keyboard report ID: `RID_KEYBOARD1..RID_KEYBOARD6`
- Consumer Control report ID: `RID_CONSUMER_CONTROL`
- Mouse report ID: `RID_MOUSE`

現行の設定通信は Serial ですが、キー入力そのものはUSB HIDとしてホストへ送信されています。

## 現行コードで確認した注意点

- Web側はグローバル変数とDOM直接操作が多く、React化では状態モデルを先に決める必要があります。
- キー定義がHTMLに直接埋め込まれているため、React化ではキー定義データと表示コンポーネントに分離します。
- 現行通信はテキスト行のためデバッグしやすい一方、WebHID化では report ID、report長、Feature/Input/Output report の設計が必要です。
- `readkeys()` と `send_layer()` は手動の `Uint8Array` で `\n` / `\r` 相当を送ろうとしていますが、現状の配列は文字としてのバックスラッシュを含むため、WebHID移行時にコマンド表現ごと整理します。
- `layer_keys[6][10][7]` と EEPROM の保存単位に余白があります。新プロトコルでは固定長の構造体として明示した方が安全です。
- `Switch_function()` は `String` の破壊的な `substring` と区切り文字探索で解析しています。HID化時はバイナリ構造体か明確なパケット形式に置き換える方針です。
- Serial接続中は `sendKeys()` がHIDキー入力を抑止します。WebHID化後も、設定中の誤入力防止を維持するか設計判断が必要です。

## React / WebHID 移行方針

次工程では、現行仕様を保ちながら内部構造を作り直します。

### Web側

- `pnpm` ベースのReactプロジェクトへ移行
- Vite + React + TypeScript を基本候補にする
- 画面、状態管理、HID通信、キー定義、表示名変換をファイル単位で分離する
- UI状態を以下に分離する
  - 接続状態
  - 現在レイヤー
  - 選択中の物理キー
  - レイヤー別キーマップ
  - レイヤーマスク
  - JIS/US表示モード
- キー一覧はHTML直書きではなくデータ定義から描画する
- Web Serial依存を削除し、`navigator.hid` で接続/読み書きする
- HID通信処理はUIから独立したモジュールに分ける

### ファームウェア側

- 通常キーボードHID出力は維持する
- 設定用に vendor-defined HID report を追加する
- Serialコマンド解析を設定用HID report解析に置き換える
- 8キー前提のピン定義、スキャン処理、キーマップ構造へ変更する
- キースキャンは2本の仮想GNDを常時 `OUTPUT LOW`、8本のDirect入力を `INPUT_PULLUP` で読む
- エンコーダ処理は本体処理から切り離し、将来復帰できる任意モジュールとして扱う
- 外付けRGB LED / OLED 用の依存ライブラリと制御処理は削除する
- 本体LEDのみで接続状態、書き込み状態、レイヤー状態などの最低限の表示を行う
- EEPROM保存形式を明確化する
- 既存のレイヤー、デフォルトキーの考え方は維持する
- エンコーダの挙動は将来拡張として参照できるように残す

### 予定するHID report案

まだ確定ではありませんが、次のような固定長パケットを候補にします。

```text
reportId: 設定用 report ID
command: 1 byte
layer: 1 byte
keyIndex: 1 byte
payloadLength: 1 byte
payload: fixed length
checksum/reserved: optional
```

候補コマンド:

| command | 内容 |
| --- | --- |
| `GET_KEYMAP` | 指定レイヤー/キー、または全体の読み出し |
| `SET_KEYMAP` | 指定レイヤー/キーの保存 |
| `GET_STATE` | 現在レイヤー、マスク、輝度などの読み出し |
| `SET_LAYER` | 現在レイヤー変更 |
| `SET_LAYER_MASK` | レイヤーマスク保存 |
| `SET_BRIGHTNESS` | 輝度保存 |
| `SET_ENCODER_INVERT` | エンコーダ反転保存 |
| `RESET_EEPROM` | EEPROM初期化 |

## 次に行う作業

1. WebHID report仕様を確定する
2. React側のキー定義、キー表示、割り当て編集UIを実装する
3. WebHID通信モジュールに読み出し/書き込み処理を追加する
4. 新PCBの確定ピン番号を `config.h` と `pinout.md` に反映する
5. Arduino環境で新firmwareをコンパイルする
6. EEPROM永続化を追加する
7. SerialプロトコルをHID reportへ完全に置き換える
8. 実機で接続、読み出し、書き込み、再起動後のEEPROM反映を確認する

## ブランチ

作業ブランチ:

```text
react-hid
```
