/**
 * Settings modal (PROJECT.md §9 audio; §6 starting-point re-entry).
 *
 * A lightweight overlay opened from the title's gear. Introduced for the audio
 * controls (§9: global mute + volume, music, subtle key-clicks); the
 * starting-point / level section (fix #5) is added here too so onboarding is
 * reachable again. Keyboard-focusable, closes on backdrop / Esc / Done.
 */
import '../../styles/settings.css';
import { Sound } from '../../audio/sound';
import { loadHandCueOn, saveHandCueOn } from '../../storage/progress';
import { MASCOTS } from '../../data/mascots';
import { createOnboarding } from './onboarding';
import { createPlay } from './play';
import type { SceneNavigator } from '../scenes';

/** Open the settings overlay. `nav` lets the start-point section change scenes. */
export function openSettings(nav: SceneNavigator): void {
  const backdrop = document.createElement('div');
  backdrop.className = 'settings';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', 'Settings');

  backdrop.innerHTML = `
    <div class="settings__panel">
      <h2 class="settings__title">Settings</h2>

      <section class="settings__group" aria-label="Sound">
        <h3 class="settings__h">Sound</h3>
        <label class="settings__row">
          <span>Sound on</span>
          <input type="checkbox" data-sound ${Sound.isMuted() ? '' : 'checked'} />
        </label>
        <label class="settings__row">
          <span>Volume</span>
          <input type="range" min="0" max="100" value="${Math.round(Sound.getVolume() * 100)}" data-vol />
        </label>
        <label class="settings__row">
          <span>Music</span>
          <input type="checkbox" data-music ${Sound.musicOn() ? 'checked' : ''} />
        </label>
        <label class="settings__row">
          <span>Key clicks <em>(subtle)</em></span>
          <input type="checkbox" data-keys ${Sound.keyClicksOn() ? 'checked' : ''} />
        </label>
      </section>

      <section class="settings__group" aria-label="Guide">
        <h3 class="settings__h">Keyboard guide</h3>
        <label class="settings__row">
          <span>Show hand cue <em>(on the tile)</em></span>
          <input type="checkbox" data-hand ${loadHandCueOn() ? 'checked' : ''} />
        </label>
      </section>

      <div class="settings__slot" data-slot></div>

      <button class="settings__done" type="button" data-done>Done</button>
    </div>
  `;

  const close = (): void => {
    Sound.menuTap();
    document.removeEventListener('keydown', onKey);
    backdrop.remove();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') close();
  };

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  document.addEventListener('keydown', onKey);
  backdrop.querySelector<HTMLButtonElement>('[data-done]')!.addEventListener('click', close);

  // ---- Sound wiring ----
  const sound = backdrop.querySelector<HTMLInputElement>('[data-sound]')!;
  const vol = backdrop.querySelector<HTMLInputElement>('[data-vol]')!;
  const music = backdrop.querySelector<HTMLInputElement>('[data-music]')!;
  const keys = backdrop.querySelector<HTMLInputElement>('[data-keys]')!;
  sound.addEventListener('change', () => {
    Sound.setMuted(!sound.checked);
    Sound.menuTap();
  });
  vol.addEventListener('input', () => Sound.setVolume(Number(vol.value) / 100));
  vol.addEventListener('change', () => Sound.menuTap());
  music.addEventListener('change', () => {
    Sound.setMusic(music.checked);
    Sound.menuTap();
  });
  keys.addEventListener('change', () => Sound.setKeyClicks(keys.checked));

  // Hand-cue toggle (fix #5) — keyboard finger-glow is unaffected.
  const hand = backdrop.querySelector<HTMLInputElement>('[data-hand]')!;
  hand.addEventListener('change', () => {
    saveHandCueOn(hand.checked);
    Sound.menuTap();
  });

  // The start-point / level section (fix #5) mounts into this slot.
  fillStartSection(backdrop.querySelector<HTMLDivElement>('[data-slot]')!, nav, close);

  document.body.appendChild(backdrop);
  backdrop.querySelector<HTMLButtonElement>('[data-done]')!.focus();
}

/**
 * Starting-point / level section (fix #5) — makes the first-run onboarding
 * reachable again so a player is never locked into their first choice, and adds
 * a level jump.
 */
function fillStartSection(slot: HTMLElement, nav: SceneNavigator, close: () => void): void {
  const options = MASCOTS.map((m) => `<option value="${m.level}">Level ${m.level} — ${m.name}</option>`).join('');
  slot.innerHTML = `
    <h3 class="settings__h">Starting point</h3>
    <button class="settings__action" type="button" data-replay>Choose “do you know your letters?” again</button>
    <div class="settings__select">
      <label for="ktf-jump">Jump to a level</label>
      <select id="ktf-jump" data-jump>${options}</select>
    </div>
    <button class="settings__action" type="button" data-go>Go to that level →</button>
  `;

  slot.querySelector<HTMLButtonElement>('[data-replay]')!.addEventListener('click', () => {
    close();
    nav.go(createOnboarding);
  });

  const jump = slot.querySelector<HTMLSelectElement>('[data-jump]')!;
  slot.querySelector<HTMLButtonElement>('[data-go]')!.addEventListener('click', () => {
    const level = Number(jump.value) || 1;
    close();
    nav.go(createPlay(level));
  });
}
