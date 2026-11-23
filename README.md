# Dragon Keeper

A cozy creature-care browser game for ages 8–11: raise a baby dragon, learn how to care for it, and keep it safe from a collector who wants it for a glass case. See [`SPEC.md`](SPEC.md) for the full game design.

**▶ Play it:** https://jschell.github.io/Drawer-dragon/ (best on an iPad or iPhone held sideways; tap Share → Add to Home Screen for full screen)

## Status: Chapter 1 is playable (Days 1–3)

Three in-game days, about 30–40 minutes in all. Every part saves automatically, and the dragon's name, the Keeper Circle, Collector Attention, stickers and money carry over between days.

### Day 1: The Warm Rock

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

### Day 2: Cold Belly
- **Morning:** the dragon's belly fire went out overnight, so the spice tin matters.
- **Afternoon: Mr. Patel's corner store.** Shop for three days of food with a $6.00 allowance. A **"Price per serving?"** helper shows the division: the big beef pack is cheaper per serving, and the "SUPER DEAL!" greens bag is actually worse value. The cheapest basket ($5.40) fits the budget; the obvious one doesn't. Pay with a $5 bill and quarters, then **check the change**: Mr. Patel always makes one small mistake.
- **Evening:** new visits and scouts. Family members who already know about the dragon come in to help.

### Day 3: The Red Light
- **Morning:** a growth spurt means a **1½ batch** of the spice mix, with half scoops (3 cinnamon and 1½ ginger). Kit's slipper got chewed: stitch it up, then **own up** to Kit (say sorry, or say sorry and offer to do Kit's chores).
- **Afternoon:** research how to help a hatchling sleep. The copycat site is back, along with Crane's own "WANTED: rare lizards" page. Trusting the right page unlocks a **lullaby** that calms more at night.
- **Evening: Stepping Stones.** A hungry dragon, Kit at the door and BLINK at the window, all at once. Put them in order on three stepping stones and say why. Every order works out; closing the curtains first is quickest. If Kit doesn't know yet, Kit spots the dragon, and "Show Kit the dragon" is the first choice.
- **Cliffhanger:** the dragon outgrows the shoebox. Aunt June suggests a family meeting about the treehouse (or, if the parents don't know yet, offers to come along when you tell them). Then a Chapter 1 summary.

### Reading and fair play (all days)
- Feedback worth reading stays on screen until you tap **OK**, and the game waits. **📜** shows the last 10 messages.
- **Sharp Reader:** after some story panels the dragon asks a question about what it said. A wrong answer highlights where the answer is; a right first answer earns a star.
- **Read to Pip:** reading a story panel to the dragon calms it (once per panel).
- **The spice tin only feeds the right mix**, with Aunt June's hints if you're stuck. The game never rewards mischief, spam-tapping or guessing (see SPEC.md §5.9).

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
