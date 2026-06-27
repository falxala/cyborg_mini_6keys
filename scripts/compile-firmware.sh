#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
FQBN="${FQBN:-rp2040:rp2040:waveshare_rp2040_zero}"

exec "$ROOT_DIR/scripts/arduino-cli.sh" compile \
  --fqbn "$FQBN" \
  --board-options usbstack=tinyusb \
  "$ROOT_DIR/firmware/cyborg-mini-8key/cyborg_mini_8key"
