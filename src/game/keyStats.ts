/**
 * Per-key mastery for the keyboard guide's auto-fade (PROJECT.md §5.4) — pure.
 *
 * The guide fades a key's cue as she internalises it, using PER-KEY ACCURACY
 * ONLY. Reaction-time is deliberately excluded: a child who LOOKS AT HER HANDS
 * types fast AND accurately, so speed reads the look-down habit as mastery and
 * would fade the guide exactly when she is most dependent on looking down — it
 * rewards the very habit the guide exists to kill. Accuracy alone can't be gamed
 * that way. Do not re-introduce a speed term here.
 *
 * Mastery is 0 until MIN_ATTEMPTS samples exist (a key you've barely tried is
 * never "mastered"), then the correct-fraction over a recent window per key.
 */

/** Samples per key before mastery is considered meaningful. */
export const MIN_ATTEMPTS = 4;
/** Rolling window of recent attempts per key (older ones drop off). */
export const KEY_WINDOW = 12;

export interface KeyStats {
  /** Record one attempt on `expected` (the key she SHOULD have pressed). */
  record(expected: string, correct: boolean): void;
  /** Per-key mastery 0..1 (0 until MIN_ATTEMPTS). */
  mastery(key: string): number;
  reset(): void;
}

export function createKeyStats(): KeyStats {
  // Per key: a small ring of recent booleans (true = correct).
  const recent = new Map<string, boolean[]>();

  const keyOf = (k: string): string => k.toLowerCase();

  return {
    record(expected, correct) {
      const k = keyOf(expected);
      const buf = recent.get(k) ?? [];
      buf.push(correct);
      if (buf.length > KEY_WINDOW) buf.shift();
      recent.set(k, buf);
    },
    mastery(key) {
      const buf = recent.get(keyOf(key));
      if (!buf || buf.length < MIN_ATTEMPTS) return 0;
      let hit = 0;
      for (const ok of buf) if (ok) hit++;
      return hit / buf.length;
    },
    reset() {
      recent.clear();
    },
  };
}
