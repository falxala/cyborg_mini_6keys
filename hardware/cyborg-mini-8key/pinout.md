# Pinout Draft

新8キー版のファームウェアとPCB設計を合わせるためのピン割り当てメモです。

実際のピン番号が確定したら、この表と `firmware/cyborg-mini-8key/cyborg_mini_8key/config.h` を同時に更新します。

## Key Inputs

Direct入力は8本です。各入力はファームウェアで `INPUT_PULLUP` に設定します。

| Logical key | Firmware index | GPIO | Notes |
| --- | ---: | --- | --- |
| K1 | 0 | TBD | Direct input |
| K2 | 1 | TBD | Direct input |
| K3 | 2 | TBD | Direct input |
| K4 | 3 | TBD | Direct input |
| K5 | 4 | TBD | Direct input |
| K6 | 5 | TBD | Direct input |
| K7 | 6 | TBD | Direct input |
| K8 | 7 | TBD | Direct input |

## Virtual Ground

仮想GND用GPIOは2本です。どちらもファームウェアで常時 `OUTPUT LOW` に設定します。

| Rail | Firmware index | GPIO | Notes |
| --- | ---: | --- | --- |
| VGND1 | 0 | TBD | First physical group |
| VGND2 | 1 | TBD | Second physical group |

## Removed Parts

新ハードウェアでは以下を使いません。

- Rotary encoder
- External RGB LED / WS2812B
- OLED

状態表示は本体LEDのみで行います。
