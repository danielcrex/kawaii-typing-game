/**
 * Hearts + authoritative fail (PROJECT.md §5.3).
 *
 * - Start each level with 3 hearts. A tile reaching the bottom = escape → −1.
 * - Regen: during clean play, a hidden regenProgress accrues (+1 per ~6 cleared
 *   tiles), capped at 3; a sliver previews the returning heart. Never exceeds 3.
 * - AUTHORITATIVE GAME-OVER (fixes the live bug): the moment hearts ≤ 0 the
 *   session state becomes 'over' in the SAME tick; the loop then skips all
 *   spawn/fall updates so nothing spawns or moves afterward. Regen cannot revive
 *   from 0 — game-over is terminal for that attempt.
 *
 * SCAFFOLD STATE: constants + shape only. Logic + the un-bypassable transition
 * land in §12 step 4, where the fail condition is verified explicitly.
 */
export const MAX_HEARTS = 3;
export const REGEN_TILES_PER_HEART = 6;

export interface HeartsState {
  hearts: number;
  /** Hidden progress toward the next regenerated heart (0..REGEN_TILES_PER_HEART). */
  regenProgress: number;
  /** True once hearts hit 0 — terminal, un-revivable for this attempt. */
  dead: boolean;
}

/** Fresh hearts state at level start. */
export function initHearts(): HeartsState {
  return { hearts: MAX_HEARTS, regenProgress: 0, dead: false };
}
