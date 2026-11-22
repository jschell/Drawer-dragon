# Dragon Keeper — Game Spec (v0.2)

> Working title. A cozy creature-care, light-stealth, and detective game for ages 8–11 (grades 3–5), played in the browser on iPad, iPhone, and laptops.

**Status:** Draft spec for the Chapter 1 vertical slice (Days 1–3).
**Changes since v0.1 brief:** device targets set; secrecy reframed so lying is not a mechanic; original names throughout; meters cut from six to five, with at most three on screen at once.

---

## 1. Pitch

A kid finds a strange, warm, leathery "rock" by the creek. It hatches. It's a dragon: small, hungry, shy, and very much wanted by a collector who sends scouts around town looking for it.

The player keeps the dragon healthy and calm, learns how to care for it from a field journal and an online archive, and protects it from the collector. They don't do it alone: a trusted grown-up is in on it from Day 1, and more of the family joins the **Keeper Circle** as the story goes on.

**The core rule of the fiction:** *We don't lie to the people who love us. We protect the dragon from people who'd hurt it.*

### 1.1 Design pillars
1. **Care is the fun.** Feeding, calming and fueling the dragon should feel good on their own. The dragon reacts to everything the player does.
2. **Learning is the verb.** Every school skill in the game is a tool the player uses to solve a problem. No standalone quizzes.
3. **Getting caught is progress.** When family members discover the dragon, they join the Keeper Circle, bringing help and a new rule. No game over.
4. **Short and kind.** About 10–15 minute days, saves at every phase, no fail screens, no timers that punish slow readers.
5. **Private by design.** No accounts, no analytics, no network calls, no real personal information ever entered.

### 1.2 Originality guardrail
Inspired by the "kid secretly raises a dragon" premise. All characters, names, places, websites, and phrases are original to this project. Do not use names, characters, or terms from *The Dragon in the Sock Drawer* or any other existing work.

---

## 2. Target platforms

| Device | Chip / memory | CSS viewport (landscape) | Notes |
|---|---|---|---|
| iPhone SE (2nd gen) and later | A13 / 3 GB | 667 × 375 | **Smallest screen; it sets the layout floor.** |
| iPad (9th gen) and later | A13 / 3 GB | 1080 × 810 | Primary classroom and home device. |
| Laptop/desktop, Intel Core i5 10th gen or later | Integrated graphics | ≥ 1280 × 720 | Mouse + keyboard. Chrome, Edge, Safari, Firefox (current versions). |

Minimum browser: Safari on iOS/iPadOS 16+. Chromebooks are **not** a target for v1. Revisit if schools ask.

### 2.1 Platform requirements
- **Landscape-first.** In portrait, show a friendly "turn your device sideways" screen with the dragon curled up asleep.
- **Touch-first input.**
  - Every control must be tappable, at least 44 × 44 pt. No hover-only controls.
  - Keyboard shortcuts are an optional extra on desktop.
- **Safe areas:** respect `env(safe-area-inset-*)`.
- **No typing required.**
  - Searches are built from tappable keyword chips; typing is optional.
  - Every text box uses a font size of at least 16px, so iOS doesn't zoom in on it.
  - The on-screen keyboard must never hide the results.
