/**
 * On-screen keyboard guide (PROJECT.md §5.4) — the "eyes-on-screen" map.
 *
 * Full QWERTY, keys coded by finger colour (single source: data/fingerMap.ts),
 * home-row bumps on F/J, keys not yet taught (single source: data/curriculum.ts)
 * dimmed. The NEXT key glows in its finger's colour; the glow — and each key's
 * ambient finger tint — FADE with per-key mastery (accuracy-only, game/keyStats).
 *
 * This is the always-on floor: even when a tile-cue is suppressed for crowding,
 * the keyboard still glows the next key. Toggleable + reduced-motion aware.
 */
import '../styles/guide.css';
import { fingerOf, FINGER_COLOR } from '../data/fingerMap';
import { lettersUnlockedThrough, keysUnlockedThrough } from '../data/curriculum';

/** Physical key rows (space handled separately as the thumb bar). */
const ROWS: readonly string[][] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

export interface KeyboardGuide {
  readonly el: HTMLElement;
  /** Glow the key for `char` (or clear when null). `fade` 0..1 dims a mastered key. */
  setNextKey(char: string | null, fade: number): void;
  /** Re-tint each key by current per-key mastery (mastered keys go quieter). */
  refreshFade(masteryOf: (key: string) => number): void;
  /** Show/hide the whole guide (toggle). */
  setVisible(on: boolean): void;
  destroy(): void;
}

/** Build the keyboard for a given level (locked keys are dimmed for that level). */
export function createKeyboardGuide(level: number): KeyboardGuide {
  const unlockedLetters = lettersUnlockedThrough(level);
  const spaceUnlocked = keysUnlockedThrough(level).includes(' ');

  const el = document.createElement('div');
  el.className = 'kbg';
  el.setAttribute('aria-hidden', 'true'); // decorative; real input is the keydown handler

  const keyEls = new Map<string, HTMLElement>();

  const buildKey = (char: string, wide = false): HTMLElement => {
    const finger = fingerOf(char);
    const k = document.createElement('span');
    k.className = 'kbg__key';
    if (wide) k.classList.add('kbg__key--space');
    if (char === 'f' || char === 'j') k.classList.add('kbg__key--home'); // home anchors
    const unlocked = char === ' ' ? spaceUnlocked : unlockedLetters.has(char);
    if (!unlocked) k.classList.add('kbg__key--locked');
    k.style.setProperty('--fc', FINGER_COLOR[finger]);
    k.textContent = char === ' ' ? '' : char.toUpperCase();
    keyEls.set(char, k);
    return k;
  };

  for (const row of ROWS) {
    const rowEl = document.createElement('div');
    rowEl.className = 'kbg__row';
    for (const c of row) rowEl.appendChild(buildKey(c));
    el.appendChild(rowEl);
  }
  // Thumb space bar row.
  const spaceRow = document.createElement('div');
  spaceRow.className = 'kbg__row';
  spaceRow.appendChild(buildKey(' ', true));
  el.appendChild(spaceRow);

  let glowing: HTMLElement | null = null;

  return {
    el,
    setNextKey(char, fade) {
      if (glowing) {
        glowing.classList.remove('kbg__key--next');
        glowing.style.removeProperty('--glow-a');
        glowing = null;
      }
      if (char == null) return;
      const key = keyEls.get(char.toLowerCase());
      if (!key) return;
      // A mastered next-key glows only faintly (auto-fade); an unmastered one pops.
      key.style.setProperty('--glow-a', fade.toFixed(2));
      key.classList.add('kbg__key--next');
      glowing = key;
    },
    refreshFade(masteryOf) {
      for (const [char, key] of keyEls) {
        if (key.classList.contains('kbg__key--locked')) continue;
        // Ambient finger tint fades as the key is internalised (min opacity keeps
        // the map readable). Mastered keys recede; new keys stay vivid.
        const m = masteryOf(char);
        key.style.setProperty('--tint-a', (1 - 0.7 * m).toFixed(2));
      }
    },
    setVisible(on) {
      el.classList.toggle('kbg--hidden', !on);
    },
    destroy() {
      el.remove();
    },
  };
}
