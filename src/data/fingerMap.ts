/**
 * Key → finger map + finger presentation (PROJECT.md §5.4).
 *
 * The standard 8-finger + thumb touch-typing scheme. This is the SINGLE
 * finger-mapping source of truth: the confident on-ramp's home-row warm-up
 * (ui/screens/warmup.ts) consumes it now, and the step-6 keyboard guide will
 * consume the SAME map (finger of a key, its label, its colour) — computed once,
 * never duplicated. Pairs with data/curriculum.ts (which owns key ORDER); this
 * owns key → finger.
 */
export type Finger =
  | 'l-pinky' | 'l-ring' | 'l-middle' | 'l-index'
  | 'r-index' | 'r-middle' | 'r-ring' | 'r-pinky'
  | 'thumb';

/** Maps a lowercase key (and space) to the finger that should press it. */
export const FINGER_OF: Readonly<Record<string, Finger>> = {
  // left hand
  q: 'l-pinky', a: 'l-pinky', z: 'l-pinky',
  w: 'l-ring', s: 'l-ring', x: 'l-ring',
  e: 'l-middle', d: 'l-middle', c: 'l-middle',
  r: 'l-index', f: 'l-index', v: 'l-index', t: 'l-index', g: 'l-index', b: 'l-index',
  // right hand
  y: 'r-index', h: 'r-index', n: 'r-index', u: 'r-index', j: 'r-index', m: 'r-index',
  i: 'r-middle', k: 'r-middle',
  o: 'r-ring', l: 'r-ring',
  p: 'r-pinky',
  // thumbs
  ' ': 'thumb',
};

/** Human-readable finger name for the on-screen "which finger" cue. */
export const FINGER_LABEL: Readonly<Record<Finger, string>> = {
  'l-pinky': 'left pinky',
  'l-ring': 'left ring',
  'l-middle': 'left middle',
  'l-index': 'left index',
  'r-index': 'right index',
  'r-middle': 'right middle',
  'r-ring': 'right ring',
  'r-pinky': 'right pinky',
  thumb: 'thumb',
};

/**
 * Per-finger colour (the finger's identity colour used to glow the next key and
 * tint the finger cue). Soft, distinct hues that read on the light dusk bg; the
 * two index fingers sit near the jewel accents so the busiest fingers pop. The
 * step-6 guide may refine these, but they live HERE so both features share one
 * palette.
 */
export const FINGER_COLOR: Readonly<Record<Finger, string>> = {
  'l-pinky': '#8B5CF6', // violet
  'l-ring': '#3B82F6', // blue
  'l-middle': '#14B8A6', // teal
  'l-index': '#22C55E', // green
  'r-index': '#E9B44C', // gold
  'r-middle': '#F97316', // orange
  'r-ring': '#FB7185', // coral
  'r-pinky': '#D01E7A', // raspberry (accent)
  thumb: '#6B5B72', // muted plum
};

/** Finger for a key, defaulting to a neutral thumb if unmapped. */
export function fingerOf(key: string): Finger {
  return FINGER_OF[key.toLowerCase()] ?? 'thumb';
}
