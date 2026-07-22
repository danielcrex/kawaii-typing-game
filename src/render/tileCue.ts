/**
 * Eyes-up tile cue (PROJECT.md §5.4) — the "which finger" info rendered ON the
 * tile her eyes already follow, so the guidance arrives where she's looking
 * (a bottom-only cue just relocates the look-down habit).
 *
 * Richness is tied to the on-ramp tier:
 *  - beginner ("just starting"): a whole-hand diagram with the correct finger
 *    raised in its colour — concrete/spatial for a 5yo.
 *  - confident ("I know my letters"): a minimal finger-colour pip + short label.
 *
 * Placement handles the three extremes with ONE rule (best free position): it
 * picks the first of {right, left, above, below} the tile that is fully in-field
 * (excluding the keyboard zone) AND clear of every other tile — so bottom-edge,
 * walls, and a tile stacked above are all handled, and the cue never covers
 * another word. Near the bottom it prefers "above"; at a wall it flips side but
 * KEEPS the hand. Only if no anchor fits at all does a beginner's hand degrade
 * to the pip (dense-crowd last resort). Moves ease to a settle (no teleport);
 * finger colour/label from the single data/fingerMap.ts. Reduced-motion static.
 */
import { fingerOf, FINGER_COLOR, FINGER_LABEL, type Finger } from '../data/fingerMap';

export type CueTier = 'beginner' | 'confident';

/** A rectangle in play-field coordinates. */
export interface CueRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What to show, and around which tile. */
export interface CueTarget {
  rect: CueRect;
  others: readonly CueRect[];
  nextChar: string;
  /** 0..1 opacity from per-key mastery (mastered → faint). */
  fade: number;
}

/** Field geometry the placement must respect. */
export interface FieldBox {
  w: number;
  h: number;
  /** Height of the reserved keyboard zone at the bottom (cue must stay above it). */
  safeBottom: number;
}

export interface TileCue {
  readonly el: HTMLElement;
  update(target: CueTarget | null, field: FieldBox): void;
  destroy(): void;
}

/** Nominal cue-box sizes (px) used for placement math, per form. */
const PIP = { w: 108, h: 30 };
const HAND = { w: 162, h: 98 };
const GAP = 10;

/** Which hand + display slot (0..4) each finger occupies in the diagram. */
const HAND_SLOT: Record<Finger, { hand: 'l' | 'r'; slot: number }> = {
  'l-pinky': { hand: 'l', slot: 0 },
  'l-ring': { hand: 'l', slot: 1 },
  'l-middle': { hand: 'l', slot: 2 },
  'l-index': { hand: 'l', slot: 3 },
  thumb: { hand: 'r', slot: 0 }, // space → a thumb (either hand); show right
  'r-index': { hand: 'r', slot: 1 },
  'r-middle': { hand: 'r', slot: 2 },
  'r-ring': { hand: 'r', slot: 3 },
  'r-pinky': { hand: 'r', slot: 4 },
};

/**
 * Per-hand digit layout in SLOT ORDER (matches HAND_SLOT). Left hand shows
 * pinky→thumb, right shows thumb→pinky; heights shape a natural silhouette and
 * the thumb is shorter + angled outward.
 */
const HAND_LAYOUT: Record<'l' | 'r', { h: number; thumb?: boolean }[]> = {
  l: [{ h: 26 }, { h: 34 }, { h: 40 }, { h: 36 }, { h: 24, thumb: true }],
  r: [{ h: 24, thumb: true }, { h: 36 }, { h: 40 }, { h: 34 }, { h: 26 }],
};

function intersects(a: CueRect, b: CueRect, margin = 4): boolean {
  return (
    a.x < b.x + b.w + margin &&
    a.x + a.w + margin > b.x &&
    a.y < b.y + b.h + margin &&
    a.y + a.h + margin > b.y
  );
}

/** Candidate top-left for a cue of size (cw,ch) on a given side of the tile. */
function anchor(side: string, t: CueRect, cw: number, ch: number): CueRect {
  switch (side) {
    case 'right':
      return { x: t.x + t.w + GAP, y: t.y + t.h / 2 - ch / 2, w: cw, h: ch };
    case 'left':
      return { x: t.x - GAP - cw, y: t.y + t.h / 2 - ch / 2, w: cw, h: ch };
    case 'above':
      return { x: t.x + t.w / 2 - cw / 2, y: t.y - GAP - ch, w: cw, h: ch };
    default: // below
      return { x: t.x + t.w / 2 - cw / 2, y: t.y + t.h + GAP, w: cw, h: ch };
  }
}

/** Pick the first valid anchor (in-field, clear of other tiles) for a cue size. */
function place(t: CueRect, others: readonly CueRect[], field: FieldBox, cw: number, ch: number): CueRect | null {
  const usableH = field.h - field.safeBottom;
  const nearBottom = t.y + t.h > usableH - ch - GAP;
  // Prefer sides (least occlusion of the fall path); lift "above" first near the
  // bottom; drop "below" there (it would land in the keyboard zone).
  const order = nearBottom ? ['above', 'right', 'left'] : ['right', 'left', 'above', 'below'];
  for (const side of order) {
    const box = anchor(side, t, cw, ch);
    const inField = box.x >= 0 && box.y >= 0 && box.x + box.w <= field.w && box.y + box.h <= usableH;
    if (!inField) continue;
    if (others.some((o) => intersects(box, o))) continue;
    return box;
  }
  return null;
}

