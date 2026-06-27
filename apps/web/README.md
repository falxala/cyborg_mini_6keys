# Web Remapper

React + TypeScript + Vite で作り直す新しいWebHID版リマッパーです。

## 方針

- 既存の静的HTML/JavaScriptは `legacy/web/` を参照する
- UI、状態管理、WebHID通信、キー定義、表示名変換を分離する
- 新ハードウェアの8キー構成を前提にする
- Web Serial API は使わない
- 固定長の設定用HID report仕様は `../../docs/hid-report.md` を参照する
- WebHID接続候補は `0x239A:0xCAFE` のCyborg Mini 8 Keys のみを使う
- UF2ファームウェア更新は WebHID のブートローダ移行と File System Access API の書き込みを使う

## Pages

Viteのmulti-page buildで以下を出力します。

| Page | Source | Output |
| --- | --- | --- |
| Home | `src/main.tsx` | `index.html` |
| Remapper | `src/pages/remapper.tsx` | `remapper.html` |
| Diagnostics | `src/pages/diagnostics.tsx` | `diagnostics.html` |

Homeは製品ページと入口です。RemapperとDiagnosticsは別HTMLとして直接開けます。

Diagnosticsは販売前/出荷前チェック用です。WebHID接続後、物理キーを押すと `KeyEvent` で押下済みが記録されます。Remapper heartbeat中はファームウェア側で通常キー送信が止まるため、検査入力がPCへ流れません。

## 主なディレクトリ

```text
src/
├── app/
├── features/
│   ├── device/
│   ├── firmware/
│   ├── hardware/
│   └── keymap/
├── pages/
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
