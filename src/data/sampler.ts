/**
 * Word sampler (PROJECT.md §6.3) — pure, RNG-injectable, no DOM.
 *
 * Fixes the old game's repetition: draws from the level's key-gated pool
 * WITHOUT repeating an item until a recent buffer clears (or the whole pool
 * cycles, whichever is smaller), and WEIGHTS the draw toward items that
 * reinforce the keys newly introduced at this level. On consolidation levels
 * (no new keys) it weights toward longer words instead, to push fluency.
 *
 * It also composes the level's content:
 *  - pure single-key/short drills on the first drill levels (no full words yet);
 *  - words once ≥3 keys + a vowel are unlocked;
 *  - phrases (space bar) once unlocked (L10+);
 *  - punctuated items once their punctuation unlocks (L21+);
 *  - a sprinkle of leading-capital words once Shift unlocks (L17+).
 */
import {
  newKeysAt,
  lettersUnlockedThrough,
  capitalsUnlocked,
} from './curriculum';
import { wordsForLevel, phrasesForLevel, punctItemsForLevel } from './words';

/** Weight multiplier for an item that reinforces a newly-introduced key. */
const REINFORCE_WEIGHT = 2.5;
/** Weight multiplier for a long word on a consolidation level (fluency push). */
const FLUENCY_WEIGHT = 1.6;
/** Word length at/above which a consolidation-level word counts as "long". */
const LONG_WORD_LEN = 6;
/** Relative weights for the non-word content types (words are the baseline 1.0). */
const PHRASE_WEIGHT = 0.8;
const PUNCT_WEIGHT = 0.7;
/** Chance a plain word is shown leading-capitalized once Shift is unlocked. */
const CAPITAL_RATE = 0.35;

/** A ready-to-draw sampler for one level. */
export interface WordSampler {
  /** Next tile string (never repeats within the recent buffer). */
  next(): string;
  /** Number of distinct candidates for this level (for tests / diagnostics). */
  readonly poolSize: number;
}

interface Candidate {
  text: string;
  weight: number;
}

/**
 * Build the level's weighted candidate list. Returns single-letter drills when
 * no full word is yet typeable (the earliest home-row levels), so a level is
 * never empty and early drill stays gentle.
 */
function buildCandidates(level: number): Candidate[] {
  const words = wordsForLevel(level);
  const phrases = phrasesForLevel(level);
  const puncts = punctItemsForLevel(level);

  // Letters newly taught at this level → what we bias toward.
  const newLetters = new Set(newKeysAt(level).filter((k) => k.length === 1 && k >= 'a' && k <= 'z'));
  const reinforcesNewKey = (s: string): boolean =>
    newLetters.size > 0 && [...s].some((ch) => newLetters.has(ch));

  // Drill fallback: no full words yet (L1–2) → drill the unlocked letters,
  // weighting the just-introduced keys so the new letters get the most reps.
  if (words.length === 0 && phrases.length === 0 && puncts.length === 0) {
    return [...lettersUnlockedThrough(level)].map((ch) => ({
      text: ch,
      weight: newLetters.has(ch) ? REINFORCE_WEIGHT : 1,
    }));
  }

  const out: Candidate[] = [];

  for (const w of words) {
    let weight = 1;
    if (reinforcesNewKey(w)) {
      weight *= REINFORCE_WEIGHT; // reinforce this level's new keys
    } else if (newLetters.size === 0 && w.length >= LONG_WORD_LEN) {
      weight *= FLUENCY_WEIGHT; // consolidation level → favor longer words
    }
    out.push({ text: w, weight });
  }
  for (const p of phrases) {
    out.push({ text: p, weight: reinforcesNewKey(p) ? PHRASE_WEIGHT * REINFORCE_WEIGHT : PHRASE_WEIGHT });
  }
  for (const item of puncts) {
    out.push({ text: item, weight: PUNCT_WEIGHT });
  }
  return out;
}

/**
 * Create a sampler for `level`. `rng` is injectable so tests are deterministic;
 * `capitalize` mirrors curriculum gating but is overridable for tests.
 */
export function createWordSampler(level: number, rng: () => number = Math.random): WordSampler {
  const candidates = buildCandidates(level);
  const pool = candidates.length;

  // Non-repeat window. On big pools it's a generous 64-item window for variety.
  // On TINY drill pools it must stay well under pool-1, or forced full rotation
  // would cancel the new-key weighting (every item becomes equally likely). At
  // ~half the pool there are always ≥2 eligible candidates for the weighting to
  // express itself.
  const recentSize = pool <= 6 ? Math.max(1, Math.floor(pool / 2)) : Math.min(pool - 1, 64);
  const recent: string[] = [];
  const inRecent = new Set<string>();
  const allowCapitals = capitalsUnlocked(level);

  /** Weighted pick over the candidates not currently in the recent buffer. */
  const pickWeighted = (): Candidate => {
    const first = candidates[0]!; // pool ≥ 1 is guaranteed by the drill fallback
    let total = 0;
    for (const c of candidates) if (!inRecent.has(c.text)) total += c.weight;
    // Degenerate guard (shouldn't happen: recentSize ≤ pool-1 keeps ≥1 eligible).
    if (total <= 0) return candidates[Math.floor(rng() * pool)] ?? first;

    let r = rng() * total;
    for (const c of candidates) {
      if (inRecent.has(c.text)) continue;
      r -= c.weight;
      if (r <= 0) return c;
    }
    // Floating-point fallthrough → last eligible.
    for (let i = candidates.length - 1; i >= 0; i--) {
      const c = candidates[i];
      if (c && !inRecent.has(c.text)) return c;
    }
    return first;
  };

  return {
    poolSize: pool,
    next(): string {
      const chosen = pickWeighted();
      // Slide the recent buffer so `chosen` won't recur until it clears.
      recent.push(chosen.text);
      inRecent.add(chosen.text);
      while (recent.length > recentSize) {
        const evicted = recent.shift()!;
        inRecent.delete(evicted);
      }

      // Leading-capital Shift practice on plain words (never on phrases/punct).
      let text = chosen.text;
      const isPlainWord = !text.includes(' ') && /^[a-z]+$/.test(text);
      if (allowCapitals && isPlainWord && rng() < CAPITAL_RATE) {
        text = text.charAt(0).toUpperCase() + text.slice(1);
      }
      return text;
    },
  };
}
