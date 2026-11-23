/**
 * Chapter 2–3 screens: the family meeting, morning lessons (nest, flight, fire, letter,
 * favorites), afternoon tasks (clues, Evidence Board, map, farewells) and evening story
 * moments (Crane at the door, the hill flight, the choice). Rules live in core/chapters.ts.
 */
import { sfx } from '../audio/sfx';
import { content, dayDef } from '../core/content';
import { boardItems, flightAnswer, inZone } from '../core/chapters';
import type { Action, GameEvent, GameState, TaskState } from '../core/state';

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const A = content.activities;

export interface ChapterHost {
  state: GameState;
  dispatch(a: Action): GameEvent[];
  toast(html: string): void;
  card(html: string, then?: () => void): void;
  openPanel(html: string, opts?: { clear?: boolean }): void;
  closePanel(): void;
  fill(t: string): string;
  speakText(t: string): void;
  askReading(panelId: string, paragraphs: string[], then: () => void): void;
  readPipButton(panelId: string): string;
  bindReadPip(panelId: string): void;
}

export class ChapterScreens {
  private flapTimer = 0;

  constructor(private h: ChapterHost) {}

  private get s() {
    return this.h.state;
  }

  private get name() {
    return esc(this.s.dragon.name);
  }

  private story(paragraphs: string[]) {
    return `<div class="story">${paragraphs.map((p) => `<p>${this.h.fill(p)}</p>`).join('')}</div>`;
  }

  private readButton(paragraphs: string[]) {
    const p = $('#panel [data-x="read"]');
    p?.addEventListener('click', () => this.h.speakText(paragraphs.join(' ').replaceAll('{name}', this.s.dragon.name)));
  }

  private on(sel: string, fn: (b: HTMLButtonElement) => void) {
    $('#panel')
      .querySelectorAll<HTMLButtonElement>(sel)
      .forEach((b) =>
        b.addEventListener('click', () => {
          sfx.unlock();
          fn(b);
        }),
      );
  }

  // ---------- mornings ----------

  /** Called when a Chapter 2–3 morning starts (and on Continue): meeting first, then the lesson. */
  morningStart() {
    const s = this.s;
    if (s.part !== 'morning' || s.phase !== 'care') return;
    const def = dayDef(content, s.day).morning;
    if (def.opening === 'family' && !s.world.familyMeeting) return this.showFamily();
    if (!def.activity || s.activity.done) return;
    const show = { insulation: () => this.showInsulation(), flight: () => this.showFlight('morning'), fire: () => this.showFire(), letter: () => this.showLetter(), favorites: () => this.showFavorites() };
    show[def.activity]();
  }

  private showFamily() {
    const f = A.family;
    const told = this.s.world.circle.includes('parents');
    const paragraphs = told ? f.told : f.notTold;
    this.h.openPanel(`
      <div class="thought-icons" aria-hidden="true">👨‍👩‍👧‍👦🐉</div>
      <h2>${esc(f.title)} <button class="speak" data-x="read" aria-label="Read aloud">🔈</button></h2>
      ${this.story(paragraphs)}
      <p><b>The family's treehouse plan:</b></p>
      <ul class="checklist">${f.rules.map((r) => `<li>🏡 ${this.h.fill(r)}</li>`).join('')}</ul>
      <div class="row">${this.h.readPipButton('family')}<button class="btn big" data-x="go">${esc(told ? f.toldButton : f.notToldButton)}</button></div>`);
    this.readButton([...paragraphs, ...f.rules]);
    this.h.bindReadPip('family');
    this.on('[data-x="go"]', () => {
      sfx.play('trill');
      const evs = this.h.dispatch({ type: 'familyMeeting' });
      const joined = evs.find((e) => e.type === 'family-meeting');
      this.h.closePanel();
      const line = joined?.type === 'family-meeting' && joined.joined.length ? 'The whole family is in the Keeper Circle now! 🤝' : '';
      this.h.card(line || `Everyone agrees. ${this.name} is moving to the treehouse!`, () => this.morningStart());
    });
  }

