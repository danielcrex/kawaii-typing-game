/**
 * Bootstrap (PROJECT.md §4 main.ts).
 *
 * Wires the scene manager and shows the title screen. Asset preload, audio
 * init, and persistence load are added in their respective §12 steps; the
 * import order below keeps design tokens and type available before any scene
 * paints.
 */
import './theme/tokens.css';
import './theme/type.css';
import './styles/base.css';
import './styles/title.css';
import './styles/cutout.css';

import { SceneManager } from './ui/scenes';
import { createTitle } from './ui/screens/title';
import { createOnboarding } from './ui/screens/onboarding';
import { createMobileGate, needsKeyboardGate } from './ui/screens/mobileGate';
import { USE_CUTOUTS } from './data/mascots';
import { Sound } from './audio/sound';
import { loadOnboarding } from './storage/progress';

// Mascot display mode (fix #2): full-image cutouts vs the circular medallion.
document.documentElement.classList.toggle('cutouts', USE_CUTOUTS);

// Persistent music (§9) lives ABOVE the scene manager: it starts on the first
// user gesture (autoplay policy) and then plays continuously across every scene;
// scenes only call Sound.setPhase(). One-time unlock listener:
const unlockAudio = (): void => {
  Sound.unlock();
  window.removeEventListener('pointerdown', unlockAudio);
  window.removeEventListener('keydown', unlockAudio);
};
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

const app = document.getElementById('app');
if (!app) {
  throw new Error('#app mount point missing from index.html');
}

const scenes = new SceneManager(app);

// Normal boot: first run → the one-tap starting-point pick (age lever (a), §6);
// afterwards straight to the friends grid.
const boot = loadOnboarding()?.done ? createTitle : createOnboarding;

// A physical-keyboard game (fix #4): on a touch device with no hardware keyboard
// show a friendly invite instead of an unplayable game, with a "continue anyway"
// path into the normal boot flow.
scenes.go(needsKeyboardGate() ? createMobileGate(boot) : boot);
