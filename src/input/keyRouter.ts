/**
 * Key router (PROJECT.md §4 input/keyRouter.ts).
 *
 * Captures keydown, normalizes to a single printable character (or a control
 * intent), and forwards to the matcher. Backspace is a no-op by design (§5.2) —
 * there's nothing to submit; the cursor only advances on correct keys.
 *
 * SCAFFOLD STATE: stub — implemented in §12 step 3.
 */
export interface NormalizedKey {
  /** The printable character, or null for ignored/control keys. */
  char: string | null;
}

/** Normalize a KeyboardEvent to a single character intent.
 *  TODO(§12.3): filter modifiers, map Shift+letter → capital, ignore the rest. */
export function normalizeKey(_event: KeyboardEvent): NormalizedKey {
  return { char: null };
}
