# Pinout Draft

新8キー版のファームウェアとPCB設計を合わせるためのピン割り当てメモです。

実際のピン番号が確定したら、この表と `firmware/cyborg-mini-8key/cyborg_mini_8key/config.h` を同時に更新します。

## Key Inputs

Direct入力は8本です。各入力はファームウェアで `INPUT_PULLUP` に設定します。

| Logical key | Firmware index | GPIO | Virtual ground rail | Notes |
| --- | ---: | --- | --- | --- |
| K1 | 0 | 7 | VGND1 | Direct input |
| K2 | 1 | 6 | VGND1 | Direct input |
| K3 | 2 | 5 | VGND1 | Direct input |
| K4 | 3 | 4 | VGND1 | Direct input |
| K5 | 4 | 12 | VGND2 | Direct input |
| K6 | 5 | 11 | VGND2 | Direct input |
| K7 | 6 | 10 | VGND2 | Direct input |
| K8 | 7 | 9 | VGND2 | Direct input |

## Virtual Ground

仮想GND用GPIOは2本です。どちらもファームウェアで常時 `OUTPUT LOW` に設定します。

| Rail | Firmware index | GPIO | Notes |
| --- | ---: | --- | --- |
| VGND1 | 0 | 1 | K1-K4 physical group |
| VGND2 | 1 | 8 | K5-K8 physical group |

## Removed Parts

新ハードウェアでは以下を使いません。

- Rotary encoder
- External RGB LED / WS2812B
- OLED

状態表示は本体LEDのみで行います。
