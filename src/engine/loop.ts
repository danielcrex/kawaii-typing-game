/**
 * Game loop (PROJECT.md §4 engine/loop.ts).
 *
 * rAF-driven, fixed-timestep update + variable render. The loop is imperative
 * (why we skip a framework, §3). A hard guard lives here: when the session is
 * 'over', the loop skips spawn + fall integration entirely so nothing can move
 * or spawn after game-over (§5.3).
 *
 * SCAFFOLD STATE: stub — implemented in §12 step 2.
 */
export interface LoopCallbacks {
  /** Fixed-timestep simulation tick (seconds). */
  update(dt: number): void;
  /** Variable render, `alpha` = interpolation factor for smoothness. */
  render(alpha: number): void;
}

export interface LoopHandle {
  stop(): void;
}

/** Start the fixed-timestep loop. TODO(§12.2): implement accumulator loop. */
export function startLoop(_callbacks: LoopCallbacks): LoopHandle {
  return { stop() {} };
}
