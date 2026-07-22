/**
 * Game over (PROJECT.md §5.3, §7.5).
 *
 * Reached authoritatively the instant hearts hit 0. Tone is KIND and
 * encouraging — never defeating. Just a soft "Aw, so close!" and a bright
 * "Try again?".
 *
 * Retry restarts the tile count from scratch (a fresh Session via createPlay).
 * DEPENDENCY (wired in step 5): retry must PRESERVE the settled adaptive
 * intensity for this phase, so a struggling kid isn't dropped straight back
 * into the same wall. That persistence lives in storage/progress.ts + the
 * adaptive source; when it lands, createPlay should resume from the stored
 * intensity rather than the static default. Nothing to change here — the wiring
 * is in the difficulty source createPlay injects.
 */
import '../../styles/endcard.css';
import { Sound } from '../../audio/sound';
import { getMascot, mascotFallbackColor } from '../../data/mascots';
import type { Scene, SceneFactory, SceneNavigator } from '../scenes';
import { createPlay } from './play';
import { createTitle } from './title';

/** Build the game-over scene for a level. */
export function createGameOver(level: number): SceneFactory {
  return (nav: SceneNavigator): Scene => {
    const mascot = getMascot(level);

    const root = document.createElement('section');
    root.className = 'endcard';
    root.innerHTML = `
      <div class="endcard__card">
        <h1 class="endcard__title">Aw, so close!</h1>
        <p class="endcard__msg">Those tiles were tricky. Want to give it another go?</p>
      </div>
    `;

    const card = root.querySelector<HTMLDivElement>('.endcard__card')!;

    // Friendly mascot (with graceful fallback) above the buttons.
    if (mascot) {
      const art = document.createElement('img');
      art.className = 'endcard__mascot';
      art.src = mascot.image;
      art.alt = mascot.name;
      art.addEventListener('error', () => {
        const cap = document.createElement('div');
        cap.className = 'endcard__mascot endcard__mascot--fallback';
        cap.style.background = mascotFallbackColor(mascot.hue);
        cap.textContent = mascot.name.charAt(0);
        art.replaceWith(cap);
      });
      card.insertBefore(art, card.firstChild);
    }

    const actions = document.createElement('div');
    actions.className = 'endcard__actions';

    const retry = document.createElement('button');
    retry.className = 'endcard__btn endcard__btn--primary';
    retry.type = 'button';
    retry.textContent = 'Try again?';
    // Retry resumes at REDUCED intensity (createPlay reads the persisted phase
    // intensity and applies the retry factor) — never the wall that just killed her.
    retry.addEventListener('click', () => {
      Sound.menuTap();
      nav.go(createPlay(level, { retry: true }));
    });

    const home = document.createElement('button');
    home.className = 'endcard__btn';
    home.type = 'button';
    home.textContent = '← Friends';
    home.addEventListener('click', () => {
      Sound.menuTap();
      nav.go(createTitle);
    });

    actions.append(retry, home);
    card.appendChild(actions);

    return { id: `gameover-${level}`, root, mounted() { Sound.gameOver(); } };
  };
}
