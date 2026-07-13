/**
 * Key router (PROJECT.md §4 input/keyRouter.ts, §5.2).
 *
 * Captures keydown, decides whether it's a *game keystroke* (a typeable
 * character) or something to ignore/suppress, and forwards game keystrokes to
 * the matcher. There is no submit key anymore — Space and punctuation are
 * ordinary typeable characters (phase F phrases, level 4 punctuation).
 *
 * Rules baked in here:
 *  - Tab: preventDefault so it can't steal focus; NOT a game key.
 *  - Space: preventDefault so it can't scroll; IS a game key (' ').
 *  - Ctrl/Cmd/Alt combos: never game input (they're shortcuts) — ignored.
 *  - Shift is allowed: Shift+letter yields a capital in `event.key`, which is
 *    real typing (case-sensitive matching = Shift practice, §5.4).
 *  - Modifiers alone, arrows, F-keys, Enter, Backspace, Escape, etc.: ignored,
 *    and crucially NOT counted as errors (they never reach the matcher).
 *  - Backspace is a deliberate no-op (§5.2): the cursor only advances on
 *    correct keys, so there's nothing to erase.
 */

/** What a raw key event means to the game. */
export interface KeyIntent {
  /** The typeable character to feed the matcher, or null to ignore. */
  char: string | null;
  /** Whether the router should call preventDefault on the event. */
  preventDefault: boolean;
}

/** Classify a keydown event. Pure — no side effects, easy to unit test. */
export function normalizeKey(event: KeyboardEvent): KeyIntent {
  // Shortcut combos (Ctrl/Cmd/Alt) are never typing. Shift is NOT excluded —
  // it's how capitals are produced.
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return { char: null, preventDefault: false };
  }

  const key = event.key;

  // Tab would move focus out of the game — swallow it, but it's not a game key.
  if (key === 'Tab') return { char: null, preventDefault: true };

  // Space is typeable (phrases) but would scroll the page — swallow the scroll.
  if (key === ' ' || key === 'Spacebar') return { char: ' ', preventDefault: true };

  // Any remaining single-character key is real typing: letters (case preserved),
  // digits, punctuation. Multi-char names (Shift, ArrowLeft, F5, Enter,
  // Backspace, Dead, …) are ignored and never counted.
  if (key.length === 1) return { char: key, preventDefault: false };

  return { char: null, preventDefault: false };
}

/**
 * Attach a global keydown listener that routes game keystrokes to `onChar`.
 * Global (on window) so play doesn't depend on a focused element. Returns a
 * detach function for scene teardown.
 */
export function attachKeyRouter(onChar: (char: string) => void): () => void {
  const handler = (event: KeyboardEvent): void => {
    const intent = normalizeKey(event);
    if (intent.preventDefault) event.preventDefault();
    if (intent.char !== null) onChar(intent.char);
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}
