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

import { SceneManager } from './ui/scenes';
import { createTitle } from './ui/screens/title';

const app = document.getElementById('app');
if (!app) {
  throw new Error('#app mount point missing from game.html');
}

const scenes = new SceneManager(app);
scenes.go(createTitle);
