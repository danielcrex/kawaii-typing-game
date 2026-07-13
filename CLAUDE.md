# CLAUDE.md — Kawaii Typing Friends (v2 rebuild)

`PROJECT.md` is the single source of truth for the build. Read it first. This
file captures repo-specific gotchas for anyone (human or AI) picking up the work.

## What this is
An adaptive touch-typing game for a 10-year-old, rebuilt from a single-file app
into a Vite + TypeScript (vanilla, no framework) app. DOM+CSS for everything
visible; thin `<canvas>` overlay for particles only; Howler for audio.

## Build & run
- `npm run dev` — Vite dev server (opens `/game.html`).
- `npm run build` — `tsc --noEmit` (strict) then `vite build` → static `dist/`.
- `npm run preview` — serve the built `dist/`.

## ⚠️ Migration scaffolding — REMOVE AT CUTOVER
The live site (`typing-game.danielcrex.com`) is served by Cloudflare Workers
from `wrangler.jsonc` `assets.directory: "."`. To keep the OLD single-file game
live while the new app is built, the Vite entry is **`game.html`**, not
`index.html`, and a small plugin in `vite.config.ts`
(`renameEntryToIndex`) renames the built entry to `dist/index.html`.

At the Cloudflare cutover (flip `assets.directory` to `./dist`), this indirection
must be removed:
- delete the old root `index.html` (the single-file game),
- rename `game.html` → `index.html`,
- delete the `renameEntryToIndex` plugin from `vite.config.ts` and point the
  build entry at `index.html`.
Do NOT let `game.html` + the rename shim outlive the migration.

## Deploy safety rule
Every commit must keep `main` deployable. Until the cutover commit, do NOT modify
the root `index.html` or `wrangler.jsonc` — those are what keep the live URL
serving the old game. The cutover is a single dedicated commit (revertible in one
step) that only flips `assets.directory`.

## Architecture (see PROJECT.md §4)
Module-per-responsibility. The pure, DOM-free, testable core:
- `engine/difficulty.ts` — adaptive controller (§5.1). Emits `DerivedParams`
  (fallSpeed / spawnInterval / maxConcurrent) via a `DifficultySource`.
- `input/matcher.ts` — auto-target + per-letter matching (§5.2).

**Single source of difficulty:** the play loop, spawner, and tiles read
`fallSpeed`, `spawnInterval`, and `maxConcurrent` as injected parameters from one
`DifficultySource`. Never hardcode speed/spawn constants into tiles or the
spawner — step 5 swaps the static source for the adaptive one, and that must be a
wiring change, not a refactor.

## Assets
24 mascot images in `Images/` (named `1.jpg`..`24.jpg`, verified 1:1 to level
order). Copied to `public/Images/` so Vite serves them at `/Images/N.jpg`. A
missing image degrades to a colored fallback capsule (§8) — never crashes.