  private showInsulation() {
    const ins = A.insulation;
    const tested = new Set<string>();
    let note = '';
    const draw = () => {
      const t = this.s.activity;
      const picks = t.picks;
      this.h.openPanel(`
        <h2>🌡️ ${esc(ins.title)}</h2>
        <p>${this.h.fill(ins.intro)}</p>
        <div class="materials">${ins.materials
          .map((m) => {
            const known = tested.has(m.id);
            return `<div class="material ${picks.includes(m.id) ? 'picked' : ''}">
              <div class="mat-top"><span class="emo" aria-hidden="true">${m.emoji}</span> <b>${esc(m.label)}</b></div>
              ${
                known
                  ? `<div class="thermo" aria-label="Warmth ${m.warmth} out of 10"><div style="width:${m.warmth * 10}%"></div></div><p class="sub">${esc(m.note)}${m.dry ? '' : ' 💧'}</p>`
                  : `<button class="btn ghost small" data-test="${m.id}">🌡️ Test it</button>`
              }
              <button class="choice small" data-pick="${m.id}">${picks.includes(m.id) ? '✓ In the nest' : 'Use it'}</button>
            </div>`;
          })
          .join('')}</div>
        ${note ? `<p class="hint">${note}</p>` : ''}
        <div class="row"><button class="btn big" data-x="build" ${picks.length === ins.pick ? '' : 'disabled'}>Build the nest (${picks.length} of ${ins.pick})</button></div>`);
      this.on('[data-test]', (b) => {
        sfx.play('tap');
        tested.add(b.dataset.test!);
        draw();
      });
      this.on('[data-pick]', (b) => {
        sfx.play('tap');
        const before = this.s.activity.picks.length;
        this.h.dispatch({ type: 'pick', id: b.dataset.pick! });
        if (this.s.activity.picks.length === before && !this.s.activity.picks.includes(b.dataset.pick!)) note = `The nest has room for ${ins.pick} materials. Tap one you picked to take it out.`;
        else note = '';
        draw();
      });
      this.on('[data-x="build"]', () => {
        const evs = this.h.dispatch({ type: 'submit' });
        const r = evs.find((e) => e.type === 'submitted');
        if (r?.type !== 'submitted') return;
        if (r.ok) {
          sfx.play('trill');
          this.h.closePanel();
          this.h.card(this.h.fill(ins.success));
          return;
        }
        sfx.play('sniff');
        const why = r.wrong.map((id) => ins.materials.find((m) => m.id === id)!).map((m) => `${m.emoji} <b>${esc(m.label)}</b>: ${esc(m.note)}`);
        for (const w of r.wrong) tested.add(w);
        note = `${this.name} shivers a little. ${why.join(' ')} Test the others to find something warmer and dry.`;
        draw();
      });
    };
    draw();
  }

