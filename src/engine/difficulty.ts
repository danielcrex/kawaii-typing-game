/**
 * ADAPTIVE DIFFICULTY CONTROLLER (PROJECT.md §5.1) — pure, no DOM.
 *
 * This is THE fix for "easy-then-impossible". Difficulty is a single scalar
 * intensity `I ∈ [0,1]` that moves *within* the current level's phase bounds.
 * The level decides *what* she types; `I` tunes *how much pressure* to her
 * actual, measured ability. Metrics in → intensity + derived params out.
 *
 * STATUS: `deriveParams` (the pure lerp) and the `DifficultySource` abstraction
 * are live and used by the play loop from step 2. `nextIntensity` (the
 * hysteresis update rule) and the adaptive source land in step 5 — swapping the
 * static source for the adaptive one is then a one-line wiring change, because
 * everything downstream already reads params through `DifficultySource`.
 */
import type { PhaseBounds } from '../data/levels';
import { MAX_CONCURRENT_TILES } from '../data/levels';

/** Rolling metrics over the last N=8 resolved tiles (§5.1). */
export interface RollingMetrics {
  /** Rolling words-per-minute (chars / 5 / minutes). */
  wpm: number;
  /** Correct keystrokes / total keystrokes. */
  accuracy: number;
  /** Avg spare fraction of screen height when a tile cleared (1=top, 0=bottom).
   *  The key drowning signal: low/negative ⇒ she's struggling. */
  margin: number;
}

/** Parameters derived from intensity by lerping within phase bounds (§5.1). */
export interface DerivedParams {
  fallSpeed: number; // px/sec
  spawnInterval: number; // sec
  maxConcurrent: number; // hard-capped at MAX_CONCURRENT_TILES
}

/** Rolling window size for metrics (§5.1). */
export const METRICS_WINDOW = 8;

/** Linear interpolation; `t` is expected in [0,1] but not clamped here. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamp a number to an inclusive range. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Advance intensity given fresh metrics (called after each tile resolves).
 * The hysteresis update rule (ease off faster than we ramp up) lands in step 5.
 */
export function nextIntensity(current: number, _metrics: RollingMetrics): number {
  return current; // TODO(step 5): implement §5.1 update rule + clamp to [0,1].
}

/**
 * Derive concrete play parameters for an intensity within a phase's bounds.
 *
 * Note the deliberate directions (§5.1):
 *  - fallSpeed rises with I: lerp(speedMin → speedMax).
 *  - spawnInterval SHRINKS with I (more pressure = tiles arrive sooner), so we
 *    lerp spawnMax → spawnMin.
 *  - maxConcurrent rises with I, rounded, then hard-capped at 5 — a beginner
 *    cannot track more (§6.1).
 */
export function deriveParams(intensity: number, phase: PhaseBounds): DerivedParams {
  const i = clamp(intensity, 0, 1);
  return {
    fallSpeed: lerp(phase.speedMin, phase.speedMax, i),
    spawnInterval: lerp(phase.spawnMax, phase.spawnMin, i),
    maxConcurrent: clamp(Math.round(lerp(phase.concMin, phase.concMax, i)), 1, MAX_CONCURRENT_TILES),
  };
}

/**
 * The single source of play parameters. The loop, spawner, and tiles read
 * `params` from one of these every tick and never hold speed constants of their
 * own. Step 2 uses a static source; step 5 provides an adaptive source that
 * recomputes `params` inside `onTileResolved` — with no downstream changes.
 */
export interface DifficultySource {
  /** Current play parameters (speed / spawn / concurrency). */
  readonly params: DerivedParams;
  /** Called after each tile resolves so adaptive sources can retune. */
  onTileResolved(metrics: RollingMetrics): void;
}

/**
 * Static difficulty source (step 2): fixed params derived once from the phase
 * at a chosen intensity. `onTileResolved` is intentionally a no-op — nothing
 * self-tunes yet. Default intensity 0.5 sits mid-band so early phases already
 * show ≥2 concurrent tiles for a lively demo without exceeding the caps.
 */
export function createStaticDifficulty(phase: PhaseBounds, intensity = 0.5): DifficultySource {
  const params = deriveParams(intensity, phase);
  return {
    params,
    onTileResolved() {
      /* static: no adaptation until step 5 */
    },
  };
}
