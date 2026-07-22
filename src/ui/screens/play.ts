/**
 * Play screen (PROJECT.md §7.5).
 *
 * STATUS (step 2): wires the game loop + session so candy-capsule tiles spawn,
 * fall (at the injected fallSpeed), and clear/escape. Difficulty comes from a
 * STATIC source now; step 5 swaps in the adaptive one — a one-line change here.
 * Real typing (the matcher) is step 3; until then a temporary click-to-clear
 * makes the clear path visible. Hearts/HUD/keyboard-guide arrive in later steps.
 */
import '../../styles/play.css';
import { getMascot, mascotFallbackColor } from '../../data/mascots';
import { getLevel, getPhaseForLevel } from '../../data/levels';
import { createWordSampler } from '../../data/sampler';
import {
  createAdaptiveDifficulty,
  createStaticDifficulty,
  COLD_START_INTENSITY,
  RETRY_FACTOR,
} from '../../engine/difficulty';
import { loadPhaseIntensity, savePhaseIntensity } from '../../storage/progress';
import { startLoop, type LoopHandle } from '../../engine/loop';
import { attachKeyRouter } from '../../input/keyRouter';
import { Session, type SessionSnapshot } from '../../game/session';
import { createHeartsView } from '../../render/hud';
import { initHearts, accrueRegen, loseHeart, regenFraction } from '../../game/hearts';
import type { Scene, SceneFactory, SceneNavigator } from '../scenes';
import { createTitle } from './title';
import { createGameOver } from './gameOver';
import { createLevelComplete } from './levelComplete';

/** Options for launching the play scene. */
export interface PlayOptions {
  /** True when reached via game-over "Try again?" — resumes at reduced intensity. */
  retry?: boolean;
}

