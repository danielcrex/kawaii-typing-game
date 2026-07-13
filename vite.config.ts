import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath } from 'node:url';
import { existsSync, renameSync } from 'node:fs';

// ESM has no __dirname; derive the project root from this file's URL.
const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const fromRoot = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * MIGRATION SHIM — remove after the Cloudflare cutover.
 *
 * The *old* single-file game keeps the repo-root `index.html` so the live site
 * (served by Cloudflare from `assets.directory: "."`) stays up while we rebuild.
 * Our Vite entry is therefore `game.html`, and Rollup emits `dist/game.html`.
 * But once we flip `assets.directory` to `./dist`, Cloudflare serves the site
 * root from `dist/index.html` — so we rename the built entry accordingly.
 *
 * Post-cutover this whole plugin (and the `game.html` name) collapses back to a
 * plain root `index.html`.
 */
function renameEntryToIndex(): Plugin {
  return {
    name: 'rename-entry-to-index',
    // Runs after the bundle is fully written to disk.
    closeBundle() {
      const from = fromRoot('dist/game.html');
      const to = fromRoot('dist/index.html');
      if (existsSync(from)) renameSync(from, to);
    },
  };
}

export default defineConfig({
  root: projectRoot,
  // Everything under public/ is copied verbatim to dist/ (keeps /Images/N.jpg paths stable).
  publicDir: fromRoot('public'),
  build: {
    outDir: fromRoot('dist'),
    emptyOutDir: true,
    // Entry is game.html (not index.html) so we don't clobber the live old game.
    rollupOptions: { input: fromRoot('game.html') },
  },
  plugins: [renameEntryToIndex()],
  // Local dev opens the real entry, not the preserved old game.
  server: { open: '/game.html' },
});