  /** Flight practice (morning) and the hill flight (evening): tap Flap! when the meter is green. */
  showFlight(slot: 'morning' | 'evening') {
    const f = A.flight;
    const hill = slot === 'evening';
    let question = false;
    let lookAgain = false;
    const wrong = new Set<string>();
    const task = (): TaskState => (hill ? this.s.evening.special : this.s.activity);
    const draw = () => {
      const t = task();
      const max = Math.max(f.maxDistance, ...t.tries);
      const bars = Array.from({ length: f.tries }, (_, i) => {
        const d = t.tries[i];
        return `<div class="bar-col"><div class="bar" style="height:${d === undefined ? 0 : (d / max) * 100}%"></div><span class="bar-num">${d === undefined ? '' : `${d} ft`}</span><span class="bar-lbl">Try ${i + 1}</span></div>`;
      }).join('');
      const done = t.tries.length >= f.tries;
      const ans = flightAnswer(t.tries);
      const choices = [...new Set([ans, ans + 5, Math.max(...t.tries, 0)])].sort((a, b) => a - b);
      this.h.openPanel(`
        <h2>🪽 ${hill ? 'Flight over Larkspur Hill' : esc(f.title)}</h2>
        <p>${hill ? `The warm wind is blowing. BLINK flies lookout, and the Keeper Circle cheers ${this.name} on. Tap <b>Flap!</b> when the meter is in the green zone.` : this.h.fill(f.intro)}</p>
        <div class="flight-wrap">
          <div class="flap-meter" aria-hidden="true"><div class="zone" style="left:${f.zone[0]}%;width:${f.zone[1] - f.zone[0]}%"></div><div class="needle"></div></div>
          <div class="bars" role="img" aria-label="Bar graph of flight distances">${bars}</div>
        </div>
        ${
          !done
            ? `<div class="row"><button class="btn big" data-x="flap">🪽 Flap!</button></div>`
            : hill
              ? ''
              : question
                ? `<p><b>${esc(f.question)}</b></p>
                   ${lookAgain ? `<p class="hint look-again">Look at the graph: best try ${Math.max(...t.tries)} ft − first try ${t.tries[0]} ft = ?</p>` : ''}
                   <div class="row">${choices.map((c) => `<button class="choice ${wrong.has(String(c)) ? 'wrong' : ''}" data-a="${c}" ${wrong.has(String(c)) ? 'disabled' : ''}>${c} feet</button>`).join('')}</div>`
                : `<div class="row"><button class="btn big" data-x="graph">Look at the graph ➜</button></div>`
        }`);
      this.animateMeter();
      this.on('[data-x="flap"]', () => {
        const power = this.power();
        const evs = this.h.dispatch({ type: 'flap', power });
        const r = evs.find((e) => e.type === 'flapped');
        if (r?.type === 'flapped') {
          sfx.play(r.inZone ? 'trill' : 'chirp');
          this.h.toast(r.inZone ? `Whoosh! A strong flap: ${r.distance} feet!` : power > f.zone[1] ? `Too hard! ${this.name} wobbles and lands after ${r.distance} feet.` : `A small flap: ${r.distance} feet. Try for the green zone!`);
        }
        if (hill && task().done) {
          this.stopMeter();
          this.h.closePanel();
          this.h.card(`${this.name} soars over Larkspur Hill, higher than ever, then glides back to the treehouse. Everyone cheers!`);
          return;
        }
        draw();
      });
      this.on('[data-x="graph"]', () => {
        question = true;
        draw();
      });
      this.on('[data-a]', (b) => {
        const evs = this.h.dispatch({ type: 'answer', qid: 'graph', value: b.dataset.a! });
        const r = evs.find((e) => e.type === 'answered');
        if (r?.type === 'answered' && r.correct) {
          sfx.play('sparkle');
          this.stopMeter();
          this.h.closePanel();
          this.h.card(`Right: ${Math.max(...task().tries)} − ${task().tries[0]} = ${ans} feet. ${this.h.fill(f.after)}`);
        } else {
          sfx.play('sniff');
          wrong.add(b.dataset.a!);
          lookAgain = true;
          draw();
        }
      });
    };
    draw();
  }

  private meterStart = 0;

  /** The needle sweeps slowly back and forth (slower with reduced motion). */
  private power(): number {
    const period = matchMedia('(prefers-reduced-motion: reduce)').matches ? 4200 : 2800;
    const ph = ((performance.now() - this.meterStart) % period) / period;
    return Math.round(100 * (ph < 0.5 ? ph * 2 : 2 - ph * 2));
  }

  private animateMeter() {
    if (!this.meterStart) this.meterStart = performance.now();
    cancelAnimationFrame(this.flapTimer);
    const tick = () => {
      const n = document.querySelector<HTMLElement>('#panel .needle');
      if (!n) return;
      const p = this.power();
      n.style.left = `${p}%`;
      n.classList.toggle('in', inZone(p, content));
      this.flapTimer = requestAnimationFrame(tick);
    };
    this.flapTimer = requestAnimationFrame(tick);
  }

  private stopMeter() {
    cancelAnimationFrame(this.flapTimer);
    this.meterStart = 0;
  }