/** SVG for one hand: rounded digits growing out of a palm, indexed by slot. */
function handSVG(which: 'l' | 'r'): string {
  const digits = HAND_LAYOUT[which];
  const W = 12;
  const G = 5;
  const BASE = 54; // y where digits meet the palm
  let x = 7;
  const parts: string[] = [];
  digits.forEach((d, i) => {
    const fy = BASE - d.h;
    const cx = x + W / 2;
    const rot = d.thumb ? (which === 'l' ? 22 : -22) : 0;
    // Each digit is a rounded bar that extends into the palm so they read as one.
    parts.push(
      `<g transform="rotate(${rot} ${cx} ${BASE})"><rect class="cf" data-slot="${i}" x="${x}" y="${fy}" width="${W}" height="${d.h + 18}" rx="${W / 2}"/></g>`,
    );
    x += W + G;
  });
  const palmW = x - 7 - G + 12;
  const palm = `<rect class="cpalm" x="1" y="48" width="${palmW}" height="22" rx="11"/>`;
  return `<svg class="cue__handsvg" data-hand="${which}" viewBox="0 0 ${x + 4} 74" role="img">${palm}${parts.join('')}</svg>`;
}

/** Build the two-hand diagram once; `raise` updates which finger is lifted. */
function buildHands(): { el: HTMLElement; raise: (finger: Finger, color: string) => void } {
  const el = document.createElement('div');
  el.className = 'cue__hands';
  // The HTML parser handles inline <svg> foreign content correctly.
  el.innerHTML = `<div class="cue__handrow">${handSVG('l')}${handSVG('r')}</div><div class="cue__hlabel"></div>`;
  const label = el.querySelector<HTMLElement>('.cue__hlabel')!;

  const raise = (finger: Finger, color: string): void => {
    for (const f of el.querySelectorAll<SVGRectElement>('.cf')) {
      f.classList.remove('up');
      f.style.removeProperty('fill');
    }
    const { hand, slot } = HAND_SLOT[finger];
    const target = el.querySelector<SVGRectElement>(`.cue__handsvg[data-hand="${hand}"] .cf[data-slot="${slot}"]`);
    if (target) {
      target.classList.add('up');
      target.style.fill = color;
    }
    label.textContent = FINGER_LABEL[finger];
    label.style.color = color;
  };
  return { el, raise };
}

/** Create a cue for a tier. Its `el` should be appended to the play field. */
export function createTileCue(tier: CueTier): TileCue {
  const el = document.createElement('div');
  el.className = 'cue';
  el.setAttribute('aria-hidden', 'true');

  // Pip (dot + label) — always built; the confident cue and the beginner
  // last-resort degrade both use it.
  const pip = document.createElement('div');
  pip.className = 'cue__pip';
  const dot = document.createElement('span');
  dot.className = 'cue__dot';
  const pipLabel = document.createElement('span');
  pip.append(dot, pipLabel);

  const hands = tier === 'beginner' ? buildHands() : null;
  el.appendChild(pip);
  if (hands) el.appendChild(hands.el);

  return {
    el,
    update(target, field) {
      if (!target || !target.nextChar) {
        el.classList.add('cue--hidden');
        return;
      }
      const finger = fingerOf(target.nextChar);
      const color = FINGER_COLOR[finger];

      // Decide form + placement. Beginner tries the hand first; if nothing fits,
      // degrade to the pip (last resort) rather than losing guidance entirely.
      let box: CueRect | null = null;
      let useHand = false;
      if (tier === 'beginner') {
        box = place(target.rect, target.others, field, HAND.w, HAND.h);
        if (box) {
          useHand = true;
        } else {
          box = place(target.rect, target.others, field, PIP.w, PIP.h);
        }
      } else {
        box = place(target.rect, target.others, field, PIP.w, PIP.h);
      }

      if (!box) {
        // No anchor fits at all (dense crowd) — the keyboard floor still guides.
        el.classList.add('cue--hidden');
        return;
      }

      el.classList.toggle('cue--hand', useHand);
      el.classList.toggle('cue--pip', !useHand);
      if (useHand && hands) {
        hands.raise(finger, color);
      } else {
        dot.style.background = color;
        pipLabel.textContent = FINGER_LABEL[finger];
      }
      el.style.opacity = String(target.fade);
      el.classList.remove('cue--hidden');
      // Ease to the new anchor (settle, not teleport — CSS transitions transform;
      // reduced-motion disables the transition).
      el.style.transform = `translate(${Math.round(box.x)}px, ${Math.round(box.y)}px)`;
    },
    destroy() {
      el.remove();
    },
  };
}
