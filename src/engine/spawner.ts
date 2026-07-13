/**
 * Tile spawner (PROJECT.md §4 engine/spawner.ts).
 *
 * Schedules new tiles on an interval driven by the adaptive intensity, honoring
 * the concurrent cap. Never spawns once the session is 'over' (§5.3).
 *
 * SCAFFOLD STATE: stub — implemented in §12 step 2 (static), retuned in step 5.
 */
export interface SpawnDecision {
  /** Whether a tile should spawn this tick. */
  spawn: boolean;
}

/** Decide whether to spawn given elapsed time and current constraints.
 *  TODO(§12.2): interval accumulator + concurrent-cap check. */
export function shouldSpawn(_elapsed: number, _interval: number, _liveCount: number, _maxConcurrent: number): SpawnDecision {
  return { spawn: false };
}
