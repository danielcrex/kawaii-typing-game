/**
 * Game loop (PROJECT.md §4 engine/loop.ts).
 *
 * Fixed-timestep update + variable render, driven by requestAnimationFrame.
 *
 * Why fixed-timestep: simulation (falling, spawning) must be deterministic and
 * frame-rate independent, so a 144Hz laptop and a 60Hz one play identically.
 * We accumulate real elapsed time and consume it in fixed STEP slices; whatever
 * time is left over becomes `alpha`, the interpolation factor the renderer uses
 * to draw tiles smoothly between two simulation states.
 *
 * The loop itself is dumb on purpose — the authoritative game-over guard lives
 * in the session's update (step 4): once the session is 'over', its update
 * skips all spawn/fall integration, so nothing moves or spawns afterward (§5.3).
 */
export interface LoopCallbacks {
  /** Fixed-timestep simulation tick. `dt` is always STEP seconds. */
  update(dt: number): void;
  /** Variable render. `alpha` ∈ [0,1) interpolates between sim states. */
  render(alpha: number): void;
}

export interface LoopHandle {
  /** Stop the loop and cancel the pending frame (call on scene teardown). */
  stop(): void;
}

/** Fixed simulation step: 60 ticks/sec. */
const STEP = 1 / 60;
/** Clamp huge gaps (tab was backgrounded) to avoid a spiral of death. */
const MAX_FRAME = 0.25;

/** Start the fixed-timestep loop. Returns a handle to stop it. */
export function startLoop(callbacks: LoopCallbacks): LoopHandle {
  let last = performance.now() / 1000;
  let accumulator = 0;
  let rafId = 0;
  let running = true;

  const frame = (): void => {
    if (!running) return;

    const now = performance.now() / 1000;
    const elapsed = Math.min(now - last, MAX_FRAME);
    last = now;
    accumulator += elapsed;

    // Consume accumulated time in fixed slices — deterministic simulation.
    while (accumulator >= STEP) {
      callbacks.update(STEP);
      accumulator -= STEP;
    }

    // Leftover time as an interpolation factor for smooth rendering.
    callbacks.render(accumulator / STEP);

    rafId = requestAnimationFrame(frame);
  };

  rafId = requestAnimationFrame(frame);

  return {
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
    },
  };
}
