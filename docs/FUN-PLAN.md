# Making Dragon Keeper more fun: plan

**Goal:** more hands-on play and more moments where the dragon surprises you, without losing what the game teaches.

**Kept as is:**
- Reading stays central.
- No failing. No rewards for mischief, spam or guessing (spec §5.9).
- Honest choices only, and "Show … the dragon" always comes first.
- No typing. Offline play.
- Smooth on an iPhone SE.

## What's wrong today

- Most new content is a panel: read, pick an answer, tap OK. It feels like a quiz.
- The morning routine is almost the same on all 9 days.
- The dragon reacts, but it doesn't *play*, and it never learns anything you can show off.
- Nothing is kept or collected except stickers.
- There's no music.

## Stages (in build order)

| # | Stage | What players get | Status |
|---|---|---|---|
| 1 | **Toys and tricks** | A toy basket in the morning: a yarn ball the dragon chases and pounces on. Tricks it learns over the week (Spin, Roll over, Smoke ring) and performs when you tap them, each with its own animation. Kit names the first one. | Built |
| 2 | **Real flight game** | Flight practice and the hill flight become a backyard flying game: tap to flap, fly through rings and dodge nothing scary. How well you fly (rings, steadiness) sets each try's distance on the bar graph, so the graph lesson stays. | Built |
| 3 | **Scrapbook** | The daily photo of the sleeping dragon is kept in a scrapbook (on the device only) with the day's title. Open it from the day summary and the title screen; at the end it shows the whole week. | Built |
| 4 | **Music** | Gentle generated tunes for morning, afternoon and night (Web Audio, nothing to download), with their own on/off button. | Built |
| 5 | **A twist every day** | Each morning starts with a small surprise, such as a new favorite food, the dragon hiding the sock or a visiting butterfly. It comes with a short animation and one line of story. | Built |
| 6 | **Visit your dragon** | After the ending, a free-play mode: the dragon in its home (the treehouse, or visiting next summer) with toys and tricks, no clock and no goals. | Built |
| 7 | **Hands-on lessons** | Drag materials into the nest, tap the clues in a drawn scene, trace the route on the map, drag coins at the store. | Next |
| 8 | **Treehouse decorating** | Earned items (a lantern, bunting, Kit's drawing) to place in the treehouse. | Later |

## Fair play for the new parts

- **Toys:** the first play of the day calms the dragon a lot, and later plays only a little, with a short rest between them. Spamming the toy is never the best way to care.
- **Tricks:** a cheer and a little calm the first time each trick is done each day, then just the animation. Tricks are unlocked by story days, never by tapping.
- **Flight game:**
  - Distance comes from flying well (rings passed, staying steady).
  - Crashing or flapping wildly never goes farther.
  - The sticker still needs a really good flight.
  - There's no game over: each try ends when the dragon lands.
- **Daily twists** are story only. They never change rewards.

## Checks

- Unit tests:
  - toy and trick rules, cooldowns, and that spamming gives no extra reward;
  - flight scoring;
  - twists exist for every day.
- Browser tests:
  - the toy basket, a trick, a flight try, and the scrapbook after Day 1;
  - free play after the ending.
- Phone-size screenshots of each new screen.

## Later ideas (not in this round)

- A new game with a different egg color.
- Seasonal events.
- A sticker book page.
- A gentle "dragon dream" scene at bedtime.
