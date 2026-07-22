/**
 * Home-row finger warm-up (age lever (a), PROJECT.md §6).
 *
 * The confident on-ramp ("I know my letters") COMPRESS-TRAVERSES to L7 — but a
 * kid who knows letters by sight may still hunt-and-peck, and step 6's keyboard
 * guide isn't built yet. This micro-warm-up closes that gap: it teaches home-row
 * FINGER POSITION (not letters) before the first real-word level, so the
 * confident on-ramp never assumes fingering it hasn't taught.
 *
 * It's the confident tier's finger cue (minimal colour + short label, per the
 * age split), a preview of the step-6 guide, and consumes the SINGLE sources of
 * truth: key order from data/curriculum.ts (home row = keys unlocked through
 * L4), finger/label/colour from data/fingerMap.ts. Forgiving + skippable +
 * reduced-motion aware.
 */
import '../../styles/warmup.css';
import { keysUnlockedThrough } from '../../data/curriculum';
import { fingerOf, FINGER_LABEL, FINGER_COLOR } from '../../data/fingerMap';
import { attachKeyRouter } from '../../input/keyRouter';
import type { Scene, SceneFactory, SceneNavigator } from '../scenes';
import { createPlay } from './play';

/** The full home row, in physical left→right order, for the keycap strip. */
const HOME_ROW_DISPLAY = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'] as const;

/** Build the warm-up, which advances to `createPlay(nextLevel)` when done. */
export function createWarmup(nextLevel: number): SceneFactory {
  return (nav: SceneNavigator): Scene => {
    // The teaching sequence = the home-row LETTERS unlocked through L4 (single
    // source), anchored index-first so she finds home position, then the reaches.
    const homeLetters = new Set(keysUnlockedThrough(4).filter((k) => k.length === 1 && k >= 'a' && k <= 'z'));
    const sequence = ['f', 'j', 'd', 'k', 's', 'l', 'a', 'g', 'h'].filter((k) => homeLetters.has(k));

    let index = 0;
    let detach: (() => void) | null = null;

    const root = document.createElement('section');
    root.className = 'warmup';
    root.innerHTML = `
      <div class="warmup__card">
        <h1 class="warmup__title">Quick finger warm-up ✋</h1>
        <p class="warmup__sub">Press each glowing key with the right finger. This is where your fingers live — "home row".</p>
        <div class="warmup__keys" role="group" aria-label="Home row keys">
          ${HOME_ROW_DISPLAY.map((k) => `<span class="warmup__key" data-key="${k}">${k.toUpperCase()}</span>`).join('')}
        </div>
        <p class="warmup__cue" data-cue aria-live="polite"></p>
        <div class="warmup__progress" data-progress></div>
        <button class="warmup__skip" type="button" data-skip>I've got this — skip to words →</button>
      </div>
    `;

    const keyEls = new Map<string, HTMLElement>();
    for (const el of root.querySelectorAll<HTMLElement>('.warmup__key')) {
      keyEls.set(el.dataset.key!, el);
    }
    const cue = root.querySelector<HTMLElement>('[data-cue]')!;
    const progress = root.querySelector<HTMLElement>('[data-progress]')!;
    progress.innerHTML = sequence.map(() => `<span class="warmup__dot"></span>`).join('');
    const dots = [...progress.querySelectorAll<HTMLElement>('.warmup__dot')];

    /** Light the current target key in its finger colour + show the finger cue. */
    const showTarget = (): void => {
      // Clear previous glow.
      for (const el of keyEls.values()) {
        el.classList.remove('is-target');
        el.style.removeProperty('--glow');
      }
      const key = sequence[index];
      if (!key) return;
      const finger = fingerOf(key);
      const color = FINGER_COLOR[finger];
      const el = keyEls.get(key);
      if (el) {
        el.style.setProperty('--glow', color);
        el.classList.add('is-target');
      }
      // Finger cue where words appear (minimal colour chip + short label — the
      // confident/older tier). The whole-hand diagram is the step-6 beginner tier.
      cue.innerHTML = `Use your <b style="color:${color}">${FINGER_LABEL[finger]}</b> <span class="warmup__chip" style="background:${color}"></span>`;
    };

    /** Mark progress and advance; when the sequence is done, go to the level. */
    const advance = (): void => {
      dots[index]?.classList.add('is-done');
      index++;
      if (index >= sequence.length) {
        finish();
        return;
      }
      showTarget();
    };

    const finish = (): void => {
      cue.textContent = 'Nice — your fingers know the way. Off to words! ✨';
      // Small beat so the last "done" dot registers, then into L7.
      window.setTimeout(() => nav.go(createPlay(nextLevel)), 550);
    };

    const onKey = (char: string): void => {
      const target = sequence[index];
      if (!target) return;
      if (char.toLowerCase() === target) {
        keyEls.get(target)?.classList.add('is-hit');
        advance();
      } else {
        // Forgiving: gentle nudge on the target, no penalty, stay put.
        const el = keyEls.get(target);
        el?.classList.remove('warmup__key--nudge');
        void el?.offsetWidth; // reflow so the animation can retrigger
        el?.classList.add('warmup__key--nudge');
      }
    };

    root.querySelector<HTMLButtonElement>('[data-skip]')!.addEventListener('click', () =>
      nav.go(createPlay(nextLevel)),
    );

    return {
      id: 'warmup',
      root,
      mounted() {
        // If nothing to teach (shouldn't happen), go straight in.
        if (sequence.length === 0) {
          nav.go(createPlay(nextLevel));
          return;
        }
        showTarget();
        detach = attachKeyRouter(onKey);
      },
      unmount() {
        detach?.();
      },
    };
  };
}
