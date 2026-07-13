/**
 * Tile spawner (PROJECT.md §4 engine/spawner.ts).
 *
 * Schedules new tiles on an interval. The interval and the concurrent cap are
 * NOT constants here — they are passed in every tick from the single difficulty
 * source (§5.1), so step 5 can retune the game with zero changes to this file.
 *
 * The spawner only decides *when* it is time to spawn; the session decides
 * *what* to spawn and never spawns once the level is over (§5.3).
 */
import { MAX_CONCURRENT_TILES } from '../data/levels';

export class Spawner {
  /** Seconds accumulated toward the next spawn. */
  private accumulator = 0;

  /**
   * Advance the spawn timer by `dt` and report whether a tile should spawn now.
   *
   * @param dt            fixed timestep seconds
   * @param interval      current seconds-between-spawns (from DifficultySource)
   * @param liveCount     tiles currently on screen
   * @param maxConcurrent current concurrent cap (from DifficultySource)
   *
   * Behavior:
   *  - Below the interval: keep waiting.
   *  - At/over the interval but at the cap: hold the timer at the threshold so a
   *    tile spawns the instant a slot frees (no burst, no starvation).
   *  - At/over the interval with room: spawn, and subtract exactly one interval
   *    (so we don't machine-gun several tiles to "catch up").
   *
   * The cap is defensively re-clamped to MAX_CONCURRENT_TILES — the absolute
   * ceiling of 5 can never be exceeded regardless of what params flow in (§6.1).
   */
  shouldSpawn(dt: number, interval: number, liveCount: number, maxConcurrent: number): boolean {
    const cap = Math.min(maxConcurrent, MAX_CONCURRENT_TILES);
    this.accumulator += dt;

    if (this.accumulator < interval) return false;

    if (liveCount >= cap) {
      // Hold ready but don't overflow, so we spawn as soon as a slot frees.
      this.accumulator = interval;
      return false;
    }

    this.accumulator -= interval;
    return true;
  }

  /** Reset the timer (e.g. on level start). */
  reset(): void {
    this.accumulator = 0;
  }
}
