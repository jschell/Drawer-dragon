# Dragon Keeper — Game Spec (v0.4)

> Working title. A cozy creature-care, light-stealth, and detective game for ages 8–11 (grades 3–5), played in the browser on iPad, iPhone, and laptops.

**Status:** Draft spec for the Chapter 1 vertical slice (Days 1–3).
**Built so far:** all of Chapter 1 (Days 1–3) is playable. Differences from the script in §6.1:
- Day 2's afternoon is the corner store only. The library visit moved to Days 1 and 3.
- On Day 3 the slipper is owned up to Kit directly, and Kit's discovery always offers "Show Kit the dragon" first (§5.4).
- The pantry plan board is not built yet; Day 2's shopping list covers three days of food instead.
**Changes since v0.1 brief:** device targets set; secrecy reframed so lying is not a mechanic; original names throughout; meters cut from six to five, with at most three on screen at once.
**Changes in v0.3:** two-parent household fixed; generated art; generated voice optional with text first; length set at 3 chapters × 3 days; parents can join early; classroom mode deferred (see §12).
**Changes in v0.4:** Chapter 2–3 outline (expose the collector, then the dragon's choice); voice pipeline (pre-generated lines with device-voice fallback, §9.4).

**Scope:** 3 chapters × 3 days each (9 days, roughly 1.5–2 hours total). Chapter 1 is the vertical slice.

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
Inspired by the "kid raises a dragon at home" premise. All characters, names, places, websites, and phrases are original to this project. Do not use names, characters, or terms from *The Dragon in the Sock Drawer* or any other existing work.

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
| **The Keeper** (player-named) | Player character, age ~10 | The player picks an avatar and a nickname from a list. There is no free-text entry anywhere in the game (the same rule as dragon names, §10.4). |
| **The dragon** (player-named, default "Sprocket") | Hatchling | Communicates in feelings, pictures, and very short riddles. Shy, curious, easily startled, loves warm socks. |
| **Great-Aunt June Hollis** | Mentor, trusted adult | Lives next door. Retired science teacher. Kept a dragon herself as a girl, and her old notebook becomes the player's **Field Journal**. Meets the dragon on the afternoon of Day 1 and explains why Crane is a danger. |
| **Mom & Dad** | Family (two-parent household, fixed) | Busy, kind, observant. Join the Keeper Circle together, in Chapter 2 by default or earlier if the player tells them (§5.4). |
| **Kit** (younger sibling, age 7) | Family | Nosy and funny. Joins the Keeper Circle on Day 3 (or earlier if the player shows Kit the dragon). Introduced to the player at the start of the Day 1 evening ("Your little sibling, Kit, is seven years old and very curious about everything"), and named with their role whenever they appear. |
| **Silas Crane** | Antagonist | Collector of "Rare and Remarkable Things." Pompous, never scary-violent; he wants the dragon for a display case. |
| **Crane's scouts** | Threats | A "Neighborhood Wildlife Survey" person with a clipboard (fake), and a camera drone named BLINK. BLINK is left behind when Crane leaves (Day 7) and Kit reprograms it as a friendly lookout. |
| **Mr. Patel** | Corner store owner | Friendly. Runs sales, gives change, has opinions about dandelions. |
| **Ms. Ortiz** | Librarian | Helps with search skills. Not in the Circle, just good at her job. |

**Setting:** Larkspur Lane, a small, walkable neighborhood. Locations: Bedroom, Kitchen, Living room, Backyard (with treehouse, unlocked in Chapter 2), Aunt June's porch, Corner store, Larkspur Library (with a community room), Creek path, Larkspur Hill (Chapter 3 flight scenes).

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

**Hunger is shown to players as "Tummy"** (how full the dragon is), so that on every dragon meter more pips means better. Each meter also shows a word (Hungry / Full, Chilly / Just right / Too hot!, Scared / Calm) and a ✓ when it's in the good zone.

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
- **Why it matters (told on Day 1):** Aunt June explains that Crane keeps rare things in glass cases, and a dragon in a glass case can never stretch its wings, grow or fly. His helpers (the BLINK drone, fake "bird counters" with clipboards, and fake websites) are trying to find where dragons live.
- **Wording rule: never call it a "secret."** Child-safety programs teach kids that being asked to keep secrets from family is a warning sign. In everything players see, the dragon is kept *safe* or *out of sight* from strangers, and family can always be told. Two tests enforce this: `tests/wording.test.ts` checks every content and source file, and `e2e/wording.ts` watches everything shown on screen during every browser test (text, short-lived messages, and the labels read-aloud uses). Either one fails the build if the word "secret" appears.
- **Members** each grant a **Help** (a new ability) and a **Rule** (a new constraint that shapes play):

| Member | Joins | Help | Rule |
|---|---|---|---|
| Aunt June | Day 1 evening | Field Journal, charcoal, advice line ("Ask June" hint button) | "The dragon's needs come first, then the fun." |
| Kit | Day 3 | Lookout during evenings (warns of visitors) | "Kit gets to name one of the dragon's tricks." |
| Mom & Dad | Chapter 2 opening (default), or any time the player shows them the dragon, from Day 1 | Bigger grocery budget, the garage | "No fire indoors." In Chapter 1 this means smoke rings by the open window only; from Chapter 2 the nest moves to the treehouse. |

- **Discovery is never a failure.** When a family member is about to notice, the player can:
  - **Tell them now** (they join early, and the player gets an "I trusted my family" journal sticker), or
  - **Wait for the right moment** with Aunt June's help (the planned story beat).
  - Neither choice is ever "wrong," and neither is a lie.
- **A player can always tell family (child-safety rule).** Personal-safety programs teach kids that they can always tell a parent or trusted adult, and that a trusted adult asking is a good moment to tell. So:
  - Every time a family member asks about the dragon, the **first** choice is "Show Mom/Dad/Kit the dragon", on every day, including Day 1. The content schema rejects any family visitor without it.
  - Telling is never penalised: it calms the dragon, earns the "I Trusted My Family" sticker, and that person joins the Keeper Circle. On Day 1 the parents' rule is the gentle Chapter 1 version (smoke rings by the open window only).
  - Family who already know never startle the dragon again; they come in to help.
  - The evening goal is the dragon's **calm** (knocks startle young dragons, like nesting birds), never that nobody noticed. The sticker is "Calm Night", not "Quiet Night".
- **Telling Mom & Dad early.** Besides the evening visits, a "Tell Mom & Dad" option will appear in the Journal from Day 2.
  - It plays a short, warm scene: surprise, a few worried questions, then they say yes, with the rule.
  - It sets the flag `parentsJoined` and the chapter-pinned story still plays. Scenes written around "Mom & Dad don't know yet" get an alternate version, e.g. the Day 2 "set the table" beat becomes "Dad helps you prep the dragon's evening snack."
  - **Chapter 2 opens with two variants:** the planned "telling the parents" scene if they don't know yet, or a "family meeting about the treehouse" if they already do.
  - Parents joining early must never make the game *harder*. Their Help applies immediately, and their Rule is a constraint the content is tuned around.
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
- **Text first.** All dialogue and thoughts are on-screen text that the player reads; that's the default experience.
- **Generated voice (optional):** a read-aloud button on every text panel plays a generated voice (pipeline in §9.4). It's off by default and can be turned on in Settings. It's a support for struggling readers, not a replacement for reading.
- **The dragon never speaks aloud.** Its thoughts play a chirp, trill or hum sound, with the text and icons on screen.

### 5.8 Corner store (Money & budgeting)
- Weekly allowance plus optional chores (help a neighbor, water plants).
- Store items show a price and a **size** (e.g., 3 bags of greens for $2.25 vs 1 bag for $0.85), so the player compares **unit prices**.
- The player **counts out coins and bills** to pay. Mr. Patel gives change, and sometimes makes a mistake on purpose ("Did I get that right?") as a bonus check.
- **Rationing:** a 3-day "pantry plan" board where the player spreads food across days.
- No debt, no real money, no purchases of any kind.

---

### 5.9 Fair play and careful reading
**Rule: the game never rewards mischief, spam-tapping or random guessing.** Care, careful looking and careful reading are what earn rewards. `tests/fairplay.test.ts` pins each of these:
- **Spice tin:** only a correct mix can be fed. A wrong mix stays in the tin with feedback beside the recipe card and up to three "Ask Aunt June" hints. Pepper and chili are refused (they'd make a hatchling sneeze and hiccup), so there's no funny reaction to farm.
- **Fix-Its come from accidents, not mischief:** on Day 1 the first loud noise startles the hatchling into a smoky hiccup that scorches a sock. Cleaning it up is the player's job.
- **No spam rewards:** the blanket's calm bonus comes once a night; "Read to Pip" calms once per panel.
- **No guessing rewards:**
  - "Source Sleuth" counts each page's first trust rating.
  - "Thought Reader" counts thoughts solved without a wrong guess (hints are fine).
  - "Scout Spotter" needs no false alarms at the window (tapping harmless things costs nothing, but isn't rewarded).
  - Sharp Reader stars come only from a right first answer.
- **Honest boundaries are never punished:** "Can I have some quiet time, please?" costs nothing and gets a friendly reply.

**Encouraging reading without forcing it:**
- **Message cards:** feedback that teaches something (why food was refused, what a thought meant, how a visitor answered, scouts spotted or missed) stays on screen until the player taps OK, and the game waits. Passing comments are short pop-ups that stay longer when there's more to read.
- **📜 "What did they say?"** shows the last 10 messages.
- **Sharp Reader:** after some story panels (Aunt June, the library and store intros, the evening intros) the dragon asks one question about what it said (`content/reading.json`). A wrong answer highlights the sentence with the answer, at no cost; a right first answer earns a star. 3 stars give the "Sharp Reader" sticker. The content check fails if an answer isn't actually in its panel.
- **Read to Pip:** a button on story panels. Reading the panel to the dragon calms it (once per panel; in the evening this helps keep it calm). 3 panels give the "Storyteller" sticker.
- **No forced waiting:** buttons are never locked behind timers, which frustrates fast readers and teaches waiting rather than reading.

## 6. Story script

### 6.1 Chapter 1: "Hatchling" (vertical slice, Days 1–3)

#### Day 1: "The Warm Rock"
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

#### Day 2: "Cold Belly"
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

#### Day 3: "The Red Light"
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

### 6.2 Chapter 2: "Bigger Nest" (Days 4–6)
**Arc:** the dragon becomes a **Fledgling**, moves to the treehouse, and learns to fly and control its fire. Crane changes tactics: instead of sneaking, he tries to get the neighborhood to bring him the dragon.
**New this chapter:** Mom & Dad's Help and Rule (if they haven't joined yet, they join in the Day 4 opening), the treehouse scene, the backyard flight area, and a bigger weekly budget.

#### Day 4: "Family Meeting"
- **Opening (two variants, §5.4):**
  - If the parents don't know yet: the planned "telling Mom & Dad" scene, set up by Aunt June.
  - If they already know: a "family meeting about the treehouse" scene.
  - Either way, the family agrees on the Rule ("No fire indoors") and the move.
- **Morning: Care.** **Nest-building puzzle (energy & materials):** the player picks treehouse insulation from wool, straw, foil, newspaper and bubble wrap. They test each with June's thermometer (a reading after "an hour") and pick the warmest dry combination. New diet need: minerals (crushed eggshells for calcium).
- **Afternoon: Explore.** Posters appear on the lane: *"REWARD! Lost exotic lizard. Call Larkspur Wildlife Rescue."* The player looks at the poster closely (no phone number, odd logo, the same handwriting as the fake survey clipboard). A Journal page starts the **Evidence Board**.
- **Evening: Protect.** First night in the treehouse: keep the dragon calm in a new place (it's scared of owls and wind). Light discipline: a lit window shows from the street, so Collector Attention goes up if the lamp is left on.

#### Day 5: "First Flight"
- **Morning: Care.** **Flight practice** in the backyard at dawn, with hops, glides and a landing target. The player records each try's distance on a **bar graph** in the Journal and spots the improvement (data & graphs). The fence and hedge hide the dragon from the street, but a high flight raises Collector Attention.
- **Afternoon: Explore.**
  1. Search Keeper's Commons for "fledgling" + "flying." Then the player finds **`larkspurwildliferescue.keep`**, Crane's fake rescue site.
  2. Check the Nest: the site was made last week, has no address and no staff names, and its "rescued animals" photos are the same image flipped.
  3. **Cross-check:** the library's community directory lists the town's real wildlife rescue at a different name and address. This goes on the Evidence Board.
  4. **Corner store:** food doubles for a Fledgling. **Bulk buying** with Dad's grocery money: is the big bag really cheaper per scoop? One "deal" is a trick (bigger bag, higher unit price).
- **Evening: Protect.** BLINK patrols at night with a searchlight. A **Stepping Stones** moment: the dragon is hungry, the treehouse lamp is on, and Kit has left the gate open. Kit's lookout Help warns of BLINK's path.

#### Day 6: "Fire Control"
- **Morning: Care.**
  - Spark recipe at **2×** with a new ingredient (smoked paprika).
  - Fire-control practice: the dragon learns "glow" (a warm belly light), "puff" (a smoke ring) and "spark" (a tiny flame aimed at June's fireproof stone slab). The player picks the right one for each situation (warming the nest = glow).
  - The player never lights or handles fire; only the dragon does, and only outdoors on the slab.
- **Afternoon: Explore.** Library: Ms. Ortiz helps the player search the **newspaper archive**. They find an old article: *"Crane Curiosities: private collector's display of rare animals closed after complaints."* This is the strongest evidence yet.
- **Evening: Protect.**
  - Crane himself knocks at the door, posing as a "rescue volunteer."
  - The parents answer politely and honestly ("No, thank you, we're not interested"). Crane leaves a business card with the fake rescue's name.
  - The player spots 3 clues during the conversation: muddy treehouse-ladder boots, BLINK's remote in his pocket, the business card matching the poster.
- **Cliffhanger:** that night the dragon sends a new kind of thought: 🏔️ + 🐉🐉🐉 + *"Many wings, far away, calling."* June goes quiet: *"I've seen that one before."*

### 6.3 Chapter 3: "The Call" (Days 7–9)
**Arc:** the Circle exposes Crane (Day 7). Then the dragon feels the pull of its flock and, with the family, chooses where its home is (Day 9). **Every ending is happy.**

#### Day 7: "The Evidence Board"
- **Morning: Care.** Routine care, now quick (players have mastered it). This is a breather with a new trick to teach (Kit's named trick from Day 3).
- **Afternoon: Explore. Evidence puzzle (argument from evidence):**
  1. The player reviews everything on the Evidence Board: the posters, the fake site's Check the Nest results, the directory cross-check, the newspaper article, the business card, the clipboard handwriting.
  2. They choose the **3 strongest pieces** and put them in order. Some pieces are weak ("He has a mean face"), and June gently explains why those don't count.
  3. They present at the **neighborhood meeting** in the library's community room.
  4. The dragon itself stays safely out of sight: the player shows that the "rescue" is fake, without revealing why they care.
- **Evening: Protect.**
  - Neighbors take down the posters, and the real wildlife rescue posts a warning about the fake one.
  - **Comic exit:** Crane's van rattles out of town with an empty display case strapped on top. BLINK, left behind, gets stuck in the treehouse.
  - Kit reprograms it: **BLINK joins as a friendly lookout.** Collector Attention drops to zero for good.

#### Day 8: "Many Wings"
- **Morning: Care.**
  - The dragon is restless and eats more. Its thoughts keep showing mountains and wings.
  - June shares the story of her own dragon: it chose to fly with its flock, and it visited every summer.
  - **Reading:** a longer Journal passage, June's letter from 60 years ago, with inference questions.
- **Afternoon: Explore.** **Migration research:**
  1. Keeper's Commons pages on how "dragons follow warm winds south and gather at the high lakes."
  2. A **map puzzle**: read a grid map with compass directions, plot the flight path, and work out the distance with the map scale.
  3. **Travel rations:** plan and buy food for the journey whichever way the dragon chooses, including rationing over several days.
- **Evening: Protect.** **Endurance flight** at Larkspur Hill at dusk, with BLINK as lookout. It's the biggest flight yet and the dragon's wings are fully grown. A quiet moment: the whole Circle on the hill, watching the dragon circle overhead.

#### Day 9: "Choose Together"
- **Morning: Care.** The last care routine, made special: the player picks the dragon's favorite food, its favorite sock, and its favorite spot.
- **Afternoon: Explore.**
  - The player visits everyone in the Circle and the neighborhood (Mr. Patel, Ms. Ortiz). Each gives a small gift or a memory.
  - **Memory cards montage:** the Journal shows every memory card collected over the 9 days.
- **Evening: The choice.**
  - At sunset on the hill, the dragon sends its final thought: both pictures at once, home and the flock.
  - The player and dragon **choose together**:
    - **Stay on Larkspur Lane:** the dragon becomes the neighborhood's hidden guardian, and the treehouse gets a dragon-sized upgrade. *Epilogue:* the first snow, with the dragon warming the family on the porch.
    - **Fly with the flock:** a big flight scene over the town as the flock arrives. *Epilogue:* a postcard (a memory card) from the high lakes, then next summer, a shape in the sky heading back to Larkspur Lane.
  - **Bond** (hidden, §6.4) only adds extra epilogue moments. It never decides or limits the choice.

### 6.4 Bond (hidden, never shown as a score)
- **Bond** is computed at the end of the game from:
  - how much of the time the dragon was calm;
  - how balanced its diet was;
  - Fix-Its handled by owning up;
  - good privacy choices on trap sites;
  - how many dragon thoughts the player solved (hints count the same as solving alone).
- Bond tiers add **bonus epilogue moments**: the dragon's drawing of the family, a surprise trick, a second postcard, or June's old dragon appearing in the flock.
- Bond **never** unlocks a "good" or "bad" ending, and is never shown as a number, grade or rank.
- An all-hints, all-mistakes playthrough still gets a warm, complete ending.

---

### 6.5 Chapters 2–3 design principles (agreed after the Chapter 1 playtest)
- **The ending is about the dragon's needs, decided together.** On Day 9 the dragon's final thought shows both pictures, home and the flock. Kit, Mom & Dad and Aunt June each say something supportive, and the player chooses. The game never says one choice is better.
  - **Fly with the flock** is a "see you every summer" ending, never a permanent goodbye (gentler for 8-year-olds): a postcard from the high lakes, then a familiar shape landing in the backyard next summer.
  - **Stay on Larkspur Lane** is never a cage: the family builds a proper roost, the dragon flies at dawn from the hill, and it becomes the neighborhood's hidden guardian.
  - This echoes Aunt June's Day 1 line (a dragon in a glass case can never fly): the final choice is the opposite of Crane's.
- **Evidence targets the fake website, not a person.** At the neighborhood meeting the player shows the "rescue" site is fake, and the real wildlife rescue (trusted adults) takes it from there. Weak "evidence" like "he has a mean face" is explained and doesn't count. Crane leaves on his own, a comic exit and not a humiliation, and BLINK is reprogrammed into a friendly lookout.
- **Fire safety:** only the dragon makes fire, outdoors on Aunt June's stone slab, with June there. The player never handles fire.
- **Fair play for every new mechanic (§5.9):** flight practice scores real attempts and doesn't reward crashing; clue spotting costs nothing for a wrong tap but only real clues count; the map and rations puzzles show working instead of penalties; missing evidence is supplied by Aunt June so no one is stuck.
- **Carried-over rules:** no "secret", honest choices only, "show them the dragon" first, Sharp Reader and message cards.

### 6.6 Chapters 2–3 as built (first version)
The first playable version follows §6.2–6.5, with these simplifications to revisit after playtesting:
- **Day 4 nest:** the materials are wool, straw, newspaper, foil and wet leaves (wet leaves show that damp pulls heat away). The two best are the warmest dry ones, so testing with the thermometer always gives the answer.
- **Day 5:** no corner-store visit and no Stepping Stones moment; the afternoon is the fake-rescue research plus the library directory. Flight practice has three tries on a wing meter; the bar-graph question is "best try minus first try".
- **Day 6:** the spice recipe is 2× the usual mix (no smoked paprika yet).
- **Day 7:** the board asks for the 3 strongest pieces (no ordering step). Aunt June adds any strong evidence the player missed. Collector Attention drops to zero for good when Crane leaves.
- **Day 8:** the map puzzle asks direction, distance (10 miles a square) and travel rations (4 days × 2 servings) as multiple choice, with the working shown after a wrong answer. Aunt June's dragon is called **Cinder** (not one of the players' name suggestions).
- **Day 9:** no memory-card montage yet; the farewell visits are short thank-you scenes.
- **Bond** is a count of 8 signs of good care (most mornings ready, most plates balanced, most nights calm, 9+ thoughts understood, owning up, keeping the address private, a Fix-It done, reading to the dragon). 3+ adds the dragon's frost drawing of the Keeper Circle; 6+ adds Cinder's visit to Aunt June.
- **Old saves:** Chapter 1 saves (version 4) are upgraded automatically.

## 7. Learning map (alignment to verify with an educator)

| Pillar | Where in the game | Grade 3–5 standards (indicative) |
|---|---|---|
| Biology & ecology | Egg nest puzzle, diet balance, Field Journal, migration (Ch. 3) | NGSS 3-LS1-1 (life cycles), 4-LS1-1 (structures and function), 5-LS2-1 (food webs, light touch) |
| Energy & materials | Treehouse insulation test (Ch. 2) | NGSS 4-PS3-2 (energy transfer as heat), 3-5-ETS1-3 (fair tests) |
| Kitchen chemistry & scaling | Spice mixing ratios as "parts," batch scaling | CCSS 4.NF.B, 5.NF.B.5 (multiplication as scaling); NGSS 5-PS1-4 (mixing substances) |
| Information literacy & privacy | Keeper's Commons, Check the Nest, trap sites, library catalog, fake rescue site, newspaper archive (Ch. 2) | ISTE Student 1.2 (Digital Citizen), 1.3 (Knowledge Constructor); AASL standards |
| Argument from evidence | Evidence Board and neighborhood meeting (Ch. 3) | CCSS W.4.1 / W.5.1 (opinion supported by reasons and evidence), RI.4.8 / RI.5.8 |
| Data, maps & measurement | Flight practice bar graph (Ch. 2), grid map, compass directions, map scale (Ch. 3) | CCSS 3.MD.B.3 (bar graphs), 5.G.A.1–2 (coordinate grids), 4.MD.A.1–2 (measurement & distance) |
| Money & budgeting | Corner store, unit prices, change, pantry plan, bulk-buying trick (Ch. 2), travel rations (Ch. 3) | CCSS 3.MD.A, 4.MD.A.2 (money word problems), 3.OA / 4.OA multi-step problems |
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

interface DialogueLine {
  id: string;                 // stable id; also the audio file name
  speaker: CharacterId | 'keeper' | 'narrator';
  text: string;               // may contain {dragonName} / {nickname} only if voice: 'dynamic'
  voice: 'pregen' | 'dynamic' | 'none';   // see §9.4
  audio?: { src: string; hash: string; durationMs: number; wordTimingsMs?: number[] };
}

interface BondInputs {        // computed at Day 9; never shown as a number (§6.4)
  calmShare: number; dietBalance: number; ownedUpFixIts: number;
  privacyGoodChoices: number; thoughtsSolved: number;
}

interface Settings {
  readAloud: boolean;         // off by default textSize: 'normal' | 'large'; dyslexiaFont: boolean;
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
  story/chapter1.json      # StoryEvents (chapter2.json, chapter3.json later)
  dialogue/chapter1.json   # dialogue trees of DialogueLine
  voices.json              # speaker → voice casting (§9.4)
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
- **Generated art.** All art is generated as code-drawn SVG/vector shapes in the repo, not hand-drawn. It stays crisp at any size and small to download.
  - The dragon, characters, rooms and props are built from reusable parts (shapes, palettes, poses) so the art is consistent across scenes.
  - No external image-generation services at runtime; everything ships in the bundle.
- Style: warm, cozy picture-book look with soft outlines and a fixed shared palette.
- Dragon expressiveness is the top priority: idle animations, reactions to every action, at least 12 distinct moods.
- Crane is comic, not frightening: a tall hat, a long coat, a fussy mustache. BLINK is round and goofy.

### 9.3 Audio
- Gentle music loop per phase, using Web Audio. A sound for every dragon reaction (chirp, trill, sneeze, hiccup).
- Separate volume sliders. Muted by default on the first visit until the player taps "Sound on."

### 9.4 Voice pipeline
**Approach:** every scripted line is **pre-generated at build time** with an open-source text-to-speech model and shipped as audio files. The device's built-in voices (Web Speech API) are the **fallback** for anything dynamic or not yet generated.

- **Models:** **Kokoro** first choice, **Piper** as the alternative. Both run locally at build time; no cloud service, and no text ever leaves the build machine.
  - Check the licence of **each voice** (not just each model) before shipping.
  - Record the model, voice and licence for every character in `VOICES.md`.
- **Casting** (`content/voices.json`):

  | Speaker | Voice brief |
  |---|---|
  | Aunt June | Older, warm, amused, unhurried |
  | Kit | Young and bright. Use a light, higher adult voice: never clone or imitate a real child. |
  | Mom, Dad | Warm, everyday, distinct from each other |
  | Silas Crane | Pompous and theatrical, comic rather than menacing |
  | Ms. Ortiz, Mr. Patel | Friendly, distinct |
  | Narrator / Journal | Calm and clear |
  | The Keeper | Not voiced (it's the player) |
  | The dragon | Not voiced: sound effects only |

  No voice is cloned from a real person.
- **Writing rule: voiced lines never contain player-chosen names.** June calls the dragon "little one," and the Keeper is "kiddo" or "you."
  - Lines that must use a name are marked `voice: 'dynamic'` and read by the device voice.
  - A content lint warns if more than 5% of a chapter's lines are dynamic.
- **Build step:** `npm run voices`
  1. Reads every `DialogueLine` with `voice: 'pregen'`.
  2. Hashes the text + voice settings, and generates only new or changed lines (cached).
  3. Writes `public/voice/<chapter>/<lineId>.m4a` (AAC mono, about 32 kbps, plays on every target browser) plus a manifest of hashes and durations.
  4. Records word timings where the model provides them.
- **CI check:** fails if a pregen line's text hash doesn't match its audio, so no line can play the wrong words after a script edit.
- **Speed:** default speaking rate 0.9× for young listeners, adjustable in Settings (0.8×–1.1×).
- **Highlighting:** words highlight as they're read when timings exist; otherwise the whole sentence highlights.
- **Download:**
  - Voice packs are about 1.5–3 MB per chapter, assuming about 10 minutes of voiced lines.
  - They're **not** part of the core load budget (§2.2). A chapter's pack downloads and caches only when read-aloud is turned on.
  - If read-aloud is turned on while offline, the device voice is used until the pack downloads.
- **Fallback quality:** if no good device voice exists (common on some Windows PCs), the read-aloud button only plays pre-generated lines and shows dynamic lines as text.

### 9.5 Accessibility
- Optional read-aloud (generated voice, off by default) for all text. Large text and dyslexia-friendly font options.
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
  - It runs **both branches**: parents told early (on each possible day) and parents told in the planned Chapter 2 scene.
  - It reaches **both endings** (Stay and Fly) at every Bond tier, including the all-hints, all-mistakes run.
- **End-to-end tests (Playwright, WebKit + Chromium)** on the iPhone SE, iPad (gen 9), and Desktop 1280×720 presets: load, play the Day 1 tutorial, save and reload, plus a check that the page makes no network requests after load.
- **Real device check** on an iPhone SE 2 and an iPad 9th gen before each milestone.
- **Kid playtests:** 5–8 kids aged 8–11 per milestone, observed. Note where they smile, where they stall, and which hints they use.

### 10.4 Privacy & safety
- No accounts, analytics, ads, in-app purchases, or chat.
- **External links appear in one place only:** the "Find out more" page at the end of the day. It sits behind a grown-up check (a multiplication question) and only links to approved sites (`content/resources.json`, enforced by a test):
  - the Dragon Keepers series by Kate Klimo on Goodreads, credited as the inspiration, with a note that the game isn't made by or connected to the author or publisher;
  - a library finder: a grown-up enters a 5-digit ZIP code (or uses their location) to open a map search for nearby public libraries. The ZIP code is never saved or sent by the game itself; it only goes into the map link the grown-up opens.
- **No typed text from players.** Dragon names (and nicknames) are picked from a curated list (`content/names.json`: simple words, no story characters' names, checked at build time), shown 6 at a time with "More names". The game rules ignore any name not on the list, and saves from older versions that had a typed name fall back to the default name. The only text field in the game is the grown-up's ZIP code on the Find out more page, which is digits only and never shown in the game.
- Names and saves never leave the device.
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
| M4 | **Polish & offline** | Final art and audio for Ch. 1 (including the voice pack), PWA, accessibility audit | WCAG AA check; offline play verified on iOS |
| M5 | **Chapter 2** | Treehouse, flight, fire control, fake rescue, early-telling variants | Autoplay passes both parent branches; playtest |
| M6 | **Chapter 3 & endings** | Evidence Board, migration, both endings, Bond epilogues | Autoplay reaches every ending; playtest; full-game timing 1.5–2 h |

---

## 12. Decisions & deferred items

| # | Question | Decision |
|---|---|---|
| 1 | Household | **Two-parent household, always.** |
| 2 | Art | **Generated art** (code-drawn SVG/vector, §9.2). |
| 3 | Voice | **Generated voice, optional and off by default.** Reading on-screen text is the main experience (§5.7). |
| 4 | Classroom mode | **Deferred.** Not in v1 scope. |
| 5 | Length | **3 chapters × 3 days.** Revisit after the Chapter 1 playtests. |
| 6 | Telling parents early | **Always allowed, from Day 1** (§5.4): the first choice at every family visit. Changed from "from Day 2" after a child-safety review. Both branches are tested (§10.3). |
| 7 | Story arc | **Hybrid:** expose Crane on Day 7, then the dragon and player choose Stay or Fly on Day 9; every ending is happy (§6.2–6.4). |
| 8 | Voice tech | **Pre-generated lines at build time** (Kokoro or Piper) with **device voices as fallback**. The dragon is not voiced (§9.4). |
| 9 | Licence | **MIT** for code and content (`LICENSE`). Third-party voice models and voices keep their own licences, recorded in `VOICES.md`. |

### Still open
- Final Kokoro vs Piper choice and per-voice licence check (do this in M4).
- Detailed dialogue for Chapters 2–3 (write after the M2 playtest; the outline above is the plan).