/** Play a given level. */
export function createPlay(level: number, options: PlayOptions = {}): SceneFactory {
  return (nav: SceneNavigator): Scene => {
    const mascot = getMascot(level);
    const def = getLevel(level);
    const phase = getPhaseForLevel(level);

    // Preview the per-mascot dusk hue-shift.
    const previousHue = document.documentElement.style.getPropertyValue('--mascot-hue');
    document.documentElement.style.setProperty('--mascot-hue', `${mascot?.hue ?? 0}deg`);

    const root = document.createElement('section');
    root.className = 'play';
    root.innerHTML = `
      <header class="play__hud">
        <button class="play__back" type="button">← Friends</button>
        <div class="play__title">Level ${level} — ${mascot?.name ?? 'Mystery'}</div>
        <div class="play__stats">
          <span class="play__hearts" data-hearts></span>
          <span class="play__stat instrument" title="Words per minute"><span data-wpm>0</span> wpm</span>
          <span class="play__stat instrument" title="Accuracy">🎯 <span data-acc>100</span>%</span>
          <span class="play__stat instrument"><span data-cleared>0</span> / 20</span>
        </div>
      </header>
      <div class="play__field" aria-label="Falling tiles"></div>
      <footer class="play__footer">
        <span class="instrument" data-hint>Just start typing — the game finds the right tile. Wrong keys are okay, just try again.</span>
        <span class="play__intensity instrument" title="Adaptive intensity — eases off when you struggle, ramps when you cruise">
          intensity <span class="play__intensity-bar"><span class="play__intensity-fill" data-intensity></span></span>
        </span>
      </footer>
    `;

    const back = root.querySelector<HTMLButtonElement>('.play__back')!;
    const field = root.querySelector<HTMLDivElement>('.play__field')!;
    const clearedOut = root.querySelector<HTMLSpanElement>('[data-cleared]')!;
    const accOut = root.querySelector<HTMLSpanElement>('[data-acc]')!;
    const wpmOut = root.querySelector<HTMLSpanElement>('[data-wpm]')!;
    const intensityFill = root.querySelector<HTMLSpanElement>('[data-intensity]')!;
    const heartsMount = root.querySelector<HTMLSpanElement>('[data-hearts]')!;
    const hint = root.querySelector<HTMLElement>('[data-hint]')!;

    back.addEventListener('click', () => nav.go(createTitle));

    const heartsView = createHeartsView();
    heartsMount.appendChild(heartsView.el);

    let loop: LoopHandle | null = null;
    let session: Session | null = null;
    let detachKeys: (() => void) | null = null;
    let ended = false; // guard so we transition off the play scene only once

    // Starting intensity (§5.1 decisions 2 & 3):
    //  - Resume the phase's settled intensity if we have one; otherwise COLD start
    //    conservatively (a fresh/harder phase never inherits a high I).
    //  - On a game-over retry, resume REDUCED — never the intensity that just
    //    walled her.
    const storedIntensity = phase ? loadPhaseIntensity(phase.id) : undefined;
    const baseIntensity = storedIntensity ?? COLD_START_INTENSITY;
    const startIntensity = options.retry ? baseIntensity * RETRY_FACTOR : baseIntensity;
    // Created in mounted(); kept here so unmount() can persist the settled value.
    let difficulty: ReturnType<typeof createAdaptiveDifficulty> | null = null;

    return {
      id: `play-${level}`,
      root,
      // Runs after the scene is in the DOM, so the field is measurable now.
      mounted() {
        if (!phase || !mascot) {
          hint.textContent = 'This level is not available.';
          return;
        }
        const rect = field.getBoundingClientRect();

        // SINGLE SOURCE of speed/spawn/concurrency — swapping static→adaptive is
        // this one line (everything downstream already reads through it).
        difficulty = createAdaptiveDifficulty(phase, startIntensity);

        // Real content: the key-gated, non-repeating, new-key-weighted sampler
        // for THIS level (data/sampler.ts). Same injected `() => string` shape
        // the Session already consumes — a drop-in swap for the old placeholder.
        const sampler = createWordSampler(level);

        session = new Session({
          level,
          field: { width: rect.width, height: rect.height },
          difficulty,
          nextWord: () => sampler.next(),
          mascot: { image: mascot.image, name: mascot.name, fallbackColor: mascotFallbackColor(mascot.hue) },
          layer: field,
          onChange: (snap: SessionSnapshot) => {
            clearedOut.textContent = String(snap.cleared);
            accOut.textContent = String(Math.round(snap.accuracy * 100));
            wpmOut.textContent = String(Math.round(snap.wpm));
            intensityFill.style.width = `${Math.round(snap.intensity * 100)}%`;
            heartsView.update(snap.hearts, snap.regen);
            if (snap.state === 'over' && !ended) {
              ended = true;
              // Defer off the current update() call to avoid tearing the scene
              // down re-entrantly while the loop is mid-tick.
              queueMicrotask(() => nav.go(createGameOver(level)));
            } else if (snap.state === 'won' && !ended) {
              ended = true;
              // WIN mirror of the fail path: the Session already flipped to 'won'
              // this same tick (freezing spawn + fall), so we only transition the
              // scene. Capture hearts (→ stars) and accuracy from the win snapshot.
              const result = { hearts: snap.hearts, accuracy: snap.accuracy };
              queueMicrotask(() => nav.go(createLevelComplete(level, result)));
            }
          },
        });

        session.start();

        // Real typing: route keystrokes into the session (no submit key).
        detachKeys = attachKeyRouter((char) => session?.handleKey(char));

        loop = startLoop({
          update: (dt) => session?.update(dt),
          render: (alpha) => session?.render(alpha),
        });

        // DEV-only: expose the session + headless constructors so the simulation
        // can be stepped/inspected without relying on rAF (which pauses when the
        // page is hidden). Stripped from production builds.
        if (import.meta.env.DEV) {
          (window as unknown as { __ktf?: unknown }).__ktf = {
            session,
            loop,
            _test: {
              Session,
              createStaticDifficulty,
              createAdaptiveDifficulty,
              getPhaseForLevel,
              hearts: { initHearts, accrueRegen, loseHeart, regenFraction },
              storage: { loadPhaseIntensity, savePhaseIntensity },
              createWordSampler,
            },
          };
        }
      },
      unmount() {
        detachKeys?.();
        loop?.stop();
        session?.dispose();
        // Persist the settled intensity for THIS phase so the next level/session
        // resumes near where she left off (§5.1). On a game-over unmount this
        // saves the (already-eased) value, and retry reduces it further.
        if (phase && difficulty) savePhaseIntensity(phase.id, difficulty.intensity);
        document.documentElement.style.setProperty('--mascot-hue', previousHue || '0deg');
      },
    };
  };
}

