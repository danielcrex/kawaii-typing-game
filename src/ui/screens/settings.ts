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

  // The start-point / level section (fix #5) mounts into this slot.
  fillStartSection(backdrop.querySelector<HTMLDivElement>('[data-slot]')!, nav, close);

  document.body.appendChild(backdrop);
  backdrop.querySelector<HTMLButtonElement>('[data-done]')!.focus();
}

// Populated in fix #5.
function fillStartSection(_slot: HTMLElement, _nav: SceneNavigator, _close: () => void): void {
  /* fix #5 fills this */
}
