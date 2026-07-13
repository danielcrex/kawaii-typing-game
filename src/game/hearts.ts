/**
 * Hearts + regen + authoritative fail (PROJECT.md §5.3) — pure, no DOM.
 *
 * The rules, stated precisely so they can't drift:
 *  - Start each level with 3 hearts.
 *  - A tile reaching the bottom = ESCAPE → −1 heart AND regen progress resets.
 *  - Regen: clean play accrues a hidden regenProgress of +1 per cleared tile;
 *    every REGEN_TILES_PER_HEART clears grants +1 heart, capped at 3. A visible
 *    sliver previews the returning heart (regenFraction).
 *  - MIS-KEYSTROKES NEVER TOUCH HEARTS OR REGEN. There is deliberately no
 *    function here for a wrong key — the forgiving model means a mistype is
 *    invisible to this module (consistent with §5.2).
 *  - AUTHORITATIVE game-over: when hearts reach 0 the state goes terminal
 *    (`dead`). Regen can never revive from 0 — game-over ends the attempt.
 *
 * NOTE on two separate counters (do not conflate):
 *  - streak (game/scoring.ts): consecutive CLEARS, drives combo FX.
 *  - regenProgress (here): clears toward the next regenerated heart.
 * Both reset on an escape; NEITHER resets on a mistype. They are distinct.
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

/**
 * A tile was cleared during clean play — accrue regen. Grants a heart every
 * REGEN_TILES_PER_HEART clears, capped at MAX_HEARTS. No effect when already
 * full or dead (regen never revives from 0).
 */
export function accrueRegen(state: HeartsState): HeartsState {
  if (state.dead || state.hearts >= MAX_HEARTS) return state;
  const progress = state.regenProgress + 1;
  if (progress >= REGEN_TILES_PER_HEART) {
    return { hearts: state.hearts + 1, regenProgress: 0, dead: false };
  }
  return { ...state, regenProgress: progress };
}

/**
 * A tile escaped (reached the bottom): lose a heart AND reset regen progress.
 * Sets `dead` the instant hearts reach 0 — the session reads this in the SAME
 * tick to make game-over authoritative (§5.3).
 */
export function loseHeart(state: HeartsState): HeartsState {
  if (state.dead) return state;
  const hearts = Math.max(0, state.hearts - 1);
  return { hearts, regenProgress: 0, dead: hearts <= 0 };
}

/** Fraction (0..1) of the next heart currently regenerated, for the sliver UI. */
export function regenFraction(state: HeartsState): number {
  if (state.hearts >= MAX_HEARTS) return 0;
  return state.regenProgress / REGEN_TILES_PER_HEART;
}
