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
import { Session, type SessionSnapshot } from '../../game/session';
import type { Scene, SceneFactory, SceneNavigator } from '../scenes';
import { createTitle } from './title';

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
        <div class="play__stat instrument"><span data-cleared>0</span> / 20</div>
      </header>
      <div class="play__field" aria-label="Falling tiles"></div>
      <footer class="play__footer instrument" data-hint>
        step 2 preview · click a tile to clear it (real typing arrives in step 3)
      </footer>
    `;

    const back = root.querySelector<HTMLButtonElement>('.play__back')!;
    const field = root.querySelector<HTMLDivElement>('.play__field')!;
    const clearedOut = root.querySelector<HTMLSpanElement>('[data-cleared]')!;
    const hint = root.querySelector<HTMLElement>('[data-hint]')!;

    back.addEventListener('click', () => nav.go(createTitle));

    let loop: LoopHandle | null = null;
    let session: Session | null = null;

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
          debugClickToClear: true,
          onChange: (snap: SessionSnapshot) => {
            clearedOut.textContent = String(snap.cleared);
            if (snap.state === 'won') {
              hint.textContent = '🎉 You cleared them all! (level-complete scene comes in step 8)';
            }
          },
        });

        session.start();
        loop = startLoop({
          update: (dt) => session?.update(dt),
          render: (alpha) => session?.render(alpha),
        });

        // DEV-only: expose the session so the simulation can be stepped/inspected
        // without relying on rAF (which pauses when the page is hidden).
        if (import.meta.env.DEV) {
          (window as unknown as { __ktf?: unknown }).__ktf = { session, loop };
        }
      },
      unmount() {
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
