/**
 * Scoring, streaks, WPM & accuracy (PROJECT.md §4 game/scoring.ts, §5.1).
 *
 * WPM is standard: chars / 5 / minutes. Accuracy = correct / total keystrokes
 * (wrong keys count against accuracy but nothing else — §5.2). Streak drives
 * combo SFX/FX milestones (5/10/15…).
 *
 * SCAFFOLD STATE: shape only — implemented in §12 step 4.
 */
export interface ScoreState {
  score: number;
  streak: number;
  bestStreak: number;
  correctKeys: number;
  totalKeys: number;
}

/** Fresh scoring state at level start. */
export function initScore(): ScoreState {
  return { score: 0, streak: 0, bestStreak: 0, correctKeys: 0, totalKeys: 0 };
}

/** Accuracy as a 0..1 fraction (1 when no keys pressed yet). */
export function accuracyOf(s: ScoreState): number {
  return s.totalKeys === 0 ? 1 : s.correctKeys / s.totalKeys;
}
