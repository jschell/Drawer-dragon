# Dragon Keeper

A cozy creature-care browser game for ages 8–11: raise a secret baby dragon, learn how to care for it, and protect it from a collector. See [`SPEC.md`](SPEC.md) for the full game design.

## Status: Prototype 1 of 3 (milestone M0a): Morning Care

A playable toy of the morning care loop (about 3–5 minutes):

1. **Hatch** the egg (tap it 3 times) and **name** your dragon.
2. Get the dragon **ready for the day**: fed, warm and calm.
   - **Food:** drag food onto the dragon (or tap a food, then tap the dragon). It wants a balanced plate: meat, greens and minerals, and turns away from a third helping of meat.
   - **Spice tin:** follow the recipe card's *parts* (2 cinnamon : 1 ginger). A double batch gives the dragon hiccups and scorches a sock.
   - **Hum** and **Warm sock** calm it down. **Pet** it by rubbing it with your finger. Noises from around the house sometimes startle it.
   - **Dragon thoughts:** tap the thought bubble and work out what the pictures and riddle mean. Wrong answers only give free hints.
   - **Fix-It:** rub the soot off a scorched sock.
3. Tap **Off to school** to see a summary and stickers. You can go at any time; there's no fail state.

Everything is generated in code: art (SVG), sound effects (Web Audio) and optional read-aloud (the device's built-in voice). The game makes no network requests and stores its save only in the browser.

## Running it

Needs Node 22.

```sh
npm install
npm run dev        # http://localhost:5173 (also on your local network, for testing on an iPad or iPhone)
npm test           # game logic, content checks, and 500 automated playthroughs
npm run build      # static site in dist/
npm run e2e        # browser tests (iPhone SE, iPad, desktop); needs Playwright's WebKit and Chromium
```

To try it on an iPad or iPhone, run `npm run dev` and open the "Network" address it prints, on the same Wi-Fi. Or turn on GitHub Pages (Settings → Pages → Source: "GitHub Actions") and merge to `main`; the `pages` workflow publishes it.

## Code layout

| Path | What |
|---|---|
| `src/core/` | Game rules as a pure `step(state, action)` reducer, content validation, saving |
| `content/` | Foods, spices, recipes and dragon thoughts as JSON, checked at build time |
| `src/scenes/` | Phaser scene: bedroom, the layered dragon, animations |
| `src/art/` | Generated SVG art |
| `src/audio/` | Generated sound effects |
| `src/ui/` | HTML overlay: meters, buttons, panels, read-aloud |
| `tests/` | Unit tests and the autoplay bot |
| `e2e/` | Playwright browser tests |

## License

[MIT](LICENSE)
