#!/usr/bin/env bash
# Rebuild esp32_multi and refresh the .bin that the OTA page uploads.
#
# Run this after ANY edit to esp32_multi.ino / types.h / webui.h. Without it the .bin in
# this folder still holds the previous build, and an OTA upload silently reflashes the old
# firmware — which looks exactly like "the upload didn't work".
#
#   ./build.sh              build only
#   ./build.sh mod1         build, then push it to mod1.local over OTA
#   ./build.sh mod1 mod2    build, then push to several boards
#
# Windows: double-click build.bat, or run this from Git Bash.

set -euo pipefail
cd "$(dirname "$0")"

SKETCH_DIR="$PWD"
OUT_BIN="esp32_multi-v0.0.0.ino.bin"      # stable name on purpose: the OTA page always
                                          # points at the same file, so there is never a
                                          # second candidate to pick by mistake.

# The partition scheme MUST have two app slots or OTA cannot work at all. This is the same
# "Minimal SPIFFS (1.9MB APP with OTA)" entry as in the IDE's Tools menu — NOT the similarly
# named "Minimal (1.3MB APP/700KB SPIFFS)", which has no OTA slot.
FQBN="esp32:esp32:esp32c3:PartitionScheme=min_spiffs,CDCOnBoot=cdc,FlashSize=4M"
LIBS="D:/Arduino/libraries"

# arduino-cli ships inside the Arduino IDE; fall back to one on PATH.
CLI="C:/Program Files/Arduino IDE/resources/app/lib/backend/resources/arduino-cli.exe"
[ -x "$CLI" ] || CLI="$(command -v arduino-cli || true)"
if [ -z "$CLI" ]; then
  echo "ERROR: arduino-cli not found."
  echo "  Install the Arduino IDE, or put arduino-cli on PATH."
  exit 1
fi

VERSION="$(sed -n 's/^#define FW_VERSION[[:space:]]*"\(.*\)".*//p' esp32_multi.ino)"

echo "==> building esp32_multi  (FW_VERSION $VERSION)"
echo "    $FQBN"
START=$(date +%s)

"$CLI" compile --fqbn "$FQBN" --libraries "$LIBS" --export-binaries "$SKETCH_DIR"

BUILT="build/esp32.esp32.esp32c3/esp32_multi.ino.bin"
if [ ! -f "$BUILT" ]; then
  echo "ERROR: compile reported success but $BUILT is missing."
  exit 1
fi

cp "$BUILT" "$OUT_BIN"
SIZE=$(wc -c < "$OUT_BIN" | tr -d ' ')
echo
echo "==> updated  $OUT_BIN"
echo "    $SIZE bytes   fw $VERSION   $(date '+%H:%M:%S')   ($(($(date +%s) - START))s)"

# A leftover .bin from an older build is the classic way to flash the wrong firmware, so
# say so loudly rather than quietly leaving it lying next to the fresh one.
OTHERS=$(ls -1 *.bin 2>/dev/null | grep -v "^$OUT_BIN$" || true)
if [ -n "$OTHERS" ]; then
  echo
  echo "!!  other .bin files are in this folder - do NOT upload these, they are stale:"
  echo "$OTHERS" | sed 's/^/      /'
fi

# ── optional: push straight to one or more boards ────────────────────────────
if [ "$#" -gt 0 ]; then
  for HOST in "$@"; do
    echo
    echo "==> uploading to $HOST.local"
    if ! curl -s --max-time 8 "http://$HOST.local/api/health" > /dev/null; then
      echo "    OFFLINE - skipped"
      continue
    fi
    # ?size= lets the board reject a truncated transfer instead of writing a broken image.
    if curl --silent --show-error --fail --max-time 180 \
            -F "f=@$OUT_BIN" "http://$HOST.local/api/ota?size=$SIZE"; then
      echo
      echo "    flashed - rebooting"
    else
      echo
      echo "    UPLOAD FAILED (the board keeps running its old firmware)"
    fi
  done
  echo
  echo "waiting 12s for reboots..."
  sleep 12
  for HOST in "$@"; do
    FW=$(curl -s --max-time 6 "http://$HOST.local/api/health" | sed -n 's/.*"fw":"\([^"]*\)".*//p')
    echo "    $HOST -> fw $FW"
  done
fi

echo
echo "done. Upload $OUT_BIN from the OTA page, or re-run with a host name to push it."
