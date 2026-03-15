<p align="center">
  <img src="icons/app-icon.png" width="128" />
</p>

<h1 align="center">Hooj</h1>

A desktop video editor built with Tauri and React.

<!-- screenshot -->

## Features

- Import video files (MP4, MKV, AVI, MOV, WebM)
- Split, trim, reorder, duplicate, and delete segments
- Per-segment speed (0.1x to 32x) and volume (0 to 200%)
- Drag-and-drop timeline with thumbnail previews
- Undo/redo with 50-step history
- Export to MP4 (H.264), WebM (VP9), or MOV (ProRes)
- Three quality presets: low, medium, high
- Real-time export progress
- Keyboard shortcuts for common operations
- Stream copy when no speed or volume changes are applied

## Requirements

- macOS (other platforms untested)
- Rust (stable, 2024 edition)
- Node.js and pnpm
- FFmpeg (`brew install ffmpeg` on macOS)

## Getting Started

1. Clone the repo

   ```bash
   git clone https://github.com/puemos/hooj.git
   cd hooj
   ```

2. Set up FFmpeg sidecar

   ```bash
   scripts/setup-ffmpeg.sh
   ```

3. Install frontend dependencies

   ```bash
   cd frontend && pnpm install
   ```

4. Run the app

   ```bash
   cargo tauri dev
   ```

## Building

```bash
cargo tauri build
```

Produces a platform-specific application bundle.

## Tests

Rust unit tests for domain logic, history, and FFmpeg progress parsing.

```bash
cargo test
```

Frontend tests using Vitest.

```bash
cd frontend && pnpm test -- --run
```

## Architecture

Tauri v2 app with a Rust backend and React 19 frontend. FFmpeg runs as a sidecar binary for all video processing.

```
src/
  commands/      Tauri IPC handlers
  domain/        Project, Segment, ExportSettings
  application/   Undo/redo history
  infra/         FFmpeg command building and execution
  state/         Shared app state
frontend/
  src/
    components/  React components and timeline
    hooks/       Tauri IPC hooks, keyboard shortcuts
    store/       Zustand stores
    lib/         Utilities
```

## License

[MIT](LICENSE)
