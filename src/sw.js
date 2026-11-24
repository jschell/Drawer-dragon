/* Dragon Keeper service worker: lets the game play offline. See `offline()` in vite.config.ts,
 * which fills in the version and the list of files when the game is built. */
const VERSION = '__VERSION__';
const FILES = ['__FILES__'];
const PREFIX = 'dragon-keeper-';
const CACHE = PREFIX + VERSION;

// Store the whole game, then take over straight away. Every file is in one cache per
// version, so a page always gets files from a single, complete build.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES))
      .then(() => self.skipWaiting()),
  );
});

// Remove older versions of the game.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Serve the game from the device. Links that leave the game are never touched.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const navigate = req.mode === 'navigate';
      // ignoreVary: the game's script is requested in CORS mode (it carries an Origin
      // header) and servers mark it "Vary: Origin", which would otherwise miss the copy
      // stored at install. Everything here comes from this site, so that's safe.
      // ignoreSearch on pages: "?speed=4" and similar options still open the stored page.
      const hit = (await cache.match(req, { ignoreSearch: navigate, ignoreVary: true })) || (navigate && (await cache.match('./index.html')));
      if (hit) return hit;
      return fetch(req);
    }),
  );
});
