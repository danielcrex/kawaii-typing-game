/**
 * Level complete (PROJECT.md §5.3 win path, §7.5).
 *
 * The WIN mirror of game-over: reached authoritatively the instant the cleared
 * count hits the level's tile target. By then the Session has already flipped
 * its state to 'won' in the SAME tick, and the loop's spawn/fall guard has
 * frozen the world (no tile spawns or falls after) — exactly as the fail path
 * freezes on 'over'. This scene only renders the celebration; it does not (and
 * must not) keep the simulation running.
 *
 * Shows (per the brief): a completion message, 1–3 gold stars by hearts
 * remaining, the accuracy %, a "Next friend" button (advance to the next
 * level), and a link back to the friends page. On the final level there is no
 * next friend, so we celebrate mastery and offer only the friends link.
 */
import '../../styles/endcard.css';
import { Sound } from '../../audio/sound';
import { getMascot, mascotFallbackColor, MASCOTS } from '../../data/mascots';
import type { Scene, SceneFactory, SceneNavigator } from '../scenes';
import { createPlay } from './play';
import { createTitle } from './title';

/** Summary of the just-completed attempt, captured from the win snapshot. */
export interface LevelResult {
  /** Hearts remaining at the win (1..3) → star rating. */
  hearts: number;
  /** Rolling accuracy 0..1 at the win. */
  accuracy: number;
}

/** Build the level-complete scene for a level. */
export function createLevelComplete(level: number, result: LevelResult): SceneFactory {
  return (nav: SceneNavigator): Scene => {
    const mascot = getMascot(level);
    const isFinal = level >= MASCOTS.length;
    // Stars = hearts remaining, always at least one (you cannot win at 0 hearts —
    // that path is game-over — so a win is worth 1–3 stars).
    const stars = Math.max(1, Math.min(3, result.hearts));
    const accuracyPct = Math.round(result.accuracy * 100);

    const root = document.createElement('section');
    root.className = 'endcard endcard--win';
    root.innerHTML = `
      <div class="endcard__card">
        <h1 class="endcard__title">${isFinal ? 'You did it! 🎉' : 'Level complete! 🎉'}</h1>
        <div class="endcard__stars" role="img" aria-label="${stars} out of 3 stars">
          ${[1, 2, 3].map((n) => `<span class="endcard__star${n <= stars ? ' is-earned' : ''}">★</span>`).join('')}
        </div>
        <p class="endcard__msg">
          ${isFinal
            ? `You typed your way through every friend. Amazing work!`
            : `Great typing with ${mascot?.name ?? 'your friend'}!`}
        </p>
        <div class="endcard__scoreline instrument">
          <span class="endcard__score"><span class="endcard__score-value">${accuracyPct}</span>% accuracy</span>
        </div>
      </div>
    `;

    const card = root.querySelector<HTMLDivElement>('.endcard__card')!;

    // Celebrating mascot (graceful fallback capsule if the image is missing).
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

    // "Next friend" — advance to the next level. Hidden on the final level,
    // where there is no next friend to meet.
    if (!isFinal) {
      const next = document.createElement('button');
      next.className = 'endcard__btn endcard__btn--primary';
      next.type = 'button';
      const nextMascot = getMascot(level + 1);
      next.textContent = nextMascot ? `Next friend: ${nextMascot.name} →` : 'Next friend →';
      next.addEventListener('click', () => {
        Sound.menuTap();
        nav.go(createPlay(level + 1));
      });
      actions.appendChild(next);
    }

    // Replay the same level (mirrors game-over's "Try again?").
    const replay = document.createElement('button');
    replay.className = 'endcard__btn';
    replay.type = 'button';
    replay.textContent = '↻ Play again';
    replay.addEventListener('click', () => {
      Sound.menuTap();
      nav.go(createPlay(level));
    });
    actions.appendChild(replay);

    // Link back to the main/friends page.
    const home = document.createElement('button');
    home.className = `endcard__btn${isFinal ? ' endcard__btn--primary' : ''}`;
    home.type = 'button';
    home.textContent = '← Friends';
    home.addEventListener('click', () => {
      Sound.menuTap();
      nav.go(createTitle);
    });
    actions.appendChild(home);

    card.appendChild(actions);

    return { id: `levelcomplete-${level}`, root, mounted() { Sound.levelComplete(); } };
  };
}