- **Audio** starts after the first tap. The title screen is "Tap to wake the egg."
- **Installable web app** (PWA: manifest + service worker). Fully offline after the first load. Prompt players to "Add to Home Screen" on iOS. Home Screen apps get full screen and aren't subject to Safari wiping their saved data.
- **No vibration** (iOS doesn't support it). No fullscreen API dependence.

### 2.2 Performance budget
- First load ≤ 3 MB compressed; each chapter's assets ≤ 2 MB more, loaded lazily.
- 60 fps on A13 devices in every scene. 30 fps is the hard floor during the busiest stealth scene.
- Cap the rendering resolution (`devicePixelRatio`) at 2.
- Keep the tab under ~300 MB of memory. Safari kills heavy tabs on 3 GB devices.
- Time to interactive: under 3 s on iPad 9th gen over a typical home connection, and under 1 s once cached.

---

## 3. World & characters

| Name | Role | Notes |
|---|---|---|
| **The Keeper** (player-named) | Player character, age ~10 | The player picks an avatar and a nickname. Suggested nicknames come from a list; free text is optional and stays on the device. |
| **The dragon** (player-named, default "Sprocket") | Hatchling | Communicates in feelings, pictures, and very short riddles. Shy, curious, easily startled, loves warm socks. |
| **Great-Aunt June Hollis** | Mentor, trusted adult | Lives next door. Retired science teacher. Kept a dragon herself as a girl, and her old notebook becomes the player's **Field Journal**. In on the secret from the evening of Day 1. |
| **Mom / Dad** (player picks a one- or two-parent household) | Family | Busy, kind, observant. Join the Keeper Circle in Chapter 2. |
| **Kit** (younger sibling, age 7) | Family | Nosy and funny. Joins the Keeper Circle on Day 3. |
| **Silas Crane** | Antagonist | Collector of "Rare and Remarkable Things." Pompous, never scary-violent; he wants the dragon for a display case. |
| **Crane's scouts** | Threats | A "Neighborhood Wildlife Survey" person with a clipboard (fake), and a camera drone named BLINK. |
| **Mr. Patel** | Corner store owner | Friendly. Runs sales, gives change, has opinions about dandelions. |
| **Ms. Ortiz** | Librarian | Helps with search skills. Not in the Circle, just good at her job. |

**Setting:** Larkspur Lane, a small, walkable neighborhood. Locations: Bedroom, Kitchen, Living room, Backyard (with treehouse, unlocked later), Aunt June's porch, Corner store, Larkspur Library, Creek path.

### 3.1 In-game websites
In-game sites use the fictional ending **`.keep`**, so they can never point to a real domain.

| Site | Who runs it | Trustworthy? |
|---|---|---|
| `keeperscommons.keep` | Volunteer archive of dragon care | Yes: dated, sourced, has an "About us" page. |
| `keeperscomons.keep` | Crane (lookalike with a misspelled name) | **Trap.** Asks for your street. |
| `free-dragon-help.keep` | Crane | **Trap.** "ACT NOW!", prize pop-ups. |
| `larkspurlibrary.keep` | Library catalog | Yes. |
| `dragonfacts4u.keep` | Anonymous fan page | Mixed: some true facts, some wrong, no sources. |

---

## 4. Core loop

A **Day** has three **Phases**. The game saves automatically at the start of every phase.

| Phase | Setting | Fun goal (one line) | Meters shown |
|---|---|---|---|
| **Morning: Care** | Bedroom (+ kitchen) | "My dragon is happy because of what I figured out." | Hunger, Spark, Calm |
| **Afternoon: Explore** | Neighborhood, store, library | "I found what I needed and nobody tracked me." | Coins, Collector Attention |
| **Evening: Protect** | Home (visitors over), street | "I kept my dragon calm and spotted the scout." | Calm, Collector Attention |

Each phase takes 3–6 minutes. Each day ends with a **Journal page**: the dragon draws a picture of the day (a little memory card for the collection), and the player gets a tiny growth update.

### 4.1 Meters
All meters run 0–100 internally and are **shown as 5 icon pips** (never a bare number), each with its own icon and shape, so they're readable for color-blind players.

| Meter | Belongs to | Good direction | What raises it | What lowers it | If it maxes out or hits zero |
|---|---|---|---|---|---|
| **Hunger** | Dragon | Low | Time passing, growth spurts | Feeding the right food | At 100: dragon gets grumpy, Calm drains faster, it chews a sock. Never fatal. |
| **Spark** (inner fire) | Dragon | Middle band (40–70) | Spice mix | Time, cold, rain | Too low: shivers, can't digest. Too high: hiccups smoke rings, which start a Fix-It. |
| **Calm** | Dragon | High | Soft voice, nest, petting, routine | Loud noises, vacuums, doorbells, strangers | At 0: the dragon panics and hides somewhere silly, which starts a find-and-soothe moment. |
| **Coins** | Player | — | Weekly allowance, chores (by helping, not hiding) | Buying supplies | Can't overspend; the store just says "not enough." |
| **Collector Attention** | World | Low | Leaving clues online, smoke seen outside, sharing info on trap sites, scout sightings ignored | Good privacy choices, spotting scouts, Aunt June's help | Thresholds trigger story beats (BLINK patrols more), never a loss. |

**No Suspicion Meter and no Panic meter.** Family noticing things is handled by the Keeper Circle (§5.4). Feeling overwhelmed is handled by Stepping Stones (§5.6).

---

## 5. Systems

### 5.1 Creature care (Biology)
- The dragon has a **Growth Stage**: Egg → Hatchling (Ch. 1) → Fledgling (Ch. 2) → Youngling (Ch. 3).
- **Needs per stage** are data-driven (see §8): diet balance (protein / greens / minerals), preferred nest conditions, and its Calm triggers.
- **Field Journal** entries compare animal groups (reptiles, birds, mammals) so the player can *reason about* what the dragon needs:
  - The egg is leathery, like a reptile's, so keep it damp and warm. Bird eggs are hard-shelled and get turned.
  - It has scales and is cold-blooded-ish, so warmth matters.
- **Feeding** is drag-and-drop onto a bowl. The dragon's reaction (happy wiggle / sniff and refuse / sneeze) is the feedback. A balanced plate gives a bonus "happy trill."

### 5.2 Spice mixing (Kitchen chemistry & multiplication as scaling)
- The dragon's Spark comes from a **spice mix** the player builds in a tin from pantry ingredients: cinnamon, black pepper, ginger, paprika, dried chili, and a pinch of charcoal from Aunt June.
- Recipes are **ratios written as "parts"** ("2 parts cinnamon to 1 part ginger").
  - When the dragon grows, the recipe scales up ("double batch," "one and a half batch"), which is multiplication and fractions for grades 4–5.
  - Grade 3 players get a "count the scoops" mode.
- Mixing is drag-scoops-into-tin with a satisfying pour. The tin's color shifts as a visual hint.
- **Safety rule (hard requirement):** the player **never** uses heat, the stove, matches, lighters, or electricity. Fire only ever happens *inside the dragon* and is clearly magical. Too much Spark gives hiccup smoke rings and a scorched sock, never a house fire.

### 5.3 Research: Keeper's Commons & the library (Information literacy)
- **Search bar:** the player builds searches by tapping keyword chips ("hatchling," "food," "cold," "sneezing"); typing is optional. Too-broad searches get noisy results and too-narrow ones get none. The game teaches picking 2–3 good keywords.
- **Results page:** a mix of trustworthy, mixed, and trap sites.
- **Check the Nest:** before using a page, the player can run 4 quick checks. Each one reveals a clue on the page.
  1. **Who** made it? (an About page, or nothing?)
  2. **When** was it updated?
  3. **Why** does it exist? (to help, to sell, to trick?)
  4. **Proof:** does another source agree?
- **Trap sites** use real-world warning signs: misspelled names, urgency, prizes, and requests for location or personal details.
  - The player **never types real personal information.** Trap forms offer *choices only*: "Share my street," "Ask Aunt June first," "Close the page."
  - Sharing raises Collector Attention and triggers a gentle, funny consequence (BLINK hovers by the house that evening).
- **Library terminal:** a catalog search (title / subject / author) leading to physical books in the library scene. It teaches that the library and the web are both sources, each with strengths.

### 5.4 The Keeper Circle (secrecy without lying)
- The dragon is hidden **from Crane and strangers**, never in order to deceive family.
- **Members** each grant a **Help** (a new ability) and a **Rule** (a new constraint that shapes play):

| Member | Joins | Help | Rule |
|---|---|---|---|
| Aunt June | Day 1 evening | Field Journal, charcoal, advice line ("Ask June" hint button) | "The dragon's needs come first, then the fun." |
| Kit | Day 3 | Lookout during evenings (warns of visitors) | "Kit gets to name one of the dragon's tricks." |
| Mom/Dad | Chapter 2 | Bigger grocery budget, the garage | "No fire indoors," so the nest moves to the treehouse. |

- **Discovery is never a failure.** When a family member is about to notice, the player can:
  - **Tell them now** (they join early, and the player gets an "I trusted my family" journal sticker), or
  - **Wait for the right moment** with Aunt June's help (the planned story beat).
  - Neither choice is ever "wrong," and neither is a lie.
- **The player is never asked to make up a false story.** Dialogue options in tense moments are honest: change the subject truthfully, ask for help, or tell them.

### 5.5 Evening protection & Fix-Its (Light stealth & responsibility)
- **Visitor events:** someone is coming down the hall (Kit, a parent, a guest).
  - The player's job is to keep the dragon **calm** before the knock: dim the lamp, tuck it into the sock nest, hum.
  - The "stealth" is about the dragon's comfort, not avoiding being seen.
- **Scout spotting:** look out the window or walk the lane. Tap suspicious details (a clipboard with no survey company name, a drone's red light). Each spot lowers Collector Attention.
- **Fix-It puzzles** replace v0.1's Cover Story puzzles. When the dragon causes a mess (scorched sock, chewed slipper, glitter-ash on the rug):
  - The player cleans it, repairs it, or **owns up and makes amends** (e.g., replaces Kit's sock from their allowance).
  - Fix-Its are small, funny, tactile mini-games: scrub, stitch, sweep.
- **No timer fails.** Visitor events have a generous, adjustable countdown that pauses while text is on screen. If time runs out, the dragon is a bit less calm and the scene continues.

### 5.6 Stepping Stones (Prioritizing when overwhelmed)
- Replaces v0.1's Panic meter and its "Kilimanjaro before Everest" phrase.
- It triggers when **3 or more problems** are active at once (e.g., hungry dragon + Kit at the door + BLINK at the window). The screen softens, the dragon takes a deep breath with the player, and the problems appear as cards.
- The player drags the cards onto **three stepping stones** in the order they'll tackle them.
  - Several orders are valid. The game asks "Why first?" with 2–3 tap-choice reasons ("It's the most urgent," "It's quick," "It makes the others easier").
  - The game then plays out the steps one at a time.
- There is no "wrong order" message. A less ideal order just makes one step slightly harder, and Aunt June comments kindly afterward.
- No lecture text. One line, max: *"One stone at a time."*

### 5.7 Dragon thoughts (Reading comprehension & inference)
- The dragon "speaks" in **thought bubbles**: 1–3 picture icons plus an optional short riddle (≤ 12 words, grade 3 reading level). Examples:
  - 🌧️ + 🥶 + "Cold rain inside my belly" means Spark is low.
  - 👀 + 🪟 + "A red eye that does not blink" means BLINK is outside.
- **Three-step hints:** (1) highlight a word, (2) Field Journal link, (3) Aunt June spells it out. Hints are free; using them earns no penalty.
- **Read-aloud** is available on every text panel, using the device's built-in speech (Web Speech API), with a recorded-voice upgrade later.

### 5.8 Corner store (Money & budgeting)
- Weekly allowance plus optional chores (help a neighbor, water plants).
- Store items show a price and a **size** (e.g., 3 bags of greens for $2.25 vs 1 bag for $0.85), so the player compares **unit prices**.
- The player **counts out coins and bills** to pay. Mr. Patel gives change, and sometimes makes a mistake on purpose ("Did I get that right?") as a bonus check.
- **Rationing:** a 3-day "pantry plan" board where the player spreads food across days.
- No debt, no real money, no purchases of any kind.

---

## 6. Chapter 1 script (vertical slice, Days 1–3)

### Day 1: "The Warm Rock"
- **Prologue (2 min):** Creek path. The player finds a warm, leathery, speckled stone. Tutorial: walk, tap, pick up.
- **Morning: Care**
  1. Bedroom. The "rock" twitches.
  2. **Field Journal puzzle (biology):** three journal pages (Reptile eggs / Bird eggs / Mammals mostly don't lay eggs; the platypus fun fact). The player picks the right nest: damp towel + shoebox + sunny windowsill. Wrong choices give gentle feedback ("It feels dry and sad").
  3. **Hatch!** Big moment. The player names the dragon.
  4. **First feeding:** the dragon sends a thought: 🥩 + 🌿. The player finds ground beef and greens in a lunchbox from the fridge (picked up during the tutorial). Teaches drag-to-bowl.
- **Afternoon: Explore**
  1. Walk to Aunt June's porch to borrow a "warm thing." She asks questions; the player chooses honest answers. She guesses the truth and reveals her **old notebook**. *(The Keeper Circle opens: Aunt June joins.)*
  2. She gives charcoal and the first spice recipe card (*2 cinnamon : 1 ginger*).
- **Evening: Protect**
  1. Tutorial visitor event: Kit knocks to borrow a marker. The player keeps the dragon calm (dim lamp, sock nest).
  2. Journal page. Teaser: a car with "CRANE CURIOSITIES" on the side drives slowly past.

### Day 2: "Cold Belly"
- **Morning: Care**
  1. Dragon thought: 🌧️ + 🥶 + "Cold rain inside my belly." The player infers Spark is low.
  2. **First spice mix** (ratio). Overdoing it gives hiccup smoke rings and a scorched sock, which starts the **first Fix-It** (stitch the sock).
- **Afternoon: Explore**
  1. Library: Ms. Ortiz introduces the catalog. The player finds *Scales & Tails: Reptile Care* (a fictional book).
  2. The library computer shows **Keeper's Commons** for the first time. A chip search teaches keywords ("hatchling" + "sneeze").
  3. **Check the Nest** tutorial on a trustworthy page vs `dragonfacts4u.keep` (mixed).
  4. **Corner store:** first unit-price choice (greens) and counting change. The budget covers 3 days if the player plans well.
- **Evening: Protect**
  1. A parent asks the player to help set the table, so they're out of the room. The player uses a **pantry plan** board to set the dragon up for the evening (food left out, nest warmed).
  2. First **scout spotting** at the window: the clipboard "surveyor."

### Day 3: "The Red Light"
- **Morning: Care**
  1. Growth spurt: the recipe needs **one and a half times** the amounts (scaling).
  2. The dragon chews a slipper, which starts a Fix-It that includes **owning up** to Kit.
- **Afternoon: Explore**
  1. **Trap site puzzle:** a search for "dragon won't sleep" surfaces `keeperscomons.keep`, which offers "free expert help, just share your street!" The player uses Check the Nest to find the clues (misspelling, no About page, urgency).
     - **Close the page**: Collector Attention goes down and the player gets a "Privacy Pro" sticker.
     - **Ask Aunt June first**: she explains the clues, and the outcome is the same.
     - **Share my street**: BLINK patrols the house tonight (harder evening, no loss).
- **Evening: Protect**
  1. **Stepping Stones moment:** the dragon is hungry, Kit is at the door, and BLINK's red light is at the window.
  2. **Kit discovers the dragon.** The player's choices are honest. Kit joins the Circle (Help: lookout; Rule: names a trick).
  3. The player and Kit spot BLINK together and close the curtain. Kit names the dragon's first trick (a smoke ring).
  4. **Chapter cliffhanger:** the dragon has outgrown the shoebox. Aunt June: *"Time to think bigger. And time to talk to your parents."*

---

## 7. Learning map (alignment to verify with an educator)

| Pillar | Where in the game | Grade 3–5 standards (indicative) |
|---|---|---|
| Biology & ecology | Egg nest puzzle, diet balance, Field Journal | NGSS 3-LS1-1 (life cycles), 4-LS1-1 (structures and function), 5-LS2-1 (food webs, light touch) |
| Kitchen chemistry & scaling | Spice mixing ratios as "parts," batch scaling | CCSS 4.NF.B, 5.NF.B.5 (multiplication as scaling); NGSS 5-PS1-4 (mixing substances) |
| Information literacy & privacy | Keeper's Commons, Check the Nest, trap sites, library catalog | ISTE Student 1.2 (Digital Citizen), 1.3 (Knowledge Constructor); AASL standards |
| Money & budgeting | Corner store, unit prices, change, pantry plan | CCSS 3.MD.A, 4.MD.A.2 (money word problems), 3.OA / 4.OA multi-step problems |
| Reading & inference | Dragon thoughts, journal passages, riddles | CCSS RL.3.1 / RL.4.1 / RI.5.1 (refer to text, draw inferences) |
| Social-emotional learning | Stepping Stones, Keeper Circle honesty choices, Fix-It amends | CASEL: self-management, responsible decision-making, relationship skills |

---

## 8. Data models (TypeScript)

All game logic is a **pure state reducer**: `step(state, action) → state`. Rendering only reads the state. This makes saves, tests, and the autoplay bot (§10.3) straightforward.

```ts
type Phase = 'morning' | 'afternoon' | 'evening';
type GrowthStage = 'egg' | 'hatchling' | 'fledgling' | 'youngling';
type Meter = number; // 0..100

interface GameState {
  version: number;           // save-format version for migrations
  day: number;               // 1-based
  phase: Phase;
  sceneId: string;
  player: { nickname: string; avatarId: string; inventory: InventoryItem[]; coins: number /* cents */ };
  dragon: DragonState;
  world: { collectorAttention: Meter; circle: CircleMemberId[]; flags: Record<string, boolean | number> };
  journal: { unlockedEntries: string[]; stickers: string[]; memoryCards: string[] };
  settings: Settings;
}

interface DragonState {
  name: string;
  stage: GrowthStage;
  hunger: Meter;
  spark: Meter;    // healthy band 40..70
  calm: Meter;
  nest: { locationId: string; warmth: Meter; dampness: Meter };
  dietLog: { day: number; protein: number; greens: number; minerals: number }[];
}

interface InventoryItem { itemId: string; qty: number }

interface ItemDef {
  id: string; name: string; icon: string;
  kind: 'food' | 'spice' | 'nest' | 'tool' | 'key';
  nutrition?: { protein: number; greens: number; minerals: number; hunger: number };
  spice?: { sparkPerPart: number };
  price?: { cents: number; packSize: number; unit: string };
}

interface SpiceRecipe {
  id: string; name: string;
  parts: Record<string /* itemId */, number>;   // e.g. { cinnamon: 2, ginger: 1 }
  baseScoops: number;                            // scoops in a 1x batch
  scaleByStage: Record<GrowthStage, number>;     // 1, 1.5, 2, ...
  targetSpark: [number, number];
}

interface DragonThought {
  id: string;
  icons: string[];                  // 1..3
  riddle?: string;                  // <= 12 words
  meaning: string;                  // shown after solve / hint 3
  hints: [string, string, string];  // highlight, journal link, June explains
  answerChoices: { id: string; label: string; correct: boolean }[];
}

interface ArchivePage {
  id: string; site: string;          // e.g. 'keeperscommons.keep'
  title: string; keywords: string[];
  credibility: 'trusted' | 'mixed' | 'trap';
  checks: { who: string; when: string; why: string; proof: string };
  body: string;                       // short markdown, reading-level checked
  unlocksJournalEntry?: string;
  trap?: { prompt: string; choices: { id: 'share' | 'ask' | 'close'; label: string; effects: Effect[] }[] };
}

interface SearchQueryRule { keywords: string[]; results: string[] /* ArchivePage ids, ranked */ }

interface FixItDef {
  id: string; trigger: string; miniGame: 'scrub' | 'stitch' | 'sweep';
  ownUpOption?: { target: CharacterId; costCents?: number; reward: Effect[] };
}

interface SteppingStonesEvent {
  id: string;
  problems: { id: string; label: string; icon: string; resolveSceneId: string }[];
  goodFirsts: string[];               // problem ids that are reasonable to do first
  reasons: { id: string; label: string }[];
}

type CircleMemberId = 'june' | 'kit' | 'parent';
type CharacterId = CircleMemberId | 'crane' | 'surveyor' | 'blink' | 'patel' | 'ortiz';

interface CircleMemberDef { id: CircleMemberId; joinFlag: string; help: Effect[]; rule: RuleDef }

interface RuleDef { id: string; text: string; constraint: { forbidActions?: string[]; requireLocation?: string } }

// Story: events fire from declared preconditions; they never move NPCs directly.
interface StoryEvent {
  id: string;
  when: { day?: number; phase?: Phase; flags?: Record<string, boolean | number>; sceneId?: string };
  effects: Effect[];
  dialogueId?: string;
  once: boolean;
}

// NPC positions come ONLY from schedule tables keyed by (day, phase) + flag overrides.
interface NpcSchedule {
  npcId: CharacterId;
  entries: { day: number | '*'; phase: Phase; sceneId: string; spot: string; ifFlag?: string }[];
}

type Effect =
  | { type: 'meter'; target: 'hunger' | 'spark' | 'calm' | 'collectorAttention'; delta: number }
  | { type: 'coins'; delta: number }
  | { type: 'item'; itemId: string; delta: number }
  | { type: 'flag'; key: string; value: boolean | number }
  | { type: 'journal'; entryId: string }
  | { type: 'sticker'; id: string }
  | { type: 'circleJoin'; member: CircleMemberId }
  | { type: 'goto'; sceneId: string };

interface Settings {
  readAloud: boolean; textSize: 'normal' | 'large'; dyslexiaFont: boolean;
  reducedMotion: boolean; timerMultiplier: 1 | 1.5 | 2 | 0 /* 0 = off */;
  gradeBand: 3 | 4 | 5;   // tunes math difficulty and reading length
  volume: { music: number; sfx: number; voice: number };
}
```

### 8.1 Content files
```
content/
  items.json
  recipes.json
  thoughts.json
  archive/pages.json
  archive/queries.json
  fixits.json
  stepping-stones.json
  circle.json
  schedules.json
  story/chapter1.json      # StoryEvents
  dialogue/chapter1.json   # dialogue trees
  journal.json             # Field Journal entries
```
Content is validated at build time by a schema check (e.g., zod). The build fails on:
- a missing reference;
- a riddle over 12 words;
- an ArchivePage without all four Check the Nest fields;
- any dialogue option tagged `deceptive`. There should be none.

### 8.2 Example content
```json
{
  "id": "spark-low-01",
  "icons": ["rain", "cold"],
  "riddle": "Cold rain inside my belly.",
  "meaning": "My inner fire is low. I need spice!",
  "hints": ["Look at the word 'cold'.", "Field Journal: 'Spark'.", "June: 'Sounds like a chilly tummy. Time for the spice tin!'"],
  "answerChoices": [
    { "id": "spice", "label": "Make a spice mix", "correct": true },
    { "id": "water", "label": "Give water", "correct": false },
    { "id": "blanket", "label": "Add a blanket", "correct": false }
  ]
}
```

---

## 9. UX, art & audio

### 9.1 Layout (667 × 375 floor)
- **Top-left:** up to 3 meter pips for the current phase.
- **Top-right:** Journal, Ask June (hint), Settings.
- **Bottom:** context action bar (up to 4 big buttons).
- **Scenes:** flat isometric rooms, one screen each, with no scrolling on iPhone. The iPad and desktop get more surrounding detail, not more UI.
- **Text panels:** at most 2 lines per bubble on iPhone, each with a read-aloud button.

### 9.2 Art direction
- Warm, cozy picture-book style with soft outlines, drawn as SVG/vector art in the repo so it stays crisp at any size and small to download.
- Dragon expressiveness is the top priority: idle animations, reactions to every action, at least 12 distinct moods.
- Crane is comic, not frightening: a tall hat, a long coat, a fussy mustache. BLINK is round and goofy.

### 9.3 Audio
- Gentle music loop per phase, using Web Audio. A sound for every dragon reaction (chirp, trill, sneeze, hiccup).
- Separate volume sliders. Muted by default on the first visit until the player taps "Sound on."

### 9.4 Accessibility
- Read-aloud for all text. Large text and dyslexia-friendly font options.
- Meters use icon + shape + color. Meets WCAG 2.1 AA contrast. Reduced-motion mode.
- Timers can be lengthened or turned off.
- Every puzzle can be done with taps alone; no drag *required* (tap-to-select, tap-to-place works as an alternative).

---

## 10. Technical architecture

### 10.1 Stack
- **TypeScript + Vite**, building to a static site. Host on GitHub Pages or Cloudflare Pages.
- **Rendering:** PixiJS or Phaser 3 (2D, WebGL with Canvas fallback) for scenes. **DOM overlay** for text-heavy UI: Journal, browser, dialogue, store. DOM gives better text, read-aloud, and accessibility.
- **State:** the pure reducer (§8) plus a tiny event bus to the renderer.
- **Offline:** a service worker precaches the shell and Chapter 1, plus a web-app manifest.
- **No third-party network requests** at runtime. Fonts and assets are bundled.

### 10.2 Saving
- Autosave at every phase start to `localStorage` (IndexedDB if saves grow), with 3 save slots.
- **Save code:** a short, word-based export code (e.g., `ember-sock-maple-42`) that encodes a compressed state, so kids can move between devices or recover after Safari clears data. Shown on the title screen and in Settings.
- Save files are versioned, with migrations.

### 10.3 Testing
- **Unit tests (Vitest)** cover the reducer, meter math, recipe scaling, unit-price math, and change-making.
- **Content validation** at build (§8.1).
- **Autoplay bot:** a headless agent drives the reducer through Days 1–3. It catches dead ends before playtesting does.
  - It runs a *greedy* policy, a *random* policy (1,000 seeds), and a *worst-choices* policy.
  - It asserts each day is always completable, no state is stuck, and meters stay within bounds.
  - It asserts every NPC is where its schedule says.
- **End-to-end tests (Playwright, WebKit + Chromium)** on the iPhone SE, iPad (gen 9), and Desktop 1280×720 presets: load, play the Day 1 tutorial, save and reload, plus a check that the page makes no network requests after load.
- **Real device check** on an iPhone SE 2 and an iPad 9th gen before each milestone.
- **Kid playtests:** 5–8 kids aged 8–11 per milestone, observed. Note where they smile, where they stall, and which hints they use.

### 10.4 Privacy & safety
- No accounts, analytics, ads, in-app purchases, external links, or chat.
- Nicknames and saves never leave the device.
- Trap-site puzzles never collect real data; they only offer choices.
- This is designed to stay well clear of US children's privacy law (COPPA) and school data rules (FERPA). Confirm with counsel before any school distribution.

---

## 11. Milestones

| # | Milestone | Contents | Exit criteria |
|---|---|---|---|
| M0 | **Toy prototypes** (1–2 days each) | (a) Morning care loop with one dragon and 3 meters; (b) Keeper's Commons chip search + Check the Nest; (c) evening calm-the-dragon visitor event | Kids want to replay at least one of them. Pick what to keep. |
| M1 | **Day 1 playable** | Reducer, save, Bedroom + Aunt June scenes, hatch puzzle, first feeding, Circle join | Autoplay bot passes; runs at 60 fps on iPad 9 and iPhone SE 2 |
| M2 | **Days 1–3 vertical slice** | All Chapter 1 systems, placeholder audio | All tests green; 5-kid playtest done |
| M3 | **Fun pass** | Tuning, dragon reactions, surprise-and-delight moments, journal memory cards | Playtesters ask "what happens next?" |
| M4 | **Polish & offline** | Final art and audio for Ch. 1, PWA, accessibility audit | WCAG AA check; offline play verified on iOS |

---

## 12. Open questions
1. One-parent vs two-parent household: player choice (as specced), or fixed?
2. Art: hand-drawn SVG by an artist, or code-generated vector art first and an artist later?
3. Recorded voice acting for the dragon's thoughts and Aunt June, or device speech only for v1?
4. Classroom mode: teacher-facing chapter select and a skills summary page (stored locally)?
5. Chapter count and arc length: 3 chapters × 3 days, or longer?
6. Should "Tell them now" be able to bring a parent into the Circle in Chapter 1, skipping ahead in the story?
