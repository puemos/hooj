# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hooj is a desktop video editor built with Tauri v2 (Rust backend) and React 19 (TypeScript frontend). It uses FFmpeg as a sidecar binary for video processing — probing, segment extraction, speed/volume adjustment, and export with format/quality options.

## Build & Development Commands

```bash
# First-time setup
scripts/setup-ffmpeg.sh          # Creates FFmpeg/FFprobe sidecar symlinks in binaries/
cd frontend && pnpm install      # Install frontend dependencies

# Development
cargo tauri dev                  # Run full app (starts Vite dev server + Rust backend)

# Build
cargo tauri build                # Production build

# Tests
cargo test                       # Rust tests (domain, history, ffmpeg progress parsing)
cd frontend && pnpm test         # Frontend tests (vitest, jsdom)
cd frontend && pnpm test -- --run  # Frontend tests without watch mode

# Frontend only
cd frontend && pnpm dev          # Vite dev server on port 1420
cd frontend && pnpm build        # TypeScript check + Vite production build
```

## Architecture

**Rust backend** follows a layered architecture:
- `src/commands/` — Tauri IPC command handlers (the API surface called from frontend). Segment mutation commands use `with_project_segments()` helper that locks state, saves history, applies the mutation, and returns updated segments.
- `src/domain/` — Domain models: `Project`, `Segment`, `ExportSettings`/`ExportFormat`/`ExportQuality`, `HoojError`
- `src/application/` — Business logic: `History` (undo/redo stack, max 50 entries)
- `src/infra/ffmpeg/` — FFmpeg command building (`commands.rs`), process execution (`process.rs`), and progress parsing (`progress.rs`). Uses stream copy when speed=1.0 and volume=1.0, re-encodes otherwise.
- `src/state/` — `AppState` with Mutex-wrapped Project and History, shared across commands
- `src/lib.rs` — Module exports and a lazy_static Tokio runtime singleton

**React frontend:**
- State: Zustand stores (`project-store`, `playback-store`, `ui-store`)
- Tauri IPC: all backend calls go through `hooks/use-tauri.ts`
- Components: shadcn/ui (Radix primitives), timeline with segments/playhead/ruler
- Styling: Tailwind CSS 4 with custom light cream/sand theme
- Path alias: `@/*` maps to `src/*`
- Types in `types/index.ts` mirror Rust domain types

**FFmpeg sidecar:** System-installed FFmpeg is symlinked into `binaries/` with target-triple naming (e.g., `ffmpeg-aarch64-apple-darwin`) for Tauri's sidecar mechanism. Requires `brew install ffmpeg` on macOS.

## Key Patterns

- Rust edition 2024
- Segment commands follow a consistent pattern: lock state → save to history → mutate → return segments
- Export uses Tauri IPC channels for real-time progress events from FFmpeg stderr parsing
- Frontend tests mock `@tauri-apps/api` and plugins via vitest aliases in `vitest.config.ts`