  private showFire() {
    const fire = A.fire;
    const tried: Record<string, Set<string>> = {};
    let said = '';
    const draw = () => {
      const t = this.s.activity;
      const sc = fire.scenarios.find((x) => !t.correct.includes(x.id));
      if (!sc) return;
      const no = tried[sc.id] ?? new Set();
      this.h.openPanel(`
        <h2>🔥 ${esc(fire.title)}</h2>
        <p>${this.h.fill(fire.intro)}</p>
        <div class="abilities">${fire.abilities.map((ab) => `<div class="ability"><span class="emo" aria-hidden="true">${ab.emoji}</span><b>${esc(ab.label)}</b><span class="sub">${esc(ab.about)}</span></div>`).join('')}</div>
        ${said ? `<p class="hint">${said}</p>` : ''}
        <p class="riddle">Job ${t.correct.length + 1} of ${fire.scenarios.length}: ${esc(sc.job)}</p>
        <div class="row">${fire.abilities.map((ab) => `<button class="choice ${no.has(ab.id) ? 'wrong' : ''}" data-f="${ab.id}" ${no.has(ab.id) ? 'disabled' : ''}>${ab.emoji} ${esc(ab.label)}</button>`).join('')}</div>
        <p class="sub">🧯 Only ${this.name} makes fire, outdoors on the stone slab, with Aunt June right there.</p>`);
      this.on('[data-f]', (b) => {
        const evs = this.h.dispatch({ type: 'answer', qid: sc.id, value: b.dataset.f! });
        const r = evs.find((e) => e.type === 'answered');
        if (r?.type === 'answered' && r.correct) {
          sfx.play('sparkle');
          said = `✅ ${esc(sc.why)}`;
          if (this.s.activity.done) {
            this.h.closePanel();
            this.h.card(`${esc(sc.why)}<br/><br/>${this.h.fill(fire.after)}`);
            return;
          }
        } else {
          sfx.play('sniff');
          (tried[sc.id] ??= new Set()).add(b.dataset.f!);
          const ab = fire.abilities.find((x) => x.id === b.dataset.f)!;
          said = `Hmm. ${esc(ab.label)} is ${esc(ab.about)}. Is that the safest, best fit for this job?`;
        }
        draw();
      });
    };
    draw();
  }

  private showLetter() {
    const l = A.letter;
    this.h.openPanel(`
      <div class="thought-icons" aria-hidden="true">✉️🐉</div>
      <h2>${esc(l.title)} <button class="speak" data-x="read" aria-label="Read aloud">🔈</button></h2>
      <div class="letter">${this.story(l.paragraphs)}</div>
      <div class="row">${this.h.readPipButton('letter')}<button class="btn big" data-x="go">Fold up the letter</button></div>`);
    this.readButton(l.paragraphs);
    this.h.bindReadPip('letter');
    this.on('[data-x="go"]', () => {
      sfx.play('tap');
      this.h.askReading('letter', l.paragraphs, () => {
        this.h.dispatch({ type: 'activityDone' });
        this.h.closePanel();
        this.h.card(`Aunt June smiles. "Whatever ${this.name} needs, we'll figure it out together."`);
      });
    });
  }

  private showFavorites() {
    const fav = A.favorites;
    const draw = () => {
      const picks = this.s.activity.picks;
      const all = fav.groups.every((g) => picks.some((p) => p.startsWith(`${g.id}:`)));
      this.h.openPanel(`
        <h2>💛 ${esc(fav.title)}</h2>
        <p>${this.h.fill(fav.intro)}</p>
        ${fav.groups
          .map(
            (g) => `<p><b>${esc(g.label)}</b></p><div class="row">${g.options
              .map((o) => `<button class="choice ${picks.includes(`${g.id}:${o}`) ? 'picked' : ''}" data-fav="${esc(`${g.id}:${o}`)}">${esc(o)}</button>`)
              .join('')}</div>`,
          )
          .join('')}
        <p class="sub">There are no wrong answers: pick what you think ${this.name} would love.</p>
        <div class="row"><button class="btn big" data-x="go" ${all ? '' : 'disabled'}>A perfect morning ➜</button></div>`);
      this.on('[data-fav]', (b) => {
        sfx.play('tap');
        this.h.dispatch({ type: 'pick', id: b.dataset.fav! });
        draw();
      });
      this.on('[data-x="go"]', () => {
        this.h.dispatch({ type: 'activityDone' });
        sfx.play('purr');
        this.h.closePanel();
        this.h.card(`${this.name} purrs so loudly the treehouse hums. Now get it ready for the day!`);
      });
    };
    draw();
  }

