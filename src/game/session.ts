/**
 * Level orchestration (PROJECT.md §4 game/session.ts).
 *
 * Owns a single level attempt: tile spawning, falling, escaping, clearing, and
 * the win check. Holds the authoritative `state` the loop guards on.
 *
 * KEY DESIGN — single source of difficulty: every speed/spawn/concurrency value
 * is read from the injected `DifficultySource` each tick (never a constant in
 * here, the tiles, or the spawner). Step 5 swaps the static source for the
 * adaptive one with no changes to this file.
 *
 * STATUS (step 2): spawn → fall → escape/clear lifecycle + win at 20 cleared.
 * Hearts / authoritative game-over are step 4; live per-letter matching is step
 * 3 (a temporary click-to-clear stands in so the falling/clearing is visible).
 */
import { Spawner } from '../engine/spawner';
import type { DifficultySource } from '../engine/difficulty';
import { createTile, type TileView } from '../render/tiles';
import { TILE_TARGET } from '../data/levels';

export type SessionState = 'intro' | 'playing' | 'won' | 'over';

/** Play-field dimensions in pixels (the falling area). */
export interface PlayField {
  readonly width: number;
  readonly height: number;
}

/** Mascot visuals shared by every tile in a level. */
export interface TileMascot {
  image: string;
  name: string;
  fallbackColor: string;
}

export interface SessionOptions {
  level: number;
  field: PlayField;
  /** The single source of fallSpeed / spawnInterval / maxConcurrent. */
  difficulty: DifficultySource;
  /** Injected content source (step 8 swaps to the §6.3 word pools). */
  nextWord: () => string;
  mascot: TileMascot;
  /** DOM layer tiles are appended to. */
  layer: HTMLElement;
  /** Notified after every state change so the HUD can refresh. */
  onChange?: (snapshot: SessionSnapshot) => void;
  /** TEMP (step 2): click a tile to clear it, standing in for the matcher. */
  debugClickToClear?: boolean;
}

/** Read-only view of session progress for the HUD. */
export interface SessionSnapshot {
  state: SessionState;
  cleared: number;
  target: number;
  live: number;
}

/** Internal per-tile simulation state. */
interface TileModel {
  id: number;
  word: string;
  x: number;
  /** Current top position (px from field top). */
  y: number;
  /** Previous-tick top, used to interpolate render for smooth motion. */
  prevY: number;
  /** Measured pixel height, for the escape (bottom) threshold. */
  height: number;
  view: TileView;
  /** Matched-prefix length (driven by the matcher in step 3). */
  cursor: number;
  /** True while an exit animation plays, so it's excluded from sim/counts. */
  removing: boolean;
}

export class Session {
  state: SessionState = 'intro';

  private readonly opts: SessionOptions;
  private readonly spawner = new Spawner();
  private readonly tiles: TileModel[] = [];
  private cleared = 0;
  private spawnedTotal = 0;
  private nextId = 1;

  constructor(opts: SessionOptions) {
    this.opts = opts;
  }

  /** Begin play. Spawns one tile immediately so there's no dead opening beat. */
  start(): void {
    this.state = 'playing';
    this.spawner.reset();
    this.spawnTile();
    this.emit();
  }

  /**
   * Fixed-timestep simulation tick. THE authoritative guard lives here: if the
   * level is not actively playing we integrate nothing — no spawn, no fall — so
   * once step 4 sets state to 'over', the world freezes that tick (§5.3).
   */
  update(dt: number): void {
    if (this.state !== 'playing') return;

    const { fallSpeed, spawnInterval, maxConcurrent } = this.opts.difficulty.params;

    // Spawn scheduling — only while we still have tiles left to introduce.
    if (this.spawnedTotal < TILE_TARGET) {
      if (this.spawner.shouldSpawn(dt, spawnInterval, this.liveCount(), maxConcurrent)) {
        this.spawnTile();
      }
    }

    // Fall integration + escape detection.
    for (const tile of this.tiles) {
      if (tile.removing) continue;
      tile.prevY = tile.y;
      tile.y += fallSpeed * dt;
      // Escape once the capsule's bottom crosses the field's bottom edge.
      if (tile.y + tile.height >= this.opts.field.height) {
        this.escapeTile(tile);
      }
    }
  }

  /** Variable render — interpolate between the last two sim positions (§loop). */
  render(alpha: number): void {
    for (const tile of this.tiles) {
      if (tile.removing) continue;
      const y = tile.prevY + (tile.y - tile.prevY) * alpha;
      tile.view.setPosition(tile.x, y);
    }
  }

  /** Tear down all tiles and stop reacting (scene unmount). */
  dispose(): void {
    this.state = 'over';
    for (const tile of this.tiles) tile.view.destroy();
    this.tiles.length = 0;
  }

  /** Tiles currently in play (excludes those animating out). */
  private liveCount(): number {
    let n = 0;
    for (const tile of this.tiles) if (!tile.removing) n++;
    return n;
  }

  /** Create a tile, measure it, and place it at a random x just above the top. */
  private spawnTile(): void {
    const word = this.opts.nextWord();
    const view = createTile({
      word,
      mascotImage: this.opts.mascot.image,
      mascotName: this.opts.mascot.name,
      fallbackColor: this.opts.mascot.fallbackColor,
    });

    // Append first so we can measure the real rendered size for layout.
    this.opts.layer.appendChild(view.el);
    const width = view.el.offsetWidth;
    const height = view.el.offsetHeight;

    const maxX = Math.max(0, this.opts.field.width - width);
    const x = Math.round(Math.random() * maxX);
    const y = -height; // start fully above the field so it slides in

    const tile: TileModel = { id: this.nextId++, word, x, y, prevY: y, height, view, cursor: 0, removing: false };
    view.setPosition(x, y);

    // TEMP (step 2): click-to-clear demonstrates the clear path before the
    // matcher exists. Removed in step 3 when real typing drives clears.
    if (this.opts.debugClickToClear) {
      view.el.style.cursor = 'pointer';
      view.el.addEventListener('click', () => this.clearTile(tile.id));
    }

    this.tiles.push(tile);
    this.spawnedTotal++;
    this.emit();
  }

  /** Clear a tile (celebration + count). Public so the matcher can call it. */
  clearTile(id: number): void {
    const tile = this.tiles.find((t) => t.id === id && !t.removing);
    if (!tile) return;
    tile.removing = true;
    this.cleared++;

    // TODO(step 4/5): report metrics to difficulty.onTileResolved(...) once
    // scoring + margin tracking exist. Static source ignores it for now.

    void tile.view.clear().then(() => this.finalizeRemoval(tile));

    if (this.cleared >= TILE_TARGET) {
      this.state = 'won'; // real level-complete scene arrives in step 8
    }
    this.emit();
  }

  /** A tile reached the bottom. Step 4 turns this into a heart loss. */
  private escapeTile(tile: TileModel): void {
    tile.removing = true;
    void tile.view.escape().then(() => this.finalizeRemoval(tile));
    // TODO(step 4): hearts -= 1 here, with the authoritative game-over check.
    this.emit();
  }

  /** Remove a tile from the sim after its exit animation completes. */
  private finalizeRemoval(tile: TileModel): void {
    tile.view.destroy();
    const i = this.tiles.indexOf(tile);
    if (i >= 0) this.tiles.splice(i, 1);
    this.emit();
  }

  /** Push a snapshot to the HUD listener. */
  private emit(): void {
    this.opts.onChange?.({
      state: this.state,
      cleared: this.cleared,
      target: TILE_TARGET,
      live: this.liveCount(),
    });
  }
}
