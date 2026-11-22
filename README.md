# Dragon Keeper

A cozy creature-care browser game for ages 8–11: raise a secret baby dragon, learn how to care for it, and protect it from a collector. See [`SPEC.md`](SPEC.md) for the full game design.

**▶ Play it:** https://jschell.github.io/Drawer-dragon/ (best on an iPad or iPhone held sideways; tap Share → Add to Home Screen for full screen)

## Status: Day 1 is playable (milestone M0: all three prototypes)

One full in-game day, about 10–12 minutes. Every part saves automatically.

**☀️ Morning: care** (prototype 1)
1. **Hatch** the egg (tap it 3 times) and **name** your dragon.
2. Get it **ready for the day**: fed, warm and calm.
   - **Food:** drag food onto the dragon (or tap a food, then the dragon). It wants a balanced plate: meat, greens and minerals.
   - **Spice tin:** follow the recipe card's *parts* (2 cinnamon : 1 ginger). A double batch gives it hiccups and scorches a sock (a rub-it-clean Fix-It).
   - **Hum**, **Warm sock** and **petting** calm it down. **Dragon thoughts** are picture riddles; wrong answers only give free hints.

**📚 Afternoon: research** (prototype 2)
- At the library computer, find out how to keep a hatchling calm when someone knocks.
- Build searches from **keyword chips**: one broad word gives too many results, two good ones find the answer.
- **Check the Nest** on each page (*Who made it? When? Why does it exist? Does another source agree?*), then decide whether to trust it.
- Spot the **copycat site** (`keeperscomons.keep`) and the **prize scam**, both of which ask for your street. The player never types real information: the only options are "Share my street", "Ask Aunt June first" or "Close the page".
- **Save the tip** from the trustworthy page to unlock the **blanket** for tonight. You can only save it after deciding to trust the page.

**🌙 Evening: protect** (prototype 3)
- Kit, Mom and Dad stop by. **Footsteps** give a countdown before each knock: dim the lamp, hum and use the blanket so the dragon stays quiet.
- If it squeaks, every reply on offer is **honest**. Telling Kit the secret makes Kit join the **Keeper Circle**.
- **Watch the window:** tap the collector's camera drone **BLINK** and the fake "wildlife surveyor" to close the curtains. A moth or the neighbor's cat are harmless. Missed scouts (and a bright lamp) raise **Collector Attention**.
- The day ends with a summary, a photo of the sleeping dragon, and stickers. There is no fail state anywhere.

Tip for playtesting: add `?speed=4` to the address to run the clock 4× faster (up to 20×).

Everything is generated in code: art (SVG), sound effects (Web Audio) and optional read-aloud (the device's built-in voice). The game makes no network requests and stores its save only in the browser.

## Running it

Needs Node 22.

```sh
npm install
npm run dev        # http://localhost:5173 (also on your local network, for testing on an iPad or iPhone)
npm test           # game logic, content checks, and automated playthroughs of the morning and evening
npm run build      # static site in dist/
npm run e2e        # browser tests (iPhone SE, iPad, desktop); needs Playwright's WebKit and Chromium
```

To try it on an iPad or iPhone, run `npm run dev` and open the "Network" address it prints, on the same Wi-Fi. Or turn on GitHub Pages (Settings → Pages → Source: "GitHub Actions") and merge to `main`; the `pages` workflow publishes it.

## Code layout

| Path | What |
|---|---|
| `src/core/` | Game rules as a pure `step(state, action)` reducer (`day.ts` has the afternoon and evening), content validation, saving |
| `content/` | Foods, spices, recipes, dragon thoughts, the in-game websites and the evening schedule, as JSON checked at build time |
| `src/scenes/` | Phaser scene: bedroom, the layered dragon, animations |
| `src/art/` | Generated SVG art |
| `src/audio/` | Generated sound effects |
| `src/ui/` | HTML overlay: meters, buttons, panels, read-aloud, and the library computer (`research.ts`) |
| `tests/` | Unit tests and the autoplay bot |
| `e2e/` | Playwright browser tests |

## License

[MIT](LICENSE)