  // ---------- afternoons ----------

  /** Afternoon tasks happen at home or in the neighborhood, with the scene behind them. */
  afternoonStart() {
    const a = dayDef(content, this.s.day).afternoon;
    if (this.s.part === 'morning') this.h.dispatch({ type: 'startAfternoon' });
    if (this.s.part !== 'afternoon') return;
    if (this.s.task.done) return this.headHome();
    if (a.kind === 'clues') this.showClues(a.set, 'afternoon');
    else if (a.kind === 'board') this.showBoard();
    else if (a.kind === 'map') this.showMap();
    else if (a.kind === 'farewell') this.showFarewell();
  }

  private headHome(text = '') {
    this.h.openPanel(`
      ${text ? `<p>${text}</p>` : ''}
      <p>Time to head home for the evening.</p>
      <div class="row"><button class="btn big" data-x="home">Head home 🌙</button></div>`);
    this.on('[data-x="home"]', () => {
      this.h.closePanel();
      this.h.dispatch({ type: 'startEvening' });
    });
  }

  private picture(kind: string) {
    if (kind === 'poster')
      return `<div class="poster" aria-label="The poster">
        <div class="poster-title">LOST LIZARD?</div>
        <div class="poster-logo" aria-hidden="true">🦎<span class="glass"></span></div>
        <div>Larkspur Wildlife Rescue</div>
        <div class="poster-hand">We collect unusual animals!</div>
        <div><b>REWARD</b></div>
        <div class="poster-url">larkspurwildliferescue.keep</div></div>`;
    return `<div class="door-scene" aria-label="Silas Crane at the front door">
      <div class="crane-fig" aria-hidden="true">🎩<br/>🧥<br/>👢</div>
      <div class="crane-items"><span>📟 remote in pocket</span><span>💳 business card</span><span>☂️ umbrella</span></div></div>`;
  }

  /** Spot the clues: wrong taps are explained and cost nothing, but only real clues count. */
  showClues(set: string, slot: 'afternoon' | 'evening') {
    const cs = A.clues[set];
    let said = '';
    const draw = () => {
      const t = slot === 'evening' ? this.s.evening.special : this.s.task;
      const real = cs.items.filter((i) => i.real).length;
      this.h.openPanel(`
        <h2>🔍 ${esc(cs.title)}</h2>
        <p>${this.h.fill(cs.intro)}</p>
        <div class="clue-wrap">${this.picture(cs.picture)}
          <div class="col">${cs.items
            .map((i) => {
              const ok = t.picks.includes(i.id);
              const no = t.wrong.includes(i.id);
              return `<button class="choice clue ${ok ? 'picked' : ''} ${no ? 'wrong' : ''}" data-clue="${i.id}" ${ok || no ? 'disabled' : ''}>${ok ? '✅ ' : no ? '✖ ' : ''}${esc(i.label)}</button>`;
            })
            .join('')}</div></div>
        ${said ? `<p class="hint">${said}</p>` : ''}
        <p class="sub">Clues found: ${t.picks.length} of ${real}</p>`);
      this.on('[data-clue]', (b) => {
        const item = cs.items.find((i) => i.id === b.dataset.clue)!;
        this.h.dispatch({ type: 'pick', id: item.id });
        sfx.play(item.real ? 'sparkle' : 'tap');
        said = item.real ? `🔍 Good eye! ${esc(item.why)}` : `Hmm, not a clue. ${esc(item.why)}`;
        const done = (slot === 'evening' ? this.s.evening.special : this.s.task).done;
        if (done) {
          this.h.closePanel();
          const text = `${said}<br/><br/>${this.h.fill(cs.done)}`;
          if (slot === 'afternoon') this.headHome(text);
          else this.h.card(text);
          return;
        }
        draw();
      });
    };
    draw();
  }

