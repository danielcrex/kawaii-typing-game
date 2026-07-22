/**
 * First-run starting-point pick (age lever (a), PROJECT.md §6).
 *
 * ONE curriculum spine, two entry points — not two games. A single tap sets the
 * default entry level on the same key-progression spine:
 *  - "Just starting" → level 1 (gentle home-row single-key drills).
 *  - "I know my letters" → the confident on-ramp. This is COMPRESS-TRAVERSE, not
 *    a hard skip: it enters at CONFIDENT_ENTRY_LEVEL (L7), which PRESERVES the
 *    full L7→L24 finger-position progression (top-row completion, bottom row,
 *    capitals, punctuation) — it only compresses past the pure home-row drills a
 *    letter-confident kid already knows by sight. (When step 6 lands, the
 *    on-screen keyboard guide — consuming this same curriculum — teaches the
 *    home-row finger positions live during the confident player's first level.)
 *
 * Either way the choice is only a DEFAULT: every level stays reachable from the
 * friends grid / level-select, so a fast kid can still climb and a stuck one can
 * drop back.
 */
import '../../styles/onboarding.css';
import { BEGINNER_ENTRY_LEVEL, CONFIDENT_ENTRY_LEVEL } from '../../data/curriculum';
import { saveOnboarding } from '../../storage/progress';
import type { Scene, SceneFactory, SceneNavigator } from '../scenes';
import { createTitle } from './title';
import { createPlay } from './play';
import { createWarmup } from './warmup';

export const createOnboarding: SceneFactory = (nav: SceneNavigator): Scene => {
  const root = document.createElement('section');
  root.className = 'onboard';
  root.innerHTML = `
    <div class="onboard__card">
      <h1 class="onboard__title">Welcome! ✨</h1>
      <p class="onboard__sub">Where should we start? You can always pick a different friend later.</p>
      <div class="onboard__choices">
        <button class="onboard__choice" type="button" data-choice="beginner">
          <span class="onboard__emoji">🌱</span>
          <span class="onboard__label">Just starting</span>
          <span class="onboard__hint">Learn the keys from the very beginning</span>
        </button>
        <button class="onboard__choice onboard__choice--primary" type="button" data-choice="confident">
          <span class="onboard__emoji">🚀</span>
          <span class="onboard__label">I know my letters</span>
          <span class="onboard__hint">A quick warm-up, then straight into words</span>
        </button>
      </div>
      <button class="onboard__skip" type="button" data-choice="browse">Just let me browse the friends →</button>
    </div>
  `;

  /** Record the pick, then go where the choice points. */
  const choose = (entryLevel: number, then: 'play' | 'title' | 'warmup'): void => {
    saveOnboarding(entryLevel);
    if (then === 'warmup') nav.go(createWarmup(entryLevel));
    else if (then === 'play') nav.go(createPlay(entryLevel));
    else nav.go(createTitle);
  };

  // Beginner starts at L1 (its own gentle home-row drills teach fingering).
  root.querySelector('[data-choice="beginner"]')!.addEventListener('click', () =>
    choose(BEGINNER_ENTRY_LEVEL, 'play'),
  );
  // Confident compress-traverses to L7 — but FIRST a home-row finger warm-up, so
  // the on-ramp never assumes fingering step 6 hasn't taught yet.
  root.querySelector('[data-choice="confident"]')!.addEventListener('click', () =>
    choose(CONFIDENT_ENTRY_LEVEL, 'warmup'),
  );
  // "Browse" still counts as onboarded (so we don't nag), defaulting entry to L1.
  root.querySelector('[data-choice="browse"]')!.addEventListener('click', () =>
    choose(BEGINNER_ENTRY_LEVEL, 'title'),
  );

  return { id: 'onboarding', root };
};
