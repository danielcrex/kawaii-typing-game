/**
 * CURRICULUM — the single key-progression source of truth (PROJECT.md §6).
 *
 * Touch typing is taught by KEY PROGRESSION, not word length. Every level
 * unlocks 1–3 new keys (or consolidates with none), and ALL content —
 * letters, words, phrases, capitals, punctuation — is drawn ONLY from keys
 * unlocked so far. This module owns that order and nothing else.
 *
 * ⚠️ SINGLE SOURCE OF TRUTH: the word sampler (data/sampler.ts) AND the future
 * on-screen keyboard guide (§5.4, step 6) both consume THIS module. The guide
 * must NOT hardcode its own key order — it reads `keysUnlockedThrough` /
 * `newKeysAt` here so "find the glowing key" always matches what's being taught.
 *
 * The spine (fixed order, home → top → bottom → Shift → punctuation):
 *   home:  f j · d k · s l · a · g h
 *   top:   e i · r u · t y · w o · q p
 *   bottom: n m · c b · v · x z
 *   then Shift (capitals), then basic punctuation.  Space enters with phrases.
 *
 * All 26 letters are unlocked by L13; L14–16 consolidate longer words, L17+
 * layer capitals, L19–20 more phrases, L21+ punctuation, L24 mastery. The
 * zero-new-key levels are deliberate fluency stages, not gaps.
 */

/** A trainable key: a lowercase letter, Space (' '), 'Shift', or a punctuation char. */
export type KeyToken = string;

/** First-run entry points on the ONE spine (age lever (a), §6). */
export const BEGINNER_ENTRY_LEVEL = 1;
/** "I know my letters" confident on-ramp: home row + e/i/r/u/t/y ("the/they/that"
 *  typeable) — real challenge without assuming top-row fluency (per approval). */
export const CONFIDENT_ENTRY_LEVEL = 7;

/** Short 2-word phrases (space-bar practice) begin here, then run to the end. */
export const PHRASES_FROM_LEVEL = 10;
/** Leading-capital words (Shift practice) begin here. */
export const CAPITALS_FROM_LEVEL = 17;

/** One level's key introduction. `introduces` is [] on consolidation levels. */
export interface LevelKeys {
  level: number;
  introduces: KeyToken[];
}

/**
 * THE ordered spine. Index 0 = level 1. Space (' ') is introduced with phrases
 * at L10 so the most-pressed key is trained across most of the curriculum, not
 * just the final quarter. 'Shift' at L17, punctuation from L21.
 */
export const KEY_INTRODUCTION: readonly LevelKeys[] = [
  { level: 1, introduces: ['f', 'j'] }, // pure single-key home-row drill
  { level: 2, introduces: ['d', 'k'] }, // pure single-key home-row drill
  { level: 3, introduces: ['s', 'l', 'a'] }, // first vowel → first real words
  { level: 4, introduces: ['g', 'h'] }, // full home row
  { level: 5, introduces: ['e', 'i'] }, // top-row vowels — the big unlock
  { level: 6, introduces: ['r', 'u'] },
  { level: 7, introduces: ['t', 'y'] }, // "the / they / that"
  { level: 8, introduces: ['w', 'o'] }, // "to / of / for / you"
  { level: 9, introduces: ['q', 'p'] }, // top row complete
  { level: 10, introduces: ['n', 'm', ' '] }, // "and / in / on" + SPACE → phrases begin
  { level: 11, introduces: ['c', 'b'] },
  { level: 12, introduces: ['v'] }, // "have / give / love"
  { level: 13, introduces: ['x', 'z'] }, // ALL 26 letters unlocked
  { level: 14, introduces: [] }, // consolidate: longer 5–6 letter words
  { level: 15, introduces: [] }, // consolidate
  { level: 16, introduces: [] }, // consolidate
  { level: 17, introduces: ['Shift'] }, // capitals begin
  { level: 18, introduces: [] }, // consolidate capitals + longer words
  { level: 19, introduces: [] }, // more / longer phrases
  { level: 20, introduces: [] }, // consolidate
  { level: 21, introduces: ['.', ','] }, // punctuation begins
  { level: 22, introduces: ["'"] }, // apostrophe → contractions ("don't")
  { level: 23, introduces: ['!', '?'] }, // exclamation / question
  { level: 24, introduces: [] }, // mastery: everything mixed
] as const;

/** A-Z? No — we teach lowercase letters; Shift layers capitals on top. */
const isLetter = (k: KeyToken): boolean => k.length === 1 && k >= 'a' && k <= 'z';
const isPunct = (k: KeyToken): boolean => k.length === 1 && !isLetter(k) && k !== ' ';

/** New key tokens introduced exactly AT `level` (drives sampler weighting + guide glow). */
export function newKeysAt(level: number): KeyToken[] {
  return KEY_INTRODUCTION[level - 1]?.introduces.slice() ?? [];
}

/** All key tokens unlocked through `level` inclusive — the keyboard guide's active set. */
export function keysUnlockedThrough(level: number): KeyToken[] {
  const out: KeyToken[] = [];
  for (let i = 0; i < level && i < KEY_INTRODUCTION.length; i++) {
    const entry = KEY_INTRODUCTION[i];
    if (entry) out.push(...entry.introduces);
  }
  return out;
}

/** The set of LOWERCASE LETTERS unlocked through `level` — the word gate. */
export function lettersUnlockedThrough(level: number): Set<string> {
  const set = new Set<string>();
  for (const k of keysUnlockedThrough(level)) if (isLetter(k)) set.add(k);
  return set;
}

/** Punctuation characters unlocked through `level` (for gating punctuated items). */
export function punctuationUnlockedThrough(level: number): Set<string> {
  const set = new Set<string>();
  for (const k of keysUnlockedThrough(level)) if (isPunct(k)) set.add(k);
  return set;
}

/** True once phrases (and the space bar) are in play. */
export function phrasesUnlocked(level: number): boolean {
  return level >= PHRASES_FROM_LEVEL;
}

/** True once capitals (Shift) are in play. */
export function capitalsUnlocked(level: number): boolean {
  return level >= CAPITALS_FROM_LEVEL;
}
