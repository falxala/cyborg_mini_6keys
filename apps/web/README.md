# Web Remapper

React + TypeScript + Vite で作り直す新しいWebHID版リマッパーです。

## 方針

- 既存の静的HTML/JavaScriptは `legacy/web/` を参照する
- UI、状態管理、WebHID通信、キー定義、表示名変換を分離する
- 新ハードウェアの8キー構成を前提にする
- Web Serial API は使わない
- 固定長の設定用HID report仕様は `../../docs/hid-report.md` を参照する
- WebHID接続候補は `0xCAFE:0xC608` のCyborg Miniだけに絞る
- UF2ファームウェア更新は WebHID のブートローダ移行と File System Access API の書き込みを使う

## 主なディレクトリ

```text
src/
├── app/
├── features/
│   ├── device/
│   ├── firmware/
│   ├── hardware/
│   └── keymap/
└── shared/
```

## 開発コマンド

リポジトリルートから実行します。

```sh
pnpm install
pnpm dev
pnpm typecheck
pnpm build
pnpm firmware:web
```
