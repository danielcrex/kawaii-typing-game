/**
 * Level orchestration (PROJECT.md §4 game/session.ts).
 *
 * Owns a single level attempt: tile spawning, falling, escaping, clearing, the
 * typing→tile plumbing, and the win check. Holds the authoritative `state` the
 * loop guards on.
 *
 * KEY DESIGN — single source of difficulty: every speed/spawn/concurrency value
 * is read from the injected `DifficultySource` each tick (never a constant in
 * here, the tiles, or the spawner). Step 5 swaps the static source for the
 * adaptive one with no changes to this file.
 *
 * STATUS (step 3): real typing drives clears via the matcher + per-letter fill.
 * Hearts / authoritative game-over are step 4 (the 'over' guard is already
 * wired); adaptive difficulty is step 5.
 */
import { Spawner } from '../engine/spawner';
import type { DifficultySource } from '../engine/difficulty';
import { Matcher, type MatchTarget } from '../input/matcher';
import { initScore, accuracyOf, type ScoreState } from './scoring';
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
}

/** Read-only view of session progress for the HUD. */
export interface SessionSnapshot {
  state: SessionState;
  cleared: number;
  target: number;
  live: number;
  /** Rolling accuracy 0..1 = correct game keystrokes / total game keystrokes. */
  accuracy: number;
  streak: number;
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
  /** Matched-prefix length (advanced by the matcher). */
  cursor: number;
  /** True while an exit animation plays, so it's excluded from sim/counts. */
  removing: boolean;
}

export class Session {
  state: SessionState = 'intro';

  private readonly opts: SessionOptions;
  private readonly spawner = new Spawner();
  private readonly matcher = new Matcher();
  private readonly tiles: TileModel[] = [];
  private score: ScoreState = initScore();
  private cleared = 0;
  private spawnedTotal = 0;
  private nextId = 1;

  constructor(opts: SessionOptions) {
    this.opts = opts;
  }

  /** Begin play. Spawns one tile immediately so there's no dead opening beat. */
  start(): void {
    this.state = 'playing';
    this.score = initScore();
    this.matcher.reset();
    this.spawner.reset();
    this.spawnTile();
    this.emit();
  }

  /**
   * Route one typeable character from the key router into the matcher and apply
   * the visible result. Every character that reaches here is a *game keystroke*
   * and counts toward accuracy (modifiers/arrows/etc. were filtered upstream) —
   * this is the denominator step 5's adaptive controller reads, so it must be
   * exactly right.
   */
  handleKey(char: string): void {
    if (this.state !== 'playing') return;

    const outcome = this.matcher.feed(char, this.matchSnapshot());

    // Accuracy accounting: total counts every game keystroke; correct counts the
    // ones that acquired/advanced/cleared a tile.
    this.score.totalKeys++;
    if (outcome.correct) this.score.correctKeys++;

    if (outcome.targetId !== null) {
      const tile = this.tiles.find((t) => t.id === outcome.targetId && !t.removing);
      if (tile) {
        switch (outcome.kind) {
          case 'acquired':
          case 'advance':
            tile.cursor = outcome.cursor;
            tile.view.fillTo(tile.cursor / tile.word.length);
            break;
          case 'clear':
            tile.cursor = outcome.cursor;
            tile.view.fillTo(1);
            this.clearTile(tile.id);
            break;
          case 'wrong':
            // Forgiving: a tiny shake, no heart, no fail, cursor unchanged (§5.2).
            tile.view.shake();
            break;
          case 'no-match':
            break;
        }
      }
    }

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

  /** Build the DOM-free snapshot the matcher reasons over (live tiles only). */
  private matchSnapshot(): MatchTarget[] {
    const height = this.opts.field.height;
    const out: MatchTarget[] = [];
    for (const tile of this.tiles) {
      if (tile.removing) continue;
      out.push({
        id: tile.id,
        word: tile.word,
        cursor: tile.cursor,
        // 0 = top, 1 = bottom; used for nearest-to-bottom auto-target ties.
        progressDown: (tile.y + tile.height) / height,
      });
    }
    return out;
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

    this.tiles.push(tile);
    this.spawnedTotal++;
    this.emit();
  }

  /** Clear a tile (celebration + count). Called by the matcher path on completion. */
  private clearTile(id: number): void {
    const tile = this.tiles.find((t) => t.id === id && !t.removing);
    if (!tile) return;
    tile.removing = true;
    this.matcher.release(id); // free the lock so the next key can auto-target
    this.cleared++;
    this.score.streak++;
    if (this.score.streak > this.score.bestStreak) this.score.bestStreak = this.score.streak;

    // TODO(step 4/5): feed metrics to difficulty.onTileResolved(...) once margin
    // + WPM tracking exist. Static source ignores it for now.

    void tile.view.clear().then(() => this.finalizeRemoval(tile));

    if (this.cleared >= TILE_TARGET) {
      this.state = 'won'; // real level-complete scene arrives in step 8
    }
    this.emit();
  }

  /** A tile reached the bottom. Step 4 turns this into a heart loss. */
  private escapeTile(tile: TileModel): void {
    tile.removing = true;
    this.matcher.release(tile.id);
    this.score.streak = 0; // an escape breaks the clean-play streak
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
      accuracy: accuracyOf(this.score),
      streak: this.score.streak,
    });
  }
}
