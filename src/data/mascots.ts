/**
 * Mascot roster (PROJECT.md §6.2 + §8).
 *
 * The 24 image files in /Images are named 1.jpg .. 24.jpg. Each was inspected
 * visually (filenames are just numbers, so we did NOT trust them) and confirmed
 * to match the spec's level order exactly. Served from /public/Images so the
 * runtime paths stay `/Images/N.jpg`.
 *
 * `hue` is the per-mascot background hue-rotation (deg) applied to the dusk
 * gradient so every level feels distinct while the palette stays coherent.
 * Offsets are spread evenly (15° per level) so consecutive levels within a
 * phase form a cohesive band.
 */
export interface MascotDef {
  /** 1-based level number. */
  level: number;
  /** Display name shown on menus and the mascot stage. */
  name: string;
  /** Absolute path to the mascot image, served from /public/Images. */
  image: string;
  /** Background hue-rotate offset in degrees, applied via --mascot-hue. */
  hue: number;
}

/** Ordered list of names, index 0 = level 1. */
const NAMES = [
  'Fly', 'Fish', 'Butterfly', 'Seahorse', // Phase A (1–4)
  'Hamster', 'Squirrel', 'Owl', 'Cat', // Phase B (5–8)
  'Otter', 'Turtle', 'Monkey', 'Dog', // Phase C (9–12)
  'Capybara', 'Snake', 'Crocodile', 'Deer', // Phase D (13–16)
  'Tiger', 'Lion', 'Monster', 'Dinosaur', // Phase E (17–20)
  'Elephant', 'Human', 'Dragon', 'Robot', // Phase F (21–24)
] as const;

export const MASCOTS: readonly MascotDef[] = NAMES.map((name, i) => ({
  level: i + 1,
  name,
  image: `/Images/${i + 1}.jpg`,
  hue: (i * 15) % 360,
}));

/** Look up a mascot by level (1-based). Returns undefined if out of range. */
export function getMascot(level: number): MascotDef | undefined {
  return MASCOTS[level - 1];
}

/**
 * Fallback capsule color (§8) — when a mascot image is missing/unmatched we
 * render a colored candy capsule instead of crashing the level. Deriving the
 * color from the mascot's hue keeps the fallback on-brand.
 */
export function mascotFallbackColor(hue: number): string {
  return `hsl(${(330 + hue) % 360} 68% 62%)`;
}
