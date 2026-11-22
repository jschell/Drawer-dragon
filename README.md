# Dragon Keeper

A cozy creature-care browser game for ages 8–11: raise a baby dragon, learn how to care for it, and keep it safe from a collector who wants it for a glass case. See [`SPEC.md`](SPEC.md) for the full game design.

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
- On the way, **Aunt June** explains who Silas Crane is: a collector who keeps rare things in glass cases, where a dragon could never grow or fly. She describes his helpers (a drone, fake bird-counters with clipboards, fake websites) and why the dragon is kept safe from strangers, never from family.
- At the library computer, find out how to keep a hatchling calm when someone knocks.
- Build searches from **keyword chips**: one broad word gives too many results, two good ones find the answer.
- **Check the Nest** on each page (*Who made it? When? Why does it exist? Does another source agree?*), then decide whether to trust it.
- Spot the **copycat site** (`keeperscomons.keep`) and the **prize scam**, both of which ask for your street. The player never types real information: the only options are "Share my street", "Ask Aunt June first" or "Close the page".
- **Save the tip** from the trustworthy page to unlock the **blanket** for tonight. You can only save it after deciding to trust the page.

**🌙 Evening: protect** (prototype 3)
- Kit, Mom and Dad stop by. **Footsteps** give a countdown before each knock, and knocks startle a young dragon: dim the lamp, hum and use the blanket so it stays calm.
- If it squeaks and someone asks, the first choice is always to **show them the dragon**: Kit, Mom or Dad then joins the **Keeper Circle** and helps from then on. Every other reply is honest too. A player can always tell family; the game never penalises it.
- **Watch the window:** tap the collector's camera drone **BLINK** and the fake "wildlife surveyor" to close the curtains. A moth or the neighbor's cat are harmless. Missed scouts (and a bright lamp) raise **Collector Attention**.
- The day ends with a summary, a photo of the sleeping dragon, and stickers. There is no fail state anywhere.

**📖 Find out more** (on the end-of-day summary)
- Credits the *Dragon Keepers* books by Kate Klimo as the inspiration and encourages kids to ask a grown-up to find them at a library.
- **For grown-ups**, behind a simple multiplication check: links to the series on Goodreads, and a library finder that turns a ZIP code (or the device's location) into a map search for public libraries. The ZIP code is not saved. These are the only links out of the game.

Tip for playtesting: add `?speed=4` to the address to run the clock 4× faster (up to 20×).

Everything is generated in code: art (SVG), sound effects (Web Audio) and optional read-aloud (the device's built-in voice). The game itself makes no network requests (the only outside links are on the grown-ups' Find out more page) and stores its save only in the browser.

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

## Writing for players

The dragon is always kept **safe from strangers** (the collector and his helpers), **never hidden from family**, and every dialogue choice is honest. Child-safety programs teach kids that being asked to hide things from family is a warning sign, so the game never frames the dragon that way. The full rule and the word to avoid are in [`SPEC.md`](SPEC.md) §5.4. Tests enforce it on all game text, this README, and everything shown on screen during the browser tests.

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
