/**
 * Level orchestration (PROJECT.md §4 game/session.ts).
 *
 * Owns a single level attempt: start, tile lifecycle, and win/lose. Holds the
 * authoritative `state` the loop guards on. Win = clear TILE_TARGET tiles;
 * lose = hearts reach 0 (state → 'over', §5.3).
 *
 * SCAFFOLD STATE: state type only — implemented in §12 steps 2–5.
 */
export type SessionState = 'intro' | 'playing' | 'won' | 'over';
