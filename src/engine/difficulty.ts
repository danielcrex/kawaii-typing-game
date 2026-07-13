/**
 * ADAPTIVE DIFFICULTY CONTROLLER (PROJECT.md §5.1) — pure, no DOM.
 *
 * This is THE fix for "easy-then-impossible". Difficulty is a single scalar
 * intensity `I ∈ [0,1]` that moves *within* the current level's phase bounds.
 * The level decides *what* she types; `I` tunes *how much pressure* to her
 * actual, measured ability. Metrics in → intensity + derived params out.
 *
 * SCAFFOLD STATE: public shape only. The update rule (hysteresis: ease off
 * faster than we ramp up) and the lerp of derived params land in §12 step 5,
 * fully commented, replacing the static difficulty used in step 2.
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

/**
 * Advance intensity given fresh metrics (called after each tile resolves).
 * TODO(§12.5): implement the hysteresis update rule and clamp to [0,1].
 */
export function nextIntensity(current: number, _metrics: RollingMetrics): number {
  return current;
}

/**
 * Derive concrete play parameters for an intensity within a phase's bounds.
 * TODO(§12.5): lerp speed/spawn/concurrency; note spawn lerps Max→Min and
 * maxConcurrent is rounded then capped at MAX_CONCURRENT_TILES.
 */
export function deriveParams(_intensity: number, phase: PhaseBounds): DerivedParams {
  return {
    fallSpeed: phase.speedMin,
    spawnInterval: phase.spawnMax,
    maxConcurrent: Math.min(phase.concMin, MAX_CONCURRENT_TILES),
  };
}
