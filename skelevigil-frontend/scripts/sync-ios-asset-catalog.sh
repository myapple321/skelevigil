#!/usr/bin/env bash
# Regenerate ios/SkeleVigil/Images.xcassets PNGs from the same sources as app.json (icon + splash).
# Run after `npx expo prebuild` if Images.xcassets exists but binaries are missing or stale.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
XC="$ROOT/ios/SkeleVigil/Images.xcassets"
ICON_SRC="$ROOT/assets/icon_master.png"
SPLASH_SRC="$ROOT/assets/images/splash-icon.png"
APP_ICON_OUT="$XC/AppIcon.appiconset/App-Icon-1024x1024@1x.png"
SPLASH_DIR="$XC/SplashScreenLegacy.imageset"

if [[ ! -d "$XC" ]]; then
  echo "sync-ios-asset-catalog: missing $XC — run npx expo prebuild (ios) first." >&2
  exit 1
fi
if [[ ! -f "$ICON_SRC" ]]; then
  echo "sync-ios-asset-catalog: missing $ICON_SRC" >&2
  exit 1
fi
if [[ ! -f "$SPLASH_SRC" ]]; then
  echo "sync-ios-asset-catalog: missing $SPLASH_SRC" >&2
  exit 1
fi

mkdir -p "$XC/AppIcon.appiconset" "$SPLASH_DIR"

# App Store / Xcode single-slot iOS icon: 1024×1024, no interlacing issues; sips normalizes format.
sips -z 1024 1024 "$ICON_SRC" --out "$APP_ICON_OUT" >/dev/null
echo "Wrote $APP_ICON_OUT"

# Legacy splash imageset (Expo): three slots; same pixel size is accepted by actool.
for name in image.png 'image@2x.png' 'image@3x.png'; do
  sips -z 1024 1024 "$SPLASH_SRC" --out "$SPLASH_DIR/$name" >/dev/null
  echo "Wrote $SPLASH_DIR/$name"
done

echo "sync-ios-asset-catalog: done."
