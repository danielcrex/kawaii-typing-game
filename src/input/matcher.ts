/**
 * AUTO-TARGET + PER-LETTER MATCHER (PROJECT.md §5.2) — pure, no DOM.
 *
 * No submit key. She just types. This module owns the typing mental model and
 * nothing else (the session applies the visible effects):
 *
 *  - Auto-target: with no tile locked, a keystroke selects the tile whose word
 *    starts with that character. Ties (multiple tiles start with it) resolve to
 *    the one NEAREST THE BOTTOM — the most urgent — via `progressDown`.
 *  - Lock: once a tile is locked, every keystroke applies to THAT tile until it
 *    clears or escapes. A wrong key is forgiving — it's ignored, costs no heart,
 *    fails nothing, and DOES NOT release the lock or re-target another tile.
 *  - Per-letter: each correct next character advances the cursor; the session
 *    fills the matched prefix (liquid-in-glass). Last correct char ⇒ clear.
 *  - Single-letter tiles (phase A): one correct keystroke locks-and-clears.
 *  - Case-sensitive: 'A' ≠ 'a' (capitals teach Shift, §5.4).
 *
 * The only state the matcher holds is the locked tile id — deterministic and
 * unit-testable in isolation.
 */

/** A DOM-free view of a tile the matcher reasons about. */
export interface MatchTarget {
  /** Stable id, correlates with the session's tile + its DOM view. */
  id: number;
  /** The word/letter to type (matched case-sensitively). */
  word: string;
  /** Characters already matched (0..word.length). */
  cursor: number;
  /** Vertical progress 0=top … 1=bottom, for nearest-to-bottom tie-breaking. */
  progressDown: number;
}

/** What a single keystroke did. */
export type MatchKind =
  | 'acquired' // locked a new tile and matched its first char
  | 'advance' // advanced the locked tile by one correct char
  | 'clear' // matched the final char — the tile should clear
  | 'wrong' // locked tile, wrong char — forgiving, lock retained
  | 'no-match'; // no lock and no tile starts with this char

export interface MatchOutcome {
  kind: MatchKind;
  /** The tile acted on (null only for 'no-match'). */
  targetId: number | null;
  /** The tile's resulting cursor after this keystroke. */
  cursor: number;
  /** True when the keystroke was a correct game keystroke (for accuracy). */
  correct: boolean;
}

export class Matcher {
  /** The locked tile, or null when awaiting auto-target. */
  private activeId: number | null = null;

  /** The currently locked tile id (for the keyboard guide / debugging). */
  get lockedId(): number | null {
    return this.activeId;
  }

  /** Clear all state (level start). */
  reset(): void {
    this.activeId = null;
  }

  /** Release the lock if `id` was the active tile (call when a tile leaves play). */
  release(id: number): void {
    if (this.activeId === id) this.activeId = null;
  }

  /**
   * Feed one typeable character over the current live tiles.
   * `tiles` must exclude tiles that are animating out.
   */
  feed(char: string, tiles: readonly MatchTarget[]): MatchOutcome {
    const locked = this.activeId === null ? undefined : tiles.find((t) => t.id === this.activeId);

    // --- Locked path: keystrokes belong to the locked tile only. ---
    if (locked) {
      const expected = locked.word[locked.cursor];
      if (char === expected) {
        const cursor = locked.cursor + 1;
        if (cursor >= locked.word.length) {
          // Final char — clear and release the lock.
          this.activeId = null;
          return { kind: 'clear', targetId: locked.id, cursor, correct: true };
        }
        return { kind: 'advance', targetId: locked.id, cursor, correct: true };
      }
      // Wrong key: forgiving. Lock is RETAINED; never re-target mid-word.
      return { kind: 'wrong', targetId: locked.id, cursor: locked.cursor, correct: false };
    }

    // --- Auto-target path: no lock yet; find a tile starting with `char`. ---
    const candidate = pickTarget(char, tiles);
    if (!candidate) {
      // Nothing starts with this char — a genuine mis-keystroke (counts against
      // accuracy) but harmless: no heart, no lock.
      return { kind: 'no-match', targetId: null, cursor: 0, correct: false };
    }

    const cursor = candidate.cursor + 1;
    if (cursor >= candidate.word.length) {
      // Single-letter tile: lock-and-clear in one keystroke.
      this.activeId = null;
      return { kind: 'clear', targetId: candidate.id, cursor, correct: true };
    }
    this.activeId = candidate.id;
    return { kind: 'acquired', targetId: candidate.id, cursor, correct: true };
  }
}

/**
 * Choose the auto-target: among tiles whose next expected char equals `char`,
 * pick the one nearest the bottom (highest progressDown) — most urgent first.
 */
function pickTarget(char: string, tiles: readonly MatchTarget[]): MatchTarget | undefined {
  let best: MatchTarget | undefined;
  for (const tile of tiles) {
    if (tile.word[tile.cursor] !== char) continue;
    if (!best || tile.progressDown > best.progressDown) best = tile;
  }
  return best;
}