  private showBoard() {
    const ev = A.evidence;
    let said = '';
    const draw = () => {
      const t = this.s.task;
      const items = boardItems(this.s, content);
      this.h.openPanel(`
        <h2>📌 The Evidence Board</h2>
        <p>${this.h.fill(ev.boardIntro)}</p>
        <div class="board">${items
          .map((e) => {
            const on = t.picks.includes(e.id);
            const ruledOut = t.wrong.includes(e.id);
            return `<button class="evidence ${on ? 'picked' : ''} ${ruledOut ? 'wrong' : ''}" data-ev="${e.id}" ${ruledOut ? 'disabled' : ''}>
              ${on ? '📌 ' : ''}${esc(e.label)}${t.juneFilled.includes(e.id) ? `<span class="sub"> · 👵 ${esc(ev.juneFills)}</span>` : ''}</button>`;
          })
          .join('')}</div>
        ${said ? `<p class="hint">${said}</p>` : ''}
        <div class="row"><button class="btn big" data-x="go" ${t.picks.length === ev.pick ? '' : 'disabled'}>Take these to the meeting (${t.picks.length} of ${ev.pick})</button></div>`);
      this.on('[data-ev]', (b) => {
        sfx.play('tap');
        const before = this.s.task.picks.length;
        this.h.dispatch({ type: 'pick', id: b.dataset.ev! });
        said = this.s.task.picks.length === before && !this.s.task.picks.includes(b.dataset.ev!) ? `You can take ${ev.pick}. Tap a pinned one to unpin it.` : '';
        draw();
      });
      this.on('[data-x="go"]', () => {
        const evs = this.h.dispatch({ type: 'submit' });
        const r = evs.find((e) => e.type === 'submitted');
        if (r?.type !== 'submitted') return;
        if (r.ok) return this.showMeeting();
        sfx.play('sniff');
        said = r.wrong.map((id) => ev.items.find((e) => e.id === id)!).map((e) => `<b>"${esc(e.label)}"</b>: ${esc(e.why ?? '')}`).join('<br/>') + '<br/>Pick another fact that others can check.';
        draw();
      });
    };
    draw();
  }

  private showMeeting() {
    const ev = A.evidence;
    sfx.play('trill');
    this.h.openPanel(`
      <div class="thought-icons" aria-hidden="true">🏛️📌</div>
      <h2>The neighborhood meeting <button class="speak" data-x="read" aria-label="Read aloud">🔈</button></h2>
      ${this.story(ev.meeting)}
      <div class="row">${this.h.readPipButton('meeting')}<button class="btn big" data-x="go">And then... ➜</button></div>`);
    this.readButton(ev.meeting);
    this.h.bindReadPip('meeting');
    this.on('[data-x="go"]', () => this.headHome(this.h.fill(ev.exit)));
  }

  private showMap() {
    const m = A.map;
    let said = '';
    const wrong = new Set<string>();
    const draw = () => {
      const t = this.s.task;
      const q = m.questions.find((x) => !t.correct.includes(x.id));
      if (!q) return;
      const cells = Array.from({ length: m.rows * m.cols }, (_, i) => {
        const x = i % m.cols;
        const y = Math.floor(i / m.cols);
        const home = x === m.home[0] && y === m.home[1];
        const lakes = x === m.lakes[0] && y === m.lakes[1];
        return `<div class="cell">${home ? '🏠' : lakes ? '🏔️' : ''}</div>`;
      }).join('');
      this.h.openPanel(`
        <h2>🗺️ ${esc(m.title)}</h2>
        <p>${this.h.fill(m.intro)}</p>
        <div class="map-wrap">
          <div class="map" style="grid-template-columns:repeat(${m.cols},1fr);grid-template-rows:repeat(${m.rows},1fr)" role="img" aria-label="A map: home is near the bottom left, the high lakes are up and to the right">${cells}</div>
          <div class="compass" aria-hidden="true">N<br/>W ✛ E<br/>S</div>
        </div>
        <p class="sub">🏠 Larkspur Lane · 🏔️ The high lakes · each square is 10 miles</p>
        ${said ? `<p class="hint">${said}</p>` : ''}
        <p class="riddle">${this.h.fill(q.question)}</p>
        <div class="row">${q.choices.map((c) => `<button class="choice ${wrong.has(q.id + c) ? 'wrong' : ''}" data-m="${esc(c)}" ${wrong.has(q.id + c) ? 'disabled' : ''}>${esc(c)}</button>`).join('')}</div>`);
      this.on('[data-m]', (b) => {
        const evs = this.h.dispatch({ type: 'answer', qid: q.id, value: b.dataset.m! });
        const r = evs.find((e) => e.type === 'answered');
        if (r?.type === 'answered' && r.correct) {
          sfx.play('sparkle');
          said = `✅ ${this.h.fill(q.why)}`;
          if (this.s.task.done) {
            this.h.closePanel();
            this.headHome(`${said}<br/><br/>${this.h.fill(m.after)}`);
            return;
          }
        } else {
          sfx.play('sniff');
          wrong.add(q.id + b.dataset.m!);
          // Show the working instead of a penalty (spec §6.5).
          said = `Not quite. Here's how to work it out: ${this.h.fill(q.why)}`;
        }
        draw();
      });
    };
    draw();
  }

