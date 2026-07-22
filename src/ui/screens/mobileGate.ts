/**
 * Mobile / no-keyboard gate (fix #4).
 *
 * Kawaii Typing Friends teaches TOUCH TYPING on a physical keyboard — there's no
 * on-screen text input by design. On a touch device with no hardware keyboard we
 * show a friendly "come back on a keyboard" screen instead of an unplayable game.
 *
 * Detection is conservative to avoid false-positives: we require BOTH a coarse
 * primary pointer AND no hover capability. A laptop with a touchscreen still
 * reports a fine pointer + hover (its trackpad/mouse), so it is NOT gated. A
 * phone/tablet reports coarse + no-hover. As a final safety net there's a
 * "continue anyway" link (e.g. a tablet paired with a Bluetooth keyboard), which
 * we remember so we never nag that device again.
 */
import '../../styles/mobilegate.css';
import type { Scene, SceneFactory, SceneNavigator } from '../scenes';

const BYPASS_KEY = 'kawaii-typing-friends/keyboard-ok';

/** True when this looks like a touch device without a physical keyboard. */
export function needsKeyboardGate(): boolean {
  try {
    if (localStorage.getItem(BYPASS_KEY) === '1') return false;
    if (typeof matchMedia !== 'function') return false;
    const coarse = matchMedia('(pointer: coarse)').matches;
    const noHover = matchMedia('(hover: none)').matches;
    return coarse && noHover;
  } catch {
    return false; // never block play on a detection error
  }
}

/** Build the gate. `proceed` is where "continue anyway" goes (normal boot flow). */
export function createMobileGate(proceed: SceneFactory): SceneFactory {
  return (nav: SceneNavigator): Scene => {
    const root = document.createElement('section');
    root.className = 'mgate';
    root.innerHTML = `
      <div class="mgate__card">
        <div class="mgate__emoji">⌨️💕</div>
        <h1 class="mgate__title">Best with a keyboard!</h1>
        <p class="mgate__msg">
          Kawaii Typing Friends teaches you to type on a real keyboard — so it's most fun on a
          laptop or computer. Come play there and your friends will be waiting!
        </p>
        <button class="mgate__continue" type="button" data-continue>
          I have a keyboard — let me play →
        </button>
      </div>
    `;
    root.querySelector<HTMLButtonElement>('[data-continue]')!.addEventListener('click', () => {
      try {
        localStorage.setItem(BYPASS_KEY, '1'); // remember the choice; don't nag again
      } catch {
        /* storage unavailable — proceed anyway */
      }
      nav.go(proceed);
    });
    return { id: 'mobile-gate', root };
  };
}
