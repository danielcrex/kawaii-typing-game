/**
 * Persistence (PROJECT.md §10).
 *
 * localStorage under a versioned key. Stores: unlocked levels, per-level best
 * (stars, accuracy, WPM), settled adaptive intensity per phase, cumulative
 * WPM/accuracy history ("you're improving"), audio prefs, keyboard-guide
 * toggle, reduced-motion override. Migrates/guards against malformed old data.
 *
 * SCAFFOLD STATE: key + shape only — implemented in §12 step 8.
 */
export const STORAGE_KEY = 'kawaii-typing-friends/v2';
