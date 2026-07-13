/**
 * AUTO-TARGET + PER-LETTER MATCHER (PROJECT.md §5.2) — pure, no DOM.
 *
 * No submit key. She just types. This module owns the mental model:
 *  - Auto-target: with no active tile, the first keystroke picks the on-screen
 *    tile whose word starts with that char; nearest-to-bottom wins ties (most
 *    urgent first). Once active, keys apply to that tile until it clears or a
 *    wrong key is pressed.
 *  - Per-letter progress: each correct next char advances a cursor; the matched
 *    prefix renders filled (liquid-in-glass, §7.3).
 *  - Forgiving errors: a wrong key never fails a tile and never costs a heart —
 *    it ticks "nope", records an error for accuracy only, and leaves the cursor.
 *
 * SCAFFOLD STATE: public shape only. Resolution logic lands in §12 step 3,
 * fully commented, driving the DOM tiles + live fill.
 */

/** Minimal view of a tile the matcher reasons about (kept DOM-free). */
export interface MatchTarget {
  /** Stable id used to correlate with the rendered DOM tile. */
  id: number;
  /** The word/letter to type. */
  word: string;
  /** How many characters are already matched (cursor position). */
  cursor: number;
  /** Vertical position 0=top … 1=bottom; used for nearest-to-bottom tie-break. */
  progressDown: number;
}

/** Outcome of feeding a single keystroke to the matcher. */
export interface KeyResult {
  kind: 'ignored' | 'target-acquired' | 'advance' | 'wrong' | 'clear';
  /** The tile this keystroke acted on, if any. */
  targetId: number | null;
}

/**
 * Feed one normalized character to the matcher over the current tiles.
 * TODO(§12.3): implement auto-target selection, cursor advance, forgiving
 * wrong-key handling, and clear-on-last-char.
 */
export function feedKey(_char: string, _tiles: readonly MatchTarget[], activeId: number | null): KeyResult {
  return { kind: 'ignored', targetId: activeId };
}
