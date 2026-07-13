/**
 * Scene manager (PROJECT.md §4 ui/scenes.ts).
 *
 * Screens are simple factories that build a DOM subtree and return it plus an
 * optional teardown. The manager swaps one scene into #app at a time. Keeping
 * this imperative and framework-free is deliberate — the 60fps play loop and
 * the menus share one lightweight lifecycle with no re-render overhead (§3).
 *
 * Flow: title → select → intro → play → complete / gameover (§7.5).
 */

/** A mounted scene: its root element and how to tear it down. */
export interface Scene {
  readonly id: string;
  readonly root: HTMLElement;
  /** Called right AFTER the root is inserted into the DOM, so geometry is
   *  measurable synchronously (no rAF needed — works even if the page starts
   *  hidden). Do layout-dependent setup (field sizing, session start) here. */
  mounted?(): void;
  /** Called right before the scene is removed; detach listeners/timers here. */
  unmount?(): void;
}

/** Passed to every scene so it can navigate onward. */
export interface SceneNavigator {
  go(factory: SceneFactory): void;
}

/** A scene factory receives the navigator and returns a ready-mounted Scene. */
export type SceneFactory = (nav: SceneNavigator) => Scene;

export class SceneManager implements SceneNavigator {
  private readonly host: HTMLElement;
  private current: Scene | null = null;

  constructor(host: HTMLElement) {
    this.host = host;
  }

  /** Swap to a new scene, tearing down the previous one first. */
  go(factory: SceneFactory): void {
    const next = factory(this);
    this.current?.unmount?.();
    this.current?.root.remove();
    this.host.appendChild(next.root);
    this.current = next;
    // Insertion is done — now geometry is measurable for the new scene.
    next.mounted?.();
  }
}
