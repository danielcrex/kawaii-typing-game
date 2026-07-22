import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// ESM has no __dirname; derive the project root from this file's URL.
const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const fromRoot = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Post-cutover: `index.html` is the real Vite entry, so Rollup emits
// `dist/index.html` natively — no rename shim. Cloudflare builds `dist/` on its
// side and serves the site root from `dist/index.html` (wrangler
// `assets.directory: "./dist"`). The old single-file game is preserved as
// `legacy-game.html` (repo root, NOT built into dist/) as a rollback until it's
// deleted in the final cleanup commit.
export default defineConfig({
  root: projectRoot,
  // Everything under public/ is copied verbatim to dist/ (keeps /Images/N.jpg paths stable).
  publicDir: fromRoot('public'),
  build: {
    outDir: fromRoot('dist'),
    emptyOutDir: true,
    rollupOptions: { input: fromRoot('index.html') },
  },
  server: { open: '/' },
});
