/**
 * Levels & phase bounds (PROJECT.md §6.1 / §6.2).
 *
 * The key fix for "easy-then-impossible": speed / spawn / concurrency are NOT
 * hard-coded per level. They are *phase bounds*, and the adaptive controller
 * (§5.1) lerps within them by the live intensity I∈[0,1]. Only *content* changes
 * per level, so difficulty is decoupled from progression.
 */

/** The six content phases. */
export type PhaseId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface PhaseBounds {
  id: PhaseId;
  /** Fall speed range in px/sec (lerp low→high as intensity rises). */
  speedMin: number;
  speedMax: number;
  /** Spawn interval in seconds. NOTE: higher intensity ⇒ SHORTER interval,
   *  so the controller lerps spawnMax→spawnMin (see §5.1). */
  spawnMin: number;
  spawnMax: number;
  /** Concurrent tiles on screen. Hard-capped at 5 everywhere (§6.1). */
  concMin: number;
  concMax: number;
  /** Human-readable description of the content band. */
  content: string;
}

/** Absolute ceiling on concurrent tiles — a beginner cannot track more (§6.1). */
export const MAX_CONCURRENT_TILES = 5;

/** Tiles to clear to win any level (§6.2). */
export const TILE_TARGET = 20;

export const PHASES: Record<PhaseId, PhaseBounds> = {
  // Phase A floor lowered (age lever (b), §6): a slower min fall + wider spawn
  // gap lets a 5-year-old beginner cope at low intensity, while the unchanged
  // max keeps a cruising 10-year-old genuinely challenged on the same level.
  A: { id: 'A', speedMin: 30, speedMax: 90, spawnMin: 1.6, spawnMax: 2.9, concMin: 1, concMax: 2, content: 'home-row keys (single-key drills → first words)' },
  B: { id: 'B', speedMin: 55, speedMax: 110, spawnMin: 1.7, spawnMax: 2.8, concMin: 2, concMax: 3, content: '3-letter words' },
  C: { id: 'C', speedMin: 65, speedMax: 125, spawnMin: 1.8, spawnMax: 2.9, concMin: 2, concMax: 3, content: '4–5 letter words' },
  D: { id: 'D', speedMin: 75, speedMax: 140, spawnMin: 1.9, spawnMax: 3.0, concMin: 3, concMax: 4, content: '5–6 letter words' },
  E: { id: 'E', speedMin: 85, speedMax: 155, spawnMin: 2.0, spawnMax: 3.2, concMin: 3, concMax: 4, content: '6–8 letter words (+ capitals)' },
  F: { id: 'F', speedMin: 95, speedMax: 170, spawnMin: 2.1, spawnMax: 3.4, concMin: 3, concMax: 5, content: '8+ letter words + short phrases' },
};

export interface LevelDef {
  level: number;
  phase: PhaseId;
  /** Per-level content focus (drives word-pool filtering, §6.3). */
  focus: string;
}

/**
 * The 24 levels, grouped into phases of 4. `focus` now describes the KEY
 * progression (data/curriculum.ts is the source of truth for the actual key
 * sets; these strings are just human labels for menus/intros). Phases remain
 * SPEED/SPAWN envelopes only — content is key-gated, not length-banded (§6).
 */
export const LEVELS: readonly LevelDef[] = [
  { level: 1, phase: 'A', focus: 'home row: f j' },
  { level: 2, phase: 'A', focus: 'home row: d k' },
  { level: 3, phase: 'A', focus: 'home row: s l a — first words' },
  { level: 4, phase: 'A', focus: 'home row: g h' },
  { level: 5, phase: 'B', focus: 'top row: e i (vowels)' },
  { level: 6, phase: 'B', focus: 'top row: r u' },
  { level: 7, phase: 'B', focus: 'top row: t y' },
  { level: 8, phase: 'B', focus: 'top row: w o' },
  { level: 9, phase: 'C', focus: 'top row: q p' },
  { level: 10, phase: 'C', focus: 'n m + space — phrases begin' },
  { level: 11, phase: 'C', focus: 'bottom row: c b' },
  { level: 12, phase: 'C', focus: 'bottom row: v' },
  { level: 13, phase: 'D', focus: 'bottom row: x z — all letters' },
  { level: 14, phase: 'D', focus: 'consolidate: longer words' },
  { level: 15, phase: 'D', focus: 'consolidate: longer words' },
  { level: 16, phase: 'D', focus: 'consolidate: common 6-letter' },
  { level: 17, phase: 'E', focus: 'capitals (Shift)' },
  { level: 18, phase: 'E', focus: 'capitals + longer words' },
  { level: 19, phase: 'E', focus: 'phrases + longer words' },
  { level: 20, phase: 'E', focus: 'consolidate: phrases + long words' },
  { level: 21, phase: 'F', focus: 'punctuation: . ,' },
  { level: 22, phase: 'F', focus: "punctuation: ' (contractions)" },
  { level: 23, phase: 'F', focus: 'punctuation: ! ?' },
  { level: 24, phase: 'F', focus: 'mastery: everything mixed' },
] as const;

/** Get a level definition by 1-based number. */
export function getLevel(level: number): LevelDef | undefined {
  return LEVELS[level - 1];
}

/** Get the phase bounds for a given level. */
export function getPhaseForLevel(level: number): PhaseBounds | undefined {
  const def = LEVELS[level - 1];
  return def ? PHASES[def.phase] : undefined;
}
