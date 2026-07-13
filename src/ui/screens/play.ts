/**
 * Play screen.
 *
 * SCAFFOLD STATE: this is a placeholder. The real play scene — game loop,
 * spawner, candy-capsule tiles, live per-letter matching, hearts, keyboard
 * guide — is built across §12 steps 2–6. For now it proves scene navigation
 * and the per-mascot hue shift, and gives a way back to the title.
 */
import { getMascot, mascotFallbackColor } from '../../data/mascots';
import { getLevel } from '../../data/levels';
import type { Scene, SceneFactory, SceneNavigator } from '../scenes';
import { createTitle } from './title';

/** Placeholder play scene for a given level. */
export function createPlayPlaceholder(level: number): SceneFactory {
  return (nav: SceneNavigator): Scene => {
    const mascot = getMascot(level);
    const def = getLevel(level);

    // Preview the per-mascot dusk hue-shift so the theme system is visible.
    const previousHue = document.documentElement.style.getPropertyValue('--mascot-hue');
    document.documentElement.style.setProperty('--mascot-hue', `${mascot?.hue ?? 0}deg`);

    const root = document.createElement('section');
    root.className = 'title'; // reuse centered layout for now
    root.innerHTML = `
      <header class="title__header">
        <h1 class="title__logo">Level ${level} — ${mascot?.name ?? 'Mystery'}</h1>
        <p class="title__tagline">${def?.focus ?? ''}</p>
        <p class="instrument" style="color: var(--ink-muted)">play scene coming soon</p>
      </header>
    `;

    // Mascot art (with fallback) as a friendly stand-in.
    if (mascot) {
      const art = document.createElement('img');
      art.className = 'mascot-chip__art';
      art.style.width = '140px';
      art.style.height = '140px';
      art.src = mascot.image;
      art.alt = mascot.name;
      art.addEventListener('error', () => {
        const cap = document.createElement('div');
        cap.className = 'mascot-chip__art mascot-chip__fallback';
        cap.style.cssText = `width:140px;height:140px;background:${mascotFallbackColor(mascot.hue)}`;
        cap.textContent = mascot.name.charAt(0);
        art.replaceWith(cap);
      });
      root.appendChild(art);
    }

    const back = document.createElement('button');
    back.className = 'mascot-chip';
    back.type = 'button';
    back.style.padding = 'var(--space-3) var(--space-5)';
    back.textContent = '← Back to friends';
    back.addEventListener('click', () => nav.go(createTitle));
    root.appendChild(back);

    return {
      id: `play-${level}`,
      root,
      unmount() {
        // Restore the previous hue when leaving.
        document.documentElement.style.setProperty('--mascot-hue', previousHue || '0deg');
      },
    };
  };
}
