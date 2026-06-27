# HID Report Protocol

WebHID版リマッパーで使う固定長の設定用reportです。

通常のキーボード/Consumer Control HID reportとは別に、vendor-defined reportを1つ持ちます。

## Report

| Field | Value |
| --- | --- |
| Report ID | `10` |
| Direction | Web -> device: Output report |
| Direction | Device -> Web: Input report |
| Size | `32 bytes` |

WebHIDの `sendReport(reportId, data)` では、`reportId` は引数で渡すため、`data[0]` はcommandです。

## Request Layout

```text
byte 0      command
byte 1..31  command payload
```

## Response Layout

```text
byte 0      command
byte 1      status
byte 2      payload length
byte 3..31  response payload
```

## Status

| Value | Name | Meaning |
| ---: | --- | --- |
| `0x00` | `Ok` | Success |
| `0x01` | `InvalidLength` | Request payload is too short |
| `0x02` | `OutOfRange` | Layer or key index is invalid |
| `0x03` | `StorageError` | Device could not persist the updated assignment |
| `0x04` | `Unsupported` | Command is not supported on this MCU/firmware build |
| `0xff` | `UnknownCommand` | Command is not supported |

## Commands

| Value | Name | Request payload | Response payload |
| ---: | --- | --- | --- |
| `0x01` | `GetState` | none | `activeLayer, layerCount, keyCount, virtualGroundCount` |
| `0x02` | `SetLayer` | `layer` | `layer` |
| `0x03` | `GetKey` | `layer, keyIndex` | key assignment payload |
| `0x04` | `SetKey` | key assignment payload | `layer, keyIndex` |
| `0x05` | `EnterBootloader` | none | none, then reboot to UF2 bootloader |
| `0x06` | `RemapperHeartbeat` | none | none |
| `0x07` | `KeyEvent` | not supported | `layer, keyIndex, pressed` |

`KeyEvent` is an asynchronous device-to-Web input report. The firmware emits it when a physical key is pressed while the remapper heartbeat is active, so the UI can select the matching key tile.

## Key Assignment Payload

`GetKey` response and `SetKey` request use the same assignment shape.

```text
byte 0      layer
byte 1      keyIndex
byte 2      kind
byte 3      modifier
byte 4..9   keyboard keycodes[6]
byte 10     consumer usage low byte
byte 11     consumer usage high byte
```

`kind` values:

| Value | Name |
| ---: | --- |
| `0` | None |
| `1` | Keyboard |
| `2` | Consumer |
