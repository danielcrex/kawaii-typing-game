/**
 * Key → finger map + home-row layout (PROJECT.md §5.4).
 *
 * The standard 8-finger + thumb touch-typing scheme, used by the keyboard guide
 * to color keys, glow the next key in its finger's color, and label which finger
 * to use. Home-row keys (A S D F J K L ;) carry the usual bump indicator.
 *
 * SCAFFOLD STATE: authored in §12 step 6.
 */
export type Finger =
  | 'l-pinky' | 'l-ring' | 'l-middle' | 'l-index'
  | 'r-index' | 'r-middle' | 'r-ring' | 'r-pinky'
  | 'thumb';

/** Maps a lowercase key to the finger that should press it. */
export const FINGER_OF: Readonly<Record<string, Finger>> = {};
