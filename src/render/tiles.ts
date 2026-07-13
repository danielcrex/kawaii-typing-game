/**
 * Candy-capsule tile rendering (PROJECT.md §4 render/tiles.ts, §7.3).
 *
 * The signature element: a soft 3D candy-glass bubble (inner glow + top
 * specular highlight) holding its mascot + word. Spring physics — squashes on
 * spawn, gently stretches while falling, pops on clear.
 *
 * Structure separates concerns so simulation and animation never fight:
 *   .tile          ← POSITION only; the session writes translate3d here.
 *     .tile__capsule ← MATERIAL + spring/stretch/pop; pure CSS.
 *       .tile__fill  ← left-to-right liquid fill of the typed prefix (step 3).
 *       .tile__mascot / .tile__word
 *
 * This file holds NO fall-speed constant — a tile only knows where it was told
 * to be. Movement is integrated by the session from the injected fallSpeed.
 */

/** Options for building a tile. */
export interface TileOptions {
  /** The word/letter to type (shown big, high-contrast). */
  word: string;
  /** Mascot image path (level mascot). */
  mascotImage: string;
  /** Mascot name (alt text + fallback capsule initial). */
  mascotName: string;
  /** Fallback capsule color if the mascot image fails to load (§8). */
  fallbackColor: string;
}

/** A live tile's DOM handle. The session drives position; input drives fill. */
export interface TileView {
  /** The positioned root element (append to the play field). */
  readonly el: HTMLElement;
  /** Set the tile's top-left position in field pixels. */
  setPosition(x: number, y: number): void;
  /** Fill the typed-prefix liquid to `fraction` ∈ [0,1] (step 3). */
  fillTo(fraction: number): void;
  /** Nudge/shake on a wrong key without failing the tile (step 3). */
  shake(): void;
  /** Pop-and-celebrate on clear; resolves once the tile can be removed. */
  clear(): Promise<void>;
  /** Sad escape when the tile reaches the bottom; resolves after the fade. */
  escape(): Promise<void>;
  /** Remove immediately (teardown). */
  destroy(): void;
}

/** Pop/escape animation durations (kept in sync with tiles.css). */
const POP_MS = 260;
const ESCAPE_MS = 260;

/** Build a candy-capsule tile with graceful mascot fallback. */
export function createTile(opts: TileOptions): TileView {
  const el = document.createElement('div');
  el.className = 'tile';

  const capsule = document.createElement('div');
  capsule.className = 'tile__capsule';

  // Liquid fill (typed prefix). Starts empty; step 3 animates its width.
  const fill = document.createElement('div');
  fill.className = 'tile__fill';

  // Mascot art with fallback to a colored initial capsule (§8).
  const mascot = document.createElement('img');
  mascot.className = 'tile__mascot';
  mascot.src = opts.mascotImage;
  mascot.alt = opts.mascotName;
  mascot.decoding = 'async';
  mascot.addEventListener('error', () => {
    const fallback = document.createElement('div');
    fallback.className = 'tile__mascot tile__mascot--fallback';
    fallback.style.background = opts.fallbackColor;
    fallback.textContent = opts.mascotName.charAt(0);
    fallback.setAttribute('aria-hidden', 'true');
    mascot.replaceWith(fallback);
  });

  const word = document.createElement('span');
  word.className = 'tile__word';
  word.textContent = opts.word;

  capsule.append(fill, mascot, word);
  el.appendChild(capsule);

  return {
    el,

    setPosition(x, y) {
      // translate3d keeps this on the GPU compositor for smooth 60fps motion.
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    },

    fillTo(fraction) {
      const pct = Math.max(0, Math.min(1, fraction)) * 100;
      fill.style.width = `${pct}%`;
    },

    shake() {
      capsule.classList.remove('tile__capsule--shake');
      // Force reflow so the animation can retrigger on rapid repeats.
      void capsule.offsetWidth;
      capsule.classList.add('tile__capsule--shake');
    },

    clear() {
      capsule.classList.add('tile__capsule--clear');
      return wait(POP_MS);
    },

    escape() {
      capsule.classList.add('tile__capsule--escape');
      return wait(ESCAPE_MS);
    },

    destroy() {
      el.remove();
    },
  };
}

/** Small promise timer used to sequence removal after an exit animation. */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
