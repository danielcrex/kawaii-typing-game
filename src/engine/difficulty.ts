/**
 * ADAPTIVE DIFFICULTY CONTROLLER (PROJECT.md §5.1) — pure logic, no DOM.
 *
 * THE fix for "easy-then-impossible". Difficulty is a single scalar intensity
 * `I ∈ [0,1]` that moves *within* the current level's phase bounds. The level
 * decides *what* she types; `I` tunes *how much pressure* to her measured
 * ability. Metrics in → intensity + derived params out.
 *
 * Design decisions (locked):
 *  1. An ESCAPE is a strong, immediate ease-off — beyond the normal drift it
 *     applies ESCAPE_PENALTY at once, so a run of escapes visibly drops I. A
 *     downward lurch on failure is deliberate (a beginner must never hit a wall).
 *  2. Retry after game-over resumes at REDUCED intensity (RETRY_FACTOR), never
 *     the intensity that just killed her — see storage + createPlay.
 *  3. Cold-start is conservative (COLD_START_INTENSITY) and settled I is
 *     persisted ONLY within a phase, so a hard new content band never inherits
 *     a high I from an easy one.
 *  4. The drift updates off a ROLLING WINDOW (N=8), never raw per-tile margin,
 *     so intensity glides rather than lurching. margin + accuracy are the
 *     control inputs; WPM is a readout only, never a driver.
 */
import type { PhaseBounds } from '../data/levels';
import { MAX_CONCURRENT_TILES } from '../data/levels';

/** Rolling window size for the control signal (§5.1). */
export const METRICS_WINDOW = 8;

/** Near-zero starting intensity for a freshly-entered phase (§decision 3 +
 *  age lever (b), §6): a 5-year-old's very first tiles must be as gentle as the
 *  band allows; the adaptive climb then ramps a capable kid quickly. */
export const COLD_START_INTENSITY = 0.1;

/** Retry-after-death multiplier on the settled intensity (§decision 2). */
export const RETRY_FACTOR = 0.7;

/** Extra immediate drop applied on an escape, on top of the drift (§decision 1). */
export const ESCAPE_PENALTY = 0.15;

/** Rolling metrics that DRIVE the controller (wpm carried only as a readout). */
export interface RollingMetrics {
  wpm: number; // readout only — never used in the update rule (§decision 4)
  accuracy: number; // correct keystrokes / total keystrokes
  margin: number; // avg spare screen-height fraction when tiles resolve (1=top, 0=bottom)
}

/** Per-tile resolution event the session feeds the controller. */
export interface TileResolution {
  outcome: 'cleared' | 'escaped';
  /** Spare fraction of screen height when the tile resolved (0 for an escape). */
  margin: number;
  /** Current rolling accuracy 0..1. */
  accuracy: number;
  /** Current WPM (readout only). */
  wpm: number;
}

/** Parameters derived from intensity by lerping within phase bounds (§5.1). */
export interface DerivedParams {
  fallSpeed: number; // px/sec
  spawnInterval: number; // sec
  maxConcurrent: number; // hard-capped at MAX_CONCURRENT_TILES
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

/**
 * The pure §5.1 update rule: nudge intensity from rolling metrics with
 * hysteresis. Bias is asymmetric ON PURPOSE — we ease off (−0.10) faster than
 * we ramp up (+0.06 / +0.01) so a struggling beginner is never walled. Only
 * margin + accuracy are consulted; WPM is ignored here (readout only).
 */
export function nextIntensity(current: number, metrics: RollingMetrics): number {
  let next = current;
  if (metrics.margin > 0.55 && metrics.accuracy > 0.9) {
    next += 0.06; // comfortable → nudge up
  } else if (metrics.margin < 0.2 || metrics.accuracy < 0.75) {
    next -= 0.1; // struggling → ease off, faster than we climb
  } else {
    next += 0.01; // gentle drift up
  }
  return clamp(next, 0, 1);
}

/**
 * Derive concrete play parameters for an intensity within a phase's bounds.
 * Directions per §5.1: fallSpeed rises with I; spawnInterval SHRINKS with I
 * (lerp Max→Min); maxConcurrent rises, rounded, then hard-capped at 5.
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
 * `params` from one of these every tick and never hold speed constants. Also
 * exposes the current `intensity` so it can be persisted per phase.
 */
export interface DifficultySource {
  readonly params: DerivedParams;
  readonly intensity: number;
  /** Called after each tile resolves so adaptive sources can retune. */
  onTileResolved(res: TileResolution): void;
}

/** Static source (kept for tests/fallback): fixed params, no adaptation. */
export function createStaticDifficulty(phase: PhaseBounds, intensity = 0.5): DifficultySource {
  const fixed = clamp(intensity, 0, 1);
  return {
    get params() {
      return deriveParams(fixed, phase);
    },
    get intensity() {
      return fixed;
    },
    onTileResolved() {
      /* static: no adaptation */
    },
  };
}

/**
 * Adaptive source — the real controller. Maintains rolling windows of margin +
 * accuracy, drifts intensity smoothly on every resolution, and slams it down on
 * an escape. `params` is a getter so it always reflects the live intensity.
 */
export function createAdaptiveDifficulty(phase: PhaseBounds, initialIntensity: number): DifficultySource {
  let intensity = clamp(initialIntensity, 0, 1);
  const marginWindow: number[] = [];
  const accuracyWindow: number[] = [];
  let lastWpm = 0;

  const pushCapped = (window: number[], value: number): void => {
    window.push(value);
    if (window.length > METRICS_WINDOW) window.shift();
  };

  return {
    get params() {
      return deriveParams(intensity, phase);
    },
    get intensity() {
      return intensity;
    },
    onTileResolved(res: TileResolution) {
      // Feed the rolling windows so the drift responds to a smoothed signal,
      // not a single noisy tile (§decision 4).
      pushCapped(marginWindow, res.margin);
      pushCapped(accuracyWindow, res.accuracy);
      lastWpm = res.wpm; // readout only

      const rolling: RollingMetrics = {
        wpm: lastWpm,
        accuracy: average(accuracyWindow),
        margin: average(marginWindow),
      };

      // Smooth drift from the rolling window …
      intensity = nextIntensity(intensity, rolling);

      // … then, on an escape, a strong immediate ease-off on top (§decision 1).
      if (res.outcome === 'escaped') {
        intensity = clamp(intensity - ESCAPE_PENALTY, 0, 1);
      }
    },
  };
}