  private showFarewell() {
    const f = A.farewell;
    let i = 0;
    const draw = () => {
      const v = f.visits[i];
      this.h.openPanel(`
        <div class="thought-icons" aria-hidden="true">${v.emoji}</div>
        <h2>${esc(f.title)}: ${esc(v.who)}</h2>
        <p>${this.h.fill(v.line)}</p>
        <div class="row"><button class="btn big" data-x="next">${i < f.visits.length - 1 ? 'Next visit ➜' : 'To Larkspur Hill ➜'}</button></div>`);
      this.on('[data-x="next"]', () => {
        sfx.play('tap');
        i += 1;
        if (i < f.visits.length) return draw();
        this.h.dispatch({ type: 'activityDone' });
        this.h.closePanel();
        this.h.dispatch({ type: 'startEvening' });
      });
    };
    draw();
  }

  // ---------- evenings ----------

  special() {
    const sp = this.s.evening.special;
    if (!sp.active) return;
    if (sp.kind === 'crane-door') this.showClues('crane', 'evening');
    else if (sp.kind === 'hill-flight') this.showFlight('evening');
    else if (sp.kind === 'choice') this.showChoice();
  }

  private showChoice() {
    const e = A.ending;
    const paragraphs = [...e.intro, e.parentsLine];
    this.h.openPanel(`
      <div class="thought-icons" aria-hidden="true">🏡💭🐉🐉🐉</div>
      <h2>${esc(e.title)} <button class="speak" data-x="read" aria-label="Read aloud">🔈</button></h2>
      ${this.story(paragraphs)}
      <p><b>What do you and ${this.name} choose, together?</b> <span class="sub">(Both are good choices. Everyone will be happy either way.)</span></p>
      <div class="col">${e.choices.map((c) => `<button class="choice big-choice" data-end="${c.id}">${c.id === 'stay' ? '🏡' : '🌄'} ${esc(c.label)}</button>`).join('')}</div>`);
    this.readButton(paragraphs);
    this.on('[data-end]', (b) => {
      const choice = b.dataset.end as 'stay' | 'fly';
      sfx.play('trill');
      this.h.dispatch({ type: 'chooseEnding', choice });
      this.h.closePanel();
      this.h.card(this.h.fill(e.choices.find((c) => c.id === choice)!.result));
    });
  }

  /** After Day 9: the epilogue, with any Bond extras. */
  epilogue(extras: string[], then: () => void) {
    const e = A.ending;
    const c = e.choices.find((x) => x.id === this.s.world.ending) ?? e.choices[0];
    const paragraphs = [c.epilogue, ...extras];
    this.h.openPanel(`
      <div class="thought-icons" aria-hidden="true">${c.id === 'stay' ? '❄️🏡🐉' : '📮🌄🐉'}</div>
      <h2>${c.id === 'stay' ? 'Larkspur Lane’s guardian' : 'See you next summer!'} <button class="speak" data-x="read" aria-label="Read aloud">🔈</button></h2>
      ${this.story(paragraphs)}
      <div class="row">${this.h.readPipButton('epilogue')}<button class="btn big" data-x="go">The end ➜</button></div>`);
    this.readButton(paragraphs);
    this.h.bindReadPip('epilogue');
    this.on('[data-x="go"]', then);
  }
}
