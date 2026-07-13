/**
 * Per-phase word pools (PROJECT.md §6.3).
 *
 * Curated, age-appropriate (10yo), common, positive words matched to each
 * phase's letter-length band. Phase A keys letters to the level's row focus.
 * E/F add leading-capital words (teaches Shift) and short wholesome phrases
 * ("good job", "well done"). No profanity; no scary/violent words even for
 * Monster/Dragon/Dinosaur — theme by mascot, not menace. ~40–60 words/phase.
 *
 * SCAFFOLD STATE: pools are authored in §12 step 8.
 */
import type { PhaseId } from './levels';

export const WORD_POOLS: Record<PhaseId, readonly string[]> = {
  A: [],
  B: [],
  C: [],
  D: [],
  E: [],
  F: [],
};
