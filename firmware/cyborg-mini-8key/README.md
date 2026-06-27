# Cyborg Mini 8-Key Firmware

新ハードウェア向けファームウェアの置き場です。

## 前提

- 物理キーは8キー
- ロータリーエンコーダは搭載しない
- エンコーダ処理は将来拡張用として旧ファームウェアを参照する
- 外付けRGB LED / OLED は使わない
- 表示は本体LEDのみ
- 設定通信はSerialではなくUSB HID / WebHID用reportへ置き換える

## キースキャン

- `keyPins[8]` を `INPUT_PULLUP` として読む
- `virtualGroundPins[2]` は常時 `OUTPUT LOW`
- 押下時はDirect入力が `LOW`
- 8キーの状態は1バイトのビットマスクで扱う
- マトリクススキャンは行わない

## 参照元

旧6キー版ファームウェアは `legacy/firmware/cyborg-mini-6key/` にあります。
