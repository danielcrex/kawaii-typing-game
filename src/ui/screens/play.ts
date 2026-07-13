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
import { getLevel, getPhaseForLevel, type PhaseId } from '../../data/levels';
import { createStaticDifficulty } from '../../engine/difficulty';
import { startLoop, type LoopHandle } from '../../engine/loop';
import { attachKeyRouter } from '../../input/keyRouter';
import { Session, type SessionSnapshot } from '../../game/session';
import { createHeartsView } from '../../render/hud';
import { initHearts, accrueRegen, loseHeart, regenFraction } from '../../game/hearts';
import type { Scene, SceneFactory, SceneNavigator } from '../scenes';
import { createTitle } from './title';
import { createGameOver } from './gameOver';

/** Play a given level. */
export function createPlay(level: number): SceneFactory {
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
          <span class="play__stat instrument" title="Accuracy">🎯 <span data-acc>100</span>%</span>
          <span class="play__stat instrument"><span data-cleared>0</span> / 20</span>
        </div>
      </header>
      <div class="play__field" aria-label="Falling tiles"></div>
      <footer class="play__footer instrument" data-hint>
        Just start typing — the game finds the right tile. Wrong keys are okay, just try again.
      </footer>
    `;

    const back = root.querySelector<HTMLButtonElement>('.play__back')!;
    const field = root.querySelector<HTMLDivElement>('.play__field')!;
    const clearedOut = root.querySelector<HTMLSpanElement>('[data-cleared]')!;
    const accOut = root.querySelector<HTMLSpanElement>('[data-acc]')!;
    const heartsMount = root.querySelector<HTMLSpanElement>('[data-hearts]')!;
    const hint = root.querySelector<HTMLElement>('[data-hint]')!;

    back.addEventListener('click', () => nav.go(createTitle));

    const heartsView = createHeartsView();
    heartsMount.appendChild(heartsView.el);

    let loop: LoopHandle | null = null;
    let session: Session | null = null;
    let detachKeys: (() => void) | null = null;
    let ended = false; // guard so we transition off the play scene only once

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

        session = new Session({
          level,
          field: { width: rect.width, height: rect.height },
          // SINGLE SOURCE of speed/spawn/concurrency (static now, adaptive in step 5).
          difficulty: createStaticDifficulty(phase),
          nextWord: makeTempWordSource(phase.id),
          mascot: { image: mascot.image, name: mascot.name, fallbackColor: mascotFallbackColor(mascot.hue) },
          layer: field,
          onChange: (snap: SessionSnapshot) => {
            clearedOut.textContent = String(snap.cleared);
            accOut.textContent = String(Math.round(snap.accuracy * 100));
            heartsView.update(snap.hearts, snap.regen);
            if (snap.state === 'over' && !ended) {
              ended = true;
              // Defer off the current update() call to avoid tearing the scene
              // down re-entrantly while the loop is mid-tick.
              queueMicrotask(() => nav.go(createGameOver(level)));
            } else if (snap.state === 'won' && !ended) {
              ended = true;
              hint.textContent = '🎉 You cleared them all! (level-complete scene comes in step 8)';
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
              getPhaseForLevel,
              hearts: { initHearts, accrueRegen, loseHeart, regenFraction },
            },
          };
        }
      },
      unmount() {
        detachKeys?.();
        loop?.stop();
        session?.dispose();
        document.documentElement.style.setProperty('--mascot-hue', previousHue || '0deg');
      },
    };
  };
}

/**
 * TEMPORARY content source (step 2 only). Returns short, phase-appropriate
 * placeholder words so we can watch tiles fall and clear. Step 8 replaces this
 * with the curated §6.3 word pools from data/words.ts — same injected shape, so
 * it's a drop-in swap.
 */
function makeTempWordSource(phase: PhaseId): () => string {
  const TEMP: Record<PhaseId, readonly string[]> = {
    A: ['a', 's', 'd', 'f', 'j', 'k', 'l', 'e', 'i', 'r', 'u'],
    B: ['cat', 'dog', 'sun', 'bee', 'sky', 'joy', 'hat', 'run'],
    C: ['star', 'moon', 'play', 'jump', 'kite', 'frog'],
    D: ['happy', 'sunny', 'bunny', 'cloud', 'candy', 'friend'],
    E: ['rainbow', 'sparkle', 'flowers', 'kitten', 'blossom'],
    F: ['sunshine', 'wonderful', 'butterfly', 'good job', 'well done'],
  };
  const pool = TEMP[phase];
  return () => pool[Math.floor(Math.random() * pool.length)] ?? '?';
}
