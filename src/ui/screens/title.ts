/**
 * Title screen — the mascot grid (PROJECT.md §7.3/§7.5).
 *
 * Also the place where all 24 mascot images are first shown, which doubles as
 * the preload surface (§8.4): rendering them here warms the browser cache so
 * play never stalls on a fetch. Each chip degrades gracefully to a colored
 * capsule if its image is missing (§8.3) — a missing asset never crashes.
 */
import { MASCOTS, mascotFallbackColor, type MascotDef } from '../../data/mascots';
import type { Scene, SceneFactory, SceneNavigator } from '../scenes';
import { createPlay } from './play';

export const createTitle: SceneFactory = (nav: SceneNavigator): Scene => {
  const root = document.createElement('section');
  root.className = 'title';

  const header = document.createElement('header');
  header.className = 'title__header';
  header.innerHTML = `
    <h1 class="title__logo"><span class="spark">✨</span> Kawaii Typing Friends <span class="spark">✨</span></h1>
    <p class="title__tagline">Pick a friend and start typing!</p>
  `;

  const grid = document.createElement('div');
  grid.className = 'mascot-grid';
  grid.setAttribute('role', 'list');

  for (const mascot of MASCOTS) {
    grid.appendChild(createMascotChip(mascot, nav));
  }

  root.append(header, grid);
  return { id: 'title', root };
};

/** Build one candy-glass mascot chip with graceful image fallback. */
function createMascotChip(mascot: MascotDef, nav: SceneNavigator): HTMLElement {
  const chip = document.createElement('button');
  chip.className = 'mascot-chip';
  chip.type = 'button';
  chip.setAttribute('role', 'listitem');
  chip.setAttribute('aria-label', `Level ${mascot.level}: ${mascot.name}`);

  // Image, with a fallback capsule swapped in on load error (§8.3).
  const art = document.createElement('img');
  art.className = 'mascot-chip__art';
  art.src = mascot.image;
  art.alt = mascot.name;
  art.loading = 'lazy';
  art.decoding = 'async';
  art.addEventListener('error', () => {
    console.warn(`[mascots] image missing for level ${mascot.level} (${mascot.name}); using fallback capsule.`);
    art.replaceWith(buildFallbackCapsule(mascot));
  });

  const level = document.createElement('span');
  level.className = 'mascot-chip__level';
  level.textContent = `Lv ${mascot.level}`;

  const name = document.createElement('span');
  name.className = 'mascot-chip__name';
  name.textContent = mascot.name;

  chip.append(art, level, name);
  chip.addEventListener('click', () => nav.go(createPlay(mascot.level)));
  return chip;
}

/** Colored candy capsule shown when an image fails to load (§8 fallback). */
function buildFallbackCapsule(mascot: MascotDef): HTMLElement {
  const capsule = document.createElement('div');
  capsule.className = 'mascot-chip__art mascot-chip__fallback';
  capsule.style.background = mascotFallbackColor(mascot.hue);
  capsule.textContent = mascot.name.charAt(0);
  capsule.setAttribute('aria-hidden', 'true');
  return capsule;
}
