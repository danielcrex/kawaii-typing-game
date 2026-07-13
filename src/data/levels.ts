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
  A: { id: 'A', speedMin: 40, speedMax: 90, spawnMin: 1.6, spawnMax: 2.6, concMin: 1, concMax: 2, content: 'single letters' },
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

/** The 24 levels, grouped into phases of 4. `focus` mirrors §6.2. */
export const LEVELS: readonly LevelDef[] = [
  { level: 1, phase: 'A', focus: 'home row A S D F J K L ;' },
  { level: 2, phase: 'A', focus: 'top row Q W E R T Y' },
  { level: 3, phase: 'A', focus: 'bottom row + common' },
  { level: 4, phase: 'A', focus: 'all letters + punctuation' },
  { level: 5, phase: 'B', focus: 'common 3-letter' },
  { level: 6, phase: 'B', focus: '3-letter, home-row bias' },
  { level: 7, phase: 'B', focus: 'mixed 3-letter' },
  { level: 8, phase: 'B', focus: '3-letter + repeats' },
  { level: 9, phase: 'C', focus: '4-letter' },
  { level: 10, phase: 'C', focus: '4-letter common' },
  { level: 11, phase: 'C', focus: '4–5 letter' },
  { level: 12, phase: 'C', focus: '4–5 letter' },
  { level: 13, phase: 'D', focus: '5-letter' },
  { level: 14, phase: 'D', focus: '5-letter mixed' },
  { level: 15, phase: 'D', focus: '5–6 letter' },
  { level: 16, phase: 'D', focus: 'common 6-letter' },
  { level: 17, phase: 'E', focus: '6-letter + capitals' },
  { level: 18, phase: 'E', focus: '6–7 letter' },
  { level: 19, phase: 'E', focus: 'mixed + simple phrases' },
  { level: 20, phase: 'E', focus: '7–8 letter' },
  { level: 21, phase: 'F', focus: '7–9 letter' },
  { level: 22, phase: 'F', focus: '8+ letter' },
  { level: 23, phase: 'F', focus: '8–10 letter, themed' },
  { level: 24, phase: 'F', focus: 'mastery: long words + short sentences' },
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
