#!/usr/bin/env bash
set -euo pipefail

# Determine target triple
ARCH=$(uname -m)
OS=$(uname -s | tr '[:upper:]' '[:lower:]')

case "$ARCH" in
  x86_64)  ARCH="x86_64" ;;
  arm64)   ARCH="aarch64" ;;
  aarch64) ARCH="aarch64" ;;
  *)       echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

case "$OS" in
  darwin) TRIPLE="${ARCH}-apple-darwin" ;;
  linux)  TRIPLE="${ARCH}-unknown-linux-gnu" ;;
  *)      echo "Unsupported OS: $OS"; exit 1 ;;
esac

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BINARIES_DIR="$SCRIPT_DIR/../binaries"

mkdir -p "$BINARIES_DIR"

# Find system ffmpeg/ffprobe
FFMPEG=$(which ffmpeg 2>/dev/null || true)
FFPROBE=$(which ffprobe 2>/dev/null || true)

if [ -z "$FFMPEG" ] || [ -z "$FFPROBE" ]; then
  echo "Error: ffmpeg and ffprobe must be installed (brew install ffmpeg)"
  exit 1
fi

# Create symlinks with target-triple naming for Tauri sidecar
ln -sf "$FFMPEG" "$BINARIES_DIR/ffmpeg-$TRIPLE"
ln -sf "$FFPROBE" "$BINARIES_DIR/ffprobe-$TRIPLE"

echo "Symlinked sidecars into $BINARIES_DIR:"
ls -la "$BINARIES_DIR"
