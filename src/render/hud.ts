/**
 * HUD (PROJECT.md §4 render/hud.ts).
 *
 * Step 4 delivers the hearts view: gold-outlined hearts (§5.3) that fill
 * bottom-up like liquid, with the NEXT empty heart showing a partial regen
 * sliver so she can see a heart coming back during clean play. WPM/streak meter
 * and the mascot stage arrive in later steps.
 */
import { MAX_HEARTS } from '../game/hearts';

export interface HeartsView {
  readonly el: HTMLElement;
  /** Reflect current hearts + the regen sliver (0..1) on the next empty heart. */
  update(hearts: number, regenFraction: number): void;
}

/** Build a row of `max` hearts. Each heart is an outline with a clipped gold fill. */
export function createHeartsView(max: number = MAX_HEARTS): HeartsView {
  const el = document.createElement('div');
  el.className = 'hearts';
  el.setAttribute('role', 'img');

  const fills: HTMLElement[] = [];
  for (let i = 0; i < max; i++) {
    const heart = document.createElement('span');
    heart.className = 'heart';

    // Base: the muted outline heart that's always visible.
    const base = document.createElement('span');
    base.className = 'heart__base';
    base.textContent = '♥';

    // Fill: the gold heart, clipped from the bottom by height (liquid look).
    const fill = document.createElement('span');
    fill.className = 'heart__fill';
    fill.textContent = '♥';

    heart.append(base, fill);
    el.appendChild(heart);
    fills.push(fill);
  }

  return {
    el,
    update(hearts, regenFraction) {
      el.setAttribute('aria-label', `${hearts} of ${max} hearts`);
      for (let i = 0; i < fills.length; i++) {
        // Full heart = 1; the single next-empty heart = regen sliver; rest = 0.
        const pct = Math.max(0, Math.min(1, i < hearts ? 1 : i === hearts ? regenFraction : 0));
        // Reveal the gold heart from the bottom up (liquid filling the glyph).
        fills[i]!.style.clipPath = `inset(${(1 - pct) * 100}% 0 0 0)`;
      }
    },
  };
}
