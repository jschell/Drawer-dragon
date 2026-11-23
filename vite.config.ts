import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

/**
 * Offline play: writes `sw.js`, a service worker that stores every file of this build
 * on the device the first time the game loads. After that the game opens with no
 * connection at all (only the grown-ups' Find out more links need the internet).
 * The cache name changes with the build, so each new version replaces the old one.
 */
function offline(): Plugin {
  return {
    name: 'dragon-keeper-offline',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = new Set<string>(['./', './index.html']);
      const hash = createHash('sha256');
      for (const [name, item] of Object.entries(bundle).sort(([a], [b]) => a.localeCompare(b))) {
        files.add(`./${name}`);
        hash.update(name).update(item.type === 'chunk' ? item.code : item.source);
      }
      for (const name of readdirSync('public')) {
        files.add(`./${name}`);
        hash.update(name).update(readFileSync(`public/${name}`));
      }
      const version = hash.digest('hex').slice(0, 12);
      const source = readFileSync('src/sw.js', 'utf8')
        .replace("'__VERSION__'", JSON.stringify(version))
        .replace("['__FILES__']", JSON.stringify([...files]));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [offline()],
  build: {
    target: ['es2022', 'safari16'],
    chunkSizeWarningLimit: 1600,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
} as never);
