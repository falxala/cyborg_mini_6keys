#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/apps/web/dist"
OUT_FILE="$ROOT_DIR/firmware/cyborg-mini-8key/cyborg_mini_8key/remapper_drive_assets.h"
TMP_FILE="$OUT_FILE.tmp"

pnpm --filter @cyborg-mini/web build:remapper-drive

sed -i \
  -e 's/<script type="module" crossorigin src="\.\/remapper\.js"/<script src=".\/remapper.js"/' \
  -e 's/ crossorigin href="\.\/remapper\.css"/ href=".\/remapper.css"/' \
  "$DIST_DIR/remapper.html"

{
  printf '#pragma once\n\n'
  printf '#include <Arduino.h>\n\n'
  printf 'namespace RemapperDriveAssets {\n\n'

  xxd -i -n REMAPPER_HTML "$DIST_DIR/remapper.html" | sed 's/^unsigned char /const uint8_t /; s/^unsigned int /const uint32_t /'
  printf '\n'
  xxd -i -n REMAPPER_JS "$DIST_DIR/remapper.js" | sed 's/^unsigned char /const uint8_t /; s/^unsigned int /const uint32_t /'
  printf '\n'
  xxd -i -n REMAPPER_CSS "$DIST_DIR/remapper.css" | sed 's/^unsigned char /const uint8_t /; s/^unsigned int /const uint32_t /'
  printf '\n'

  printf 'constexpr uint32_t REMAPPER_HTML_SIZE = sizeof(REMAPPER_HTML);\n'
  printf 'constexpr uint32_t REMAPPER_JS_SIZE = sizeof(REMAPPER_JS);\n'
  printf 'constexpr uint32_t REMAPPER_CSS_SIZE = sizeof(REMAPPER_CSS);\n\n'
  printf '}  // namespace RemapperDriveAssets\n'
} > "$TMP_FILE"

mv "$TMP_FILE" "$OUT_FILE"
