import { dataUri, foodArt, slipperArt, sockArt } from '../art/svg';
import { sfx } from '../audio/sfx';
import { music } from '../audio/music';
import { archiveFor, chapterFor, content, dayDef, eveningFor, lastDay, type Nutrient, type ThoughtDef } from '../core/content';
import { bondExtras, morningActivityDone } from '../core/chapters';
import { ChapterScreens } from './chapters';
import { toysFor, tricksKnown, tricksLearnedToday, twistFor } from '../core/play';
import { addScrapPage, clearScrapbook, loadScrapbook } from './scrapbook';
import { attentionWord, visitorDef } from '../core/day';
import { classifyMix, isReady, step, TUNING } from '../core/reducer';
import { clearSave, loadPref, savePref, writeSave } from '../core/save';
import { initialState, type Action, type GameEvent, type GameState, type StoneId } from '../core/state';
import type { BedroomScene } from '../scenes/BedroomScene';
import { showFindOutMore } from './findOutMore';
import { ResearchScreen } from './research';
import { money, StoreScreen } from './store';

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const WANTS: Record<Nutrient, string> = { protein: 'meaty', greens: 'leafy and green', minerals: 'crunchy and white' };

export class Hud {
  state: GameState;
  private scene!: BedroomScene;
  private paused = true;
  private held: string | null = null;
  private toastTimer = 0;
  private lastPetToast = 0;
  private readAloud = loadPref('readAloud', false);
  private spiceScoops: Record<string, number> = {};
  private fixitInit = 0;
  private cardQueue: { html: string; then?: () => void }[] = [];
  private cardThen: (() => void) | undefined;
  private cardOpen = false;
  private startleScorch = false;
  private log: string[] = [];
  private research: ResearchScreen;
  private storeScreen: StoreScreen;
  private chapters: ChapterScreens;

  constructor(initial: GameState) {
    this.state = initial;
    sfx.enabled = loadPref('sound', true);
    music.setEnabled(loadPref('music', true));
    this.research = new ResearchScreen(this);
    this.storeScreen = new StoreScreen(this);
    this.chapters = new ChapterScreens(this);
  }

  attach(scene: BedroomScene) {
    this.scene = scene;
    scene.setGameState(this.state);
    this.bindStatic();
    this.render();
    // ?speed=4 runs the clock 4× faster: handy for playtesting and browser tests.
    const speed = Math.min(20, Math.max(1, Number(new URLSearchParams(location.search).get('speed')) || 1));
    setInterval(() => {
      const s = this.state;
      const live = (s.part === 'morning' && s.phase === 'care') || (s.part === 'evening' && !s.evening.over) || s.part === 'free';
      if (!this.paused && !this.cardOpen && !document.hidden && live) this.dispatch({ type: 'tick', dt: 1 });
    }, 1000 / speed);
    window.addEventListener('resize', () => this.placeBubble());
  }

  // ---------- core loop ----------

  dispatch(a: Action): GameEvent[] {
    const r = step(this.state, a);
    this.state = r.state;
    this.scene.setGameState(this.state);
    for (const e of r.events) {
      this.scene.react(e);
      this.onEvent(e);
    }
    this.render();
    writeSave(this.state);
    return r.events;
  }

  /** Tonight's schedule and today's research set. */
  private get ev() {
    return eveningFor(content, this.state.day);
  }

  private get archive() {
    return archiveFor(content, this.state.day);
  }

  private get today() {
    return dayDef(content, this.state.day);
  }

  private get name() {
    return esc(this.state.dragon.name || 'the egg');
  }

  private onEvent(e: GameEvent) {
    const n = this.name;
    switch (e.type) {
      case 'egg-crack':
        sfx.play('crack');
        if (e.taps < 3) this.toast(e.taps === 1 ? 'Crack! Something is moving inside...' : 'Crack, crack! Keep going!');
        break;
      case 'hatched':
        sfx.play('hatch');
        this.toast("It's hatching! A baby dragon!");
        setTimeout(() => this.showNaming(), 1600);
        break;
      case 'named':
        sfx.play('chirp');
        break;
      case 'eat': {
        sfx.play('munch');
        const lines: Record<string, string> = {
          beef: `Chomp! ${n} gobbles up the beef.`,
          greens: 'Crunch, crunch. Leafy greens!',
          eggshell: 'Crunchy! Good for strong bones and scales.',
          apple: 'A sweet, juicy apple slice!',
        };
        this.toast(lines[e.foodId] ?? `${n} eats it up.`);
        break;
      }
      case 'refuse-wants-other': {
        sfx.play('sniff');
        const food = content.foods.find((f) => f.id === e.foodId)?.name.toLowerCase() ?? 'food';
        this.card(`${n} sniffs the ${esc(food)}... and turns away. It wants something <b>${e.wants.map((w) => WANTS[w]).join(' or ')}</b>.`);
        break;
      }
      case 'refuse-full':
        sfx.play('sniff');
        this.card(`${n} is full! Its tummy is round as a ball.`);
        break;
      case 'balanced':
        sfx.play('trill');
        setTimeout(() => this.toast('A balanced breakfast: meat, greens and minerals! 🌟'), 1200);
        break;
      case 'spice': {
        sfx.play('pour');
        const lines = {
          perfect: `Perfect mix! ${n}'s belly glows warm and bright.`,
          'too-much': "Whoa, that's a double batch! Too much fire... hic!",
          'too-little': this.today.morning.recipeScale === 1 ? 'A little warmer, but that mix was too small.' : `A little warmer, but ${n} has grown! Check the recipe card for today's batch size.`,
          'off-ratio': "Hmm, a lumpy mix. Check the recipe card's parts.",
        };
        setTimeout(() => {
          if (e.sneeze) sfx.play('sneeze');
          if (e.hiccup) setTimeout(() => sfx.play('hiccup'), e.sneeze ? 700 : 200);
          if (e.outcome === 'perfect') sfx.play('purr');
        }, 300);
        this.toast((e.sneeze ? 'Pepper! ACHOO! ' : '') + lines[e.outcome]);
        break;
      }
      case 'startle-scorch':
        this.startleScorch = true;
        break;
      case 'scorched':
        setTimeout(() => {
          this.card(
            this.startleScorch
              ? `The noise gave ${n} such a fright that it hiccupped a puff of smoke, and a sock got scorched! It's your job to clean it up: tap the sock on the floor.`
              : 'A hiccup of smoke scorched a sock! It\'s your job to clean it up: tap the sock on the floor.',
          );
          this.startleScorch = false;
        }, 1500);
        break;
      case 'pet':
        if (performance.now() - this.lastPetToast > 6000) {
          this.lastPetToast = performance.now();
          sfx.play('purr');
          this.toast(`${n} leans into your hand and purrs.`);
        }
        break;
      case 'hum':
        sfx.hum();
        this.toast(`${n} sways along to your song.`);
        break;
      case 'sock':
        sfx.play('chirp');
        this.toast(e.first ? 'You tuck a warm sock into the nest. So cozy! It will stay calmer now.' : `You fluff the sock. ${n} snuggles in.`);
        break;
      case 'cooldown':
        this.toast(e.action === 'hum' ? `${n} is still enjoying the last song.` : 'The sock in the nest is still warm and cozy.');
        break;
      case 'startle': {
        sfx.play(e.kind);
        setTimeout(() => sfx.play('startle'), 300);
        const lines = {
          vacuum: `VRRRMMM! Someone's vacuuming downstairs. ${n} jumps!`,
          doorbell: `DING-DONG! The doorbell! ${n} hides behind its wings.`,
          dog: `WOOF WOOF! The neighbor's dog. ${n} is scared.`,
        };
        this.toast(lines[e.kind]);
        break;
      }
      case 'thought':
        sfx.play('chirp');
        this.toast(`${n} is thinking something... tap the bubble!`);
        break;
      case 'thought-solved': {
        sfx.play('sparkle');
        const def = content.thoughts.find((t) => t.id === e.id);
        this.card(`You understood! "${esc(def?.meaning ?? '')}"`);
        this.pulse(e.pulse);
        break;
      }
      case 'fixed':
        sfx.play('sparkle');
        break;
      case 'ready':
        sfx.play('trill');
        setTimeout(() => this.toast(`${n} is fed, warm and calm. Ready for the day! 🎒`), 900);
        break;
      case 'search-results':
        if (e.feedback === 'ok' && e.ids.includes(this.archive.answerPageId) && this.state.research.searches <= 3) sfx.play('sparkle');
        break;
      case 'trap':
        if (e.choice === 'share') sfx.play('startle');
        else sfx.play('sparkle');
        break;
      case 'evening-start':
        this.research.hide();
        this.storeScreen.hide();
        this.showEveningIntro(); // the evening clock waits until the player taps "Let's go"
        break;
      case 'footsteps': {
        sfx.play('steps');
        break;
      }
      case 'knock': {
        sfx.play('knock');
        const v = visitorDef(this.ev, e.visitorId, content)!;
        this.toast(`<b>Knock knock!</b> ${esc(v.name)}: ${esc(v.line)}`);
        if (e.calm) setTimeout(() => this.toast(esc(v.calmLine)), 2600);
        else {
          sfx.play('chirp');
          setTimeout(() => this.showVisitor(v.id), 1500);
        }
        break;
      }
      case 'helper-visit': {
        sfx.play('purr');
        const v = visitorDef(this.ev, e.visitorId, content)!;
        this.toast(esc(v.knownLine));
        break;
      }
      case 'visitor-left':
        if (e.joined) sfx.play('trill');
        break;
      case 'window-thing':
        if (this.state.evening.windowIdx === 0) this.toast('Something is moving outside the window... Tap it if it looks suspicious!');
        break;
      case 'window-gone': {
        const w = this.ev.windowThings.find((x) => x.id === e.thingId)!;
        if (e.missed && w.missLine) this.card(`${esc(w.missLine)} <span class="sub">(Collector Attention went up.)</span>`);
        break;
      }
      case 'spotted': {
        const w = this.ev.windowThings.find((x) => x.id === e.thingId)!;
        sfx.play(e.suspicious ? 'sparkle' : 'tap');
        this.card(e.suspicious ? esc(w.tapLine) : `${esc(w.tapLine)} <span class="sub">No need to close the curtains for that. Look carefully before you tap!</span>`);
        break;
      }
      case 'lamp':
        sfx.play('tap');
        this.toast(e.dim ? `You dim the lamp. ${n} likes the cozy dark.` : 'Lamp on. Bright light can be seen from outside...');
        break;
      case 'blanket':
        if (e.on) {
          sfx.play('purr');
          this.toast(`You drape the blanket over the nest. ${n} snuggles under it.`);
        }
        break;
      case 'own-up-needed':
        setTimeout(() => this.showOwnUp(), 1100);
        break;
      case 'owned-up':
        sfx.play('trill');
        break;
      case 'allowance':
        sfx.play('sparkle');
        break;
      case 'paid':
        sfx.play('trill');
        break;
      case 'stepping-stones':
        sfx.play('startle');
        setTimeout(() => this.showStones(), 500);
        break;
      case 'stones-done': {
        sfx.play('sparkle');
        const ss = content.story.steppingStones;
        const kitNext = this.state.evening.awaiting === 'kit';
        this.card(`${this.fill(ss.firstFeedback[e.order[0]])} ${this.fill(ss.after)}`, kitNext ? () => this.showVisitor('kit') : undefined);
        break;
      }
      case 'toy': {
        const toy = content.play.toys.find((t) => t.id === e.id)!;
        sfx.play(e.first ? 'trill' : 'chirp');
        this.toast(`${toy.emoji} ${this.fill(toy.lines[e.line])}`);
        break;
      }
      case 'toy-rest': {
        const toy = content.play.toys.find((t) => t.id === e.id)!;
        sfx.play('purr');
        this.toast(this.fill(toy.tiredLine));
        break;
      }
      case 'trick': {
        const t = content.play.tricks.find((x) => x.id === e.id)!;
        sfx.play(e.first ? 'sparkle' : 'chirp');
        this.toast(`${t.emoji} ${this.fill(t.line)}`);
        break;
      }
      case 'evening-over':
        setTimeout(() => this.showBedtime(), 1200);
        break;
      case 'special':
        sfx.play(e.kind === 'crane-door' ? 'knock' : 'chirp');
        setTimeout(() => this.chapters.special(), 600);
        break;
      case 'evidence':
        if (this.state.part === 'afternoon' && this.today.afternoon.kind === 'research') this.toast('📌 That goes on your Evidence Board!');
        break;
      default:
        break;
    }
  }

  // ---------- rendering ----------

  render() {
    const s = this.state;
    $('#hud').hidden = s.part === 'afternoon';
    const caring = s.part === 'morning' && s.phase === 'care';
    const evening = s.part === 'evening' && !s.evening.over;
    $('#meters').hidden = !caring && !evening;
    $('#actions').hidden = !caring;
    $('#actions-evening').hidden = !evening;
    $('#actions-free').hidden = s.part !== 'free';
    // The music follows the time of day; it starts once a tap has unlocked audio.
    music.setMood(s.phase === 'egg' && s.part === 'morning' ? null : s.part === 'afternoon' ? 'afternoon' : s.part === 'evening' || s.part === 'end' ? 'night' : 'morning');
    if (!caring) $('#tray').hidden = true;
    if (caring) this.renderMeters();
    if (evening) this.renderEvening();
    else $('#banner').hidden = true;
    $('.act.go').classList.toggle('ready', isReady(s));
    const store = s.part === 'afternoon' && this.today.afternoon.kind === 'store';
    if (s.part === 'afternoon' && this.today.afternoon.kind === 'research') this.research.show();
    else this.research.hide();
    if (store) this.storeScreen.show();
    else this.storeScreen.hide();

    const bubble = $('#bubble');
    const th = s.thought && content.thoughts.find((t) => t.id === s.thought!.id);
    if (th && caring) {
      if (bubble.hidden || bubble.dataset.id !== th.id) {
        bubble.dataset.id = th.id;
        bubble.innerHTML = `${th.icons.join(' ')}<span class="tap">tap to read</span>`;
        bubble.hidden = false;
      }
      this.placeBubble();
    } else {
      bubble.hidden = true;
    }
  }

  private renderEvening() {
    const s = this.state;
    const e = s.evening;
    const quiet = this.ev.calmEnough;
    const a = s.world.collectorAttention;
    const meter = (k: string, emo: string, label: string, value: number, ok: boolean, word: string) => {
      const on = Math.round(value / 20);
      const pips = Array.from({ length: 5 }, (_, i) => `<div class="pip${i < on ? ' on' : ''}"></div>`).join('');
      return `<div class="meter${ok ? ' ok' : ''}" data-k="${k}" aria-label="${label}: ${word}">
        <div class="meter-top"><span class="emo" aria-hidden="true">${emo}</span>${label}<span class="word">${ok ? '✓ ' : ''}${word}</span></div>
        <div class="pips">${pips}</div></div>`;
    };
    $('#meters').innerHTML =
      meter('calm', '🌙', 'Calm', s.dragon.calm, s.dragon.calm >= quiet, s.dragon.calm >= quiet ? 'Calm' : s.dragon.calm < 50 ? 'Nervous' : 'Uneasy') +
      meter('attention', '👁️', 'Collector', a, a < 20, attentionWord(a));

    document.querySelector('[data-eve="hum"] .lbl')!.textContent = s.world.lullabyUnlocked ? 'Lullaby' : 'Hum';
    const lamp = document.querySelector('[data-eve="lamp"] .lbl')!;
    lamp.textContent = e.lampDim ? 'Lamp on' : 'Dim lamp';
    const bl = document.querySelector<HTMLElement>('[data-eve="blanket"]')!;
    bl.classList.toggle('locked', !s.world.blanketUnlocked);
    bl.classList.toggle('selected', e.blanket);
    bl.querySelector('.lbl')!.textContent = s.world.blanketUnlocked ? (e.blanket ? 'Uncover' : 'Blanket') : '🔒 Blanket';
    document.querySelector('[data-eve="lamp"]')!.classList.toggle('selected', e.lampDim);

    const banner = $('#banner');
    if (e.visitor) {
      const v = visitorDef(this.ev, e.visitor!.id, content)!;
      const left = Math.max(0, Math.ceil(e.visitor.knockAt - e.t));
      banner.innerHTML = `👣 Footsteps in the hall... <b>${esc(v.name)}</b> (${esc(v.role)}) is coming! <span class="count">${left}</span>`;
      banner.hidden = false;
    } else banner.hidden = true;
  }

  private renderMeters() {
    const d = this.state.dragon;
    const r = TUNING.ready;
    const tummy = 100 - d.hunger;
    const meters = [
      { k: 'tummy', emo: '🍖', label: 'Tummy', value: tummy, ok: d.hunger <= r.maxHunger, word: d.hunger <= r.maxHunger ? 'Full' : d.hunger > 55 ? 'Hungry' : 'Peckish' },
      {
        k: 'spark',
        emo: '🔥',
        label: 'Spark',
        value: d.spark,
        ok: d.spark >= r.sparkMin && d.spark <= r.sparkMax,
        word: d.spark < r.sparkMin ? 'Chilly' : d.spark > r.sparkMax ? 'Too hot!' : 'Just right',
      },
      { k: 'calm', emo: '🌙', label: 'Calm', value: d.calm, ok: d.calm >= r.minCalm, word: d.calm >= r.minCalm ? 'Calm' : d.calm < 40 ? 'Scared' : 'Uneasy' },
    ];
    $('#meters').innerHTML = meters
      .map((m) => {
        const on = Math.round(m.value / 20);
        const pips = Array.from({ length: 5 }, (_, i) => `<div class="pip${i < on ? ' on' : ''}"></div>`).join('');
        return `<div class="meter${m.ok ? ' ok' : ''}" data-k="${m.k}" aria-label="${m.label}: ${m.word}">
          <div class="meter-top"><span class="emo" aria-hidden="true">${m.emo}</span>${m.label}<span class="word">${m.ok ? '✓ ' : ''}${m.word}</span></div>
          <div class="pips">${pips}${m.k === 'spark' ? '<div class="band"></div>' : ''}</div></div>`;
      })
      .join('');
  }

  private placeBubble() {
    const b = $('#bubble');
    if (b.hidden || !this.scene) return;
    const r = this.scene.dragonClientRect();
    b.style.left = `${r.left + r.width * 0.92}px`;
    b.style.top = `${r.top + r.height * 0.08}px`;
  }

  /** A short, passing comment. It stays longer when there is more to read. */
  toast(html: string) {
    if (!html) return;
    const t = $('#toast');
    t.innerHTML = html;
    t.classList.add('show');
    const text = t.textContent ?? '';
    this.remember(text);
    // About 0.4 s per word for young readers, between 3.5 and 10 seconds.
    const ms = Math.min(10000, Math.max(3500, 1500 + text.split(/\s+/).length * 400));
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => t.classList.remove('show'), ms);
    this.speak(text);
  }

  /**
   * Feedback worth reading (why the dragon refused food, what a thought meant, how a
   * visitor answered): it stays on screen until the player taps OK, and the game waits.
   */
  card(html: string, then?: () => void) {
    if (!html) return;
    this.cardQueue.push({ html, then });
    if (!this.cardOpen) this.nextCard();
  }

  private nextCard() {
    // What follows the card just read (e.g. Kit's discovery) waits until the player taps OK.
    const done = this.cardThen;
    this.cardThen = undefined;
    const next = this.cardQueue.shift();
    const el = $('#msgcard');
    if (next === undefined) {
      el.hidden = true;
      this.cardOpen = false;
      done?.();
      return;
    }
    const { html } = next;
    this.cardThen = next.then;
    if (done) {
      // Run the follow-up first; the rest of the queue waits behind its panel.
      this.cardQueue.unshift(next);
      this.cardThen = undefined;
      el.hidden = true;
      this.cardOpen = false;
      done();
      if (!this.cardOpen) this.nextCard();
      return;
    }
    this.cardOpen = true;
    el.querySelector('.msg-body')!.innerHTML = html;
    el.hidden = !$('#overlay').hidden; // wait while a panel is open
    const text = el.querySelector('.msg-body')!.textContent ?? '';
    this.remember(text);
    this.speak(text);
    (el.querySelector('[data-x="ok"]') as HTMLButtonElement).focus({ preventScroll: true });
  }

  private remember(text: string) {
    const t = text.trim();
    if (!t || this.log[0] === t) return;
    this.log.unshift(t);
    this.log.length = Math.min(this.log.length, 10);
  }

  private showLog() {
    const items = this.log.length ? this.log.map((m) => `<li>${esc(m)}</li>`).join('') : '<li>Nothing yet.</li>';
    this.openPanel(`
      <h2>📜 What did they say?</h2>
      <p class="sub">The most recent messages, newest first.</p>
      <ol class="msglog">${items}</ol>
      <div class="row"><button class="btn" data-x="close">Back to the game</button></div>`);
    $('#panel [data-x="close"]').addEventListener('click', () => this.closePanel());
  }

  private pulse(target: string) {
    const btn = document.querySelector(`.act[data-act="${target}"]`);
    if (!btn) return;
    btn.classList.remove('pulse');
    void (btn as HTMLElement).offsetWidth;
    btn.classList.add('pulse');
    setTimeout(() => btn.classList.remove('pulse'), 6000);
  }

  private speak(text: string) {
    if (!this.readAloud || !('speechSynthesis' in window) || !text) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[^\p{L}\p{N}\p{P}\s]/gu, ''));
      u.rate = 0.9;
      speechSynthesis.speak(u);
    } catch {
      /* read-aloud is optional */
    }
  }

  // ---------- panels ----------

  openPanel(html: string, opts: { clear?: boolean } = {}) {
    $('#panel').innerHTML = html;
    $('#overlay').classList.toggle('clear', !!opts.clear);
    $('#overlay').hidden = false;
    $('#msgcard').hidden = true; // a waiting card never covers a panel; it comes back after
    this.paused = true;
    $('#tray').hidden = true;
    this.setHeld(null);
    document.querySelectorAll('.act.selected').forEach((b) => b.classList.remove('selected'));
  }

  closePanel() {
    $('#overlay').hidden = true;
    $('#panel').innerHTML = '';
    const st = this.state;
    this.paused = !((st.part === 'morning' && st.phase === 'care') || (st.part === 'evening' && !st.evening.over));
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (this.cardOpen) $('#msgcard').hidden = false;
  }

  /** Forget cards left over from an earlier day or game. */
  private clearCards() {
    this.cardQueue = [];
    this.cardThen = undefined;
    this.cardOpen = false;
    $('#msgcard').hidden = true;
  }

  showTitle(hasSave: boolean) {
    this.openPanel(`
      <img class="title-dragon" src="./icon.svg" alt="" />
      <h1>Dragon Keeper</h1>
      <p class="sub">${hasSave && this.state.day > 1 ? `Chapter ${chapterFor(content, this.state.day).n}: ${esc(chapterFor(content, this.state.day).title)} · Day ${this.state.day}` : 'Chapters 1–3 · Days 1–9'}</p>
      <p>You found a warm, speckled stone by the creek...<br/>and now it's wiggling!</p>
      <div class="row">
        ${hasSave ? '<button class="btn big" data-go="continue">Continue</button><button class="btn ghost" data-go="new">New game</button>' : '<button class="btn big" data-go="new">Tap to wake the egg</button>'}
      </div>`);
    $('#panel').querySelectorAll<HTMLButtonElement>('[data-go]').forEach((b) =>
      b.addEventListener('click', () => {
        sfx.unlock();
        sfx.play('tap');
        if (b.dataset.go === 'new') this.newGame();
        else this.closePanel();
        if (this.state.phase === 'egg') this.toast('Tap the egg to help it hatch!');
        if (this.state.phase === 'naming') this.showNaming();
        if (this.state.part === 'morning' && this.state.phase === 'care' && !morningActivityDone(this.state, content)) this.chapters.morningStart();
        if (this.state.part === 'morning' && this.state.phase === 'done') this.startAfternoonFlow();
        if (this.state.part === 'afternoon' && ['clues', 'board', 'map', 'farewell'].includes(this.today.afternoon.kind)) this.chapters.afternoonStart();
        if (this.state.part === 'evening' && this.state.evening.special.active) this.chapters.special();
        if (this.state.ownUpPending) this.showOwnUp();
        if (this.state.part === 'evening' && this.state.evening.stones.active) this.showStones();
        if (this.state.part === 'end') void this.showDaySummary();
        if (this.state.part === 'evening' && this.state.evening.t === 0) this.showEveningIntro();
        if (this.state.part === 'evening' && this.state.evening.awaiting) this.showVisitor(this.state.evening.awaiting);
        if (this.state.part === 'evening' && this.state.evening.over) this.showBedtime();
        this.render();
      }),
    );
  }

  private newGame() {
    clearSave();
    clearScrapbook();
    const fresh = initialState((Date.now() >>> 0) ^ 0x9e3779b9);
    this.state = fresh;
    this.scene.scene.restart(this.scene.bootData);
    this.research.hide();
    this.closePanel();
    this.clearCards();
  }

  private showNaming() {
    if (this.state.phase !== 'naming') return;
    const { names, perPage } = content.names;
    const pages = Math.ceil(names.length / perPage);
    let page = Math.floor(Math.random() * pages); // a fresh set of ideas each new game
    let chosen = '';
    const draw = () => {
      const shown = names.slice(page * perPage, page * perPage + perPage);
      this.openPanel(`
        <h2>Your dragon needs a name!</h2>
        <p class="sub">Pick one you like. Tap "More names" to see others.</p>
        <div class="row name-grid">${shown.map((n) => `<button class="choice ${n === chosen ? 'picked' : ''}" data-name="${n}">${n}</button>`).join('')}</div>
        <div class="row">
          <button class="btn ghost" data-x="prev" aria-label="Previous names">◀</button>
          <span class="sub name-page">${page + 1} of ${pages}</span>
          <button class="btn ghost" data-x="more">More names ▶</button>
        </div>
        <div class="row"><button class="btn big" id="name-ok" ${chosen ? '' : 'disabled'}>${chosen ? `${chosen} it is!` : "That's the name!"}</button></div>`);
      const p = $('#panel');
      p.querySelectorAll<HTMLButtonElement>('[data-name]').forEach((b) =>
        b.addEventListener('click', () => {
          sfx.play('tap');
          chosen = b.dataset.name!;
          draw();
        }),
      );
      const flip = (d: number) => {
        sfx.play('tap');
        page = (page + d + pages) % pages;
        draw();
      };
      p.querySelector('[data-x="prev"]')!.addEventListener('click', () => flip(-1));
      p.querySelector('[data-x="more"]')!.addEventListener('click', () => flip(1));
      $('#name-ok').addEventListener('click', () => {
        if (!chosen) return;
        this.closePanel();
        this.dispatch({ type: 'name', name: chosen });
        this.paused = false;
        this.card(this.fill(this.today.morning.intro));
      });
    };
    draw();
  }

  private showThought() {
    const s = this.state;
    if (!s.thought) return;
    const def = content.thoughts.find((t) => t.id === s.thought!.id) as ThoughtDef;
    const wrong = new Set<string>();
    const draw = () => {
      const th = this.state.thought;
      if (!th) return;
      const hints = def.hints.slice(0, th.hintLevel);
      this.openPanel(`
        <p class="sub">${this.name} sends you a picture in your mind...</p>
        <div class="thought-icons" aria-hidden="true">${def.icons.join(' ')}</div>
        <p class="riddle">"${esc(def.riddle)}" <button class="speak" aria-label="Read aloud">🔈</button></p>
        <p><b>What does ${this.name} need?</b></p>
        <div class="row">${def.answerChoices
          .map((c) => `<button class="choice${wrong.has(c.id) ? ' wrong' : ''}" data-c="${c.id}" ${wrong.has(c.id) ? 'disabled' : ''}>${esc(c.label)}</button>`)
          .join('')}</div>
        ${hints.map((h) => `<p class="hint">💡 ${esc(h)}</p>`).join('')}
        <div class="row">
          ${th.hintLevel < 3 ? '<button class="btn ghost" data-x="hint">💡 Journal hint</button>' : ''}
          <button class="btn ghost" data-x="later">Not now</button>
        </div>`);
      const p = $('#panel');
      p.querySelector('.speak')!.addEventListener('click', () => this.speakForce(`${def.riddle}. What does ${this.state.dragon.name} need?`));
      p.querySelectorAll<HTMLButtonElement>('[data-c]').forEach((b) =>
        b.addEventListener('click', () => {
          const evs = this.dispatch({ type: 'answerThought', choiceId: b.dataset.c! });
          if (evs.some((e) => e.type === 'thought-solved')) {
            this.closePanel();
          } else {
            wrong.add(b.dataset.c!);
            sfx.play('sniff');
            draw();
          }
        }),
      );
      p.querySelector('[data-x="hint"]')?.addEventListener('click', () => {
        this.dispatch({ type: 'hint' });
        sfx.play('tap');
        draw();
      });
      p.querySelector('[data-x="later"]')!.addEventListener('click', () => this.closePanel());
    };
    draw();
  }

  speakText(text: string) {
    this.speakForce(text);
  }

  private speakForce(text: string) {
    const was = this.readAloud;
    this.readAloud = true;
    this.speak(text);
    this.readAloud = was;
  }

  private showSpice() {
    const recipe = content.spiceRecipes[0];
    const scale = this.today.morning.recipeScale;
    const halves = !Number.isInteger(scale);
    const frac = (n: number) => (Number.isInteger(n) ? `${n}` : `${Math.floor(n) || ''}½`);
    this.spiceScoops = {};
    let feedback = ''; // shown inside the tin when a mix isn't right yet
    let hintLevel = 0;
    const total = () => Object.values(this.spiceScoops).reduce((a, b) => a + b, 0);
    const batch = `${frac(scale)}×`;
    const hints = [
      'Look at the <b>parts</b>: for every 2 scoops of cinnamon, add 1 scoop of ginger.',
      scale === 1
        ? 'A 1× batch is 3 scoops in all. 2 parts + 1 part = 3 parts, so each part is 1 scoop.'
        : `A ${batch} batch is ${frac(3 * scale)} scoops in all. Each part is ${frac(scale)} scoops, so use the ½ buttons too!`,
      `Aunt June: "${frac(2 * scale)} scoops of cinnamon and ${frac(scale)} of ginger, dear."`,
    ];
    const draw = () => {
      const scoops = content.spices.flatMap((sp) => {
        const n = this.spiceScoops[sp.id] ?? 0;
        const whole = Array.from({ length: Math.floor(n) }, () => `<div class="scoop" style="background:${sp.color}"></div>`);
        return n % 1 ? [...whole, `<div class="scoop half-scoop" style="background:${sp.color}"></div>`] : whole;
      });
      const tally = content.spices
        .filter((sp) => this.spiceScoops[sp.id])
        .map((sp) => `${sp.name} ${frac(this.spiceScoops[sp.id])}`)
        .join(' · ');
      const today = scale === 1 ? '' : `<br/><b>Today: growth spurt! Make a ${frac(scale)} batch.</b>`;
      $('#panel').innerHTML = `
        <h2>🫙 Spice tin</h2>
        <div class="spice-wrap">
          <div>
            <div class="recipe-card"><b>${esc(recipe.name)}</b><br/>${esc(recipe.card)}${today}<br/><span class="sub">From Aunt June's notebook</span></div>
            <div class="jars" style="margin-top:12px">${content.spices
              .map(
                (sp) =>
                  `<div class="jar-row"><button class="jar" data-sp="${sp.id}"><div class="powder" style="background:${sp.color}"></div>${esc(sp.name)}</button>${
                    halves ? `<button class="half" data-half="${sp.id}" aria-label="Half a scoop of ${esc(sp.name)}">+½</button>` : ''
                  }</div>`,
              )
              .join('')}</div>
          </div>
          <div class="tin">
            <div class="tin-body">${scoops.join('')}</div>
            <div class="tin-count">${frac(total())} scoop${total() === 1 ? '' : 's'}</div>
            <div class="tally">${tally}</div>
          </div>
        </div>
        ${feedback ? `<p class="hint spice-feedback">${feedback}</p>` : ''}
        ${hintLevel ? hints.slice(0, hintLevel).map((h) => `<p class="hint">💡 ${h}</p>`).join('') : ''}
        <div class="row">
          <button class="btn ghost" data-x="empty" ${total() ? '' : 'disabled'}>Empty tin</button>
          <button class="btn" data-x="feed" ${total() ? '' : 'disabled'}>Feed the mix</button>
          ${feedback && hintLevel < hints.length ? '<button class="btn ghost" data-x="hint">💡 Ask Aunt June</button>' : ''}
          <button class="btn ghost" data-x="close">Close</button>
        </div>`;
      const p = $('#panel');
      const add = (id: string, n: number) => {
        if (total() + n > 9) return this.toast('The tin is full!');
        this.spiceScoops[id] = (this.spiceScoops[id] ?? 0) + n;
        sfx.play('pour');
        draw();
      };
      p.querySelectorAll<HTMLButtonElement>('[data-sp]').forEach((b) => b.addEventListener('click', () => add(b.dataset.sp!, 1)));
      p.querySelectorAll<HTMLButtonElement>('[data-half]').forEach((b) => b.addEventListener('click', () => add(b.dataset.half!, 0.5)));
      p.querySelector('[data-x="empty"]')!.addEventListener('click', () => {
        this.spiceScoops = {};
        feedback = '';
        draw();
      });
      p.querySelector('[data-x="hint"]')?.addEventListener('click', () => {
        sfx.play('tap');
        hintLevel += 1;
        draw();
        p.querySelector('.hint:last-of-type')?.scrollIntoView({ block: 'nearest' });
      });
      p.querySelector('[data-x="close"]')!.addEventListener('click', () => this.closePanel());
      p.querySelector('[data-x="feed"]')!.addEventListener('click', () => {
        // Check the mix first: only the right mix goes to the dragon, so there's
        // nothing to gain from feeding a wrong (or silly) one. The tin stays as it is.
        const scoops = { ...this.spiceScoops };
        const outcome = classifyMix(scoops, scale, content);
        if (outcome === 'perfect') {
          this.closePanel();
          this.dispatch({ type: 'spice', scoops });
          return;
        }
        sfx.play('sniff');
        const why: Record<string, string> = {
          'wrong-spice': `${this.name} sniffs the tin and backs away. Pepper and chili aren't in the recipe: they would make a young dragon sneeze and hiccup. Use only what the card says.`,
          'too-much': `That's the right <b>parts</b>, but too much! ${this.name} only needs a ${batch} batch today.`,
          'too-little': `The tin looks a bit empty. Check the recipe card for today's batch size.`,
          'off-ratio': `${this.name} sniffs... it smells lumpy. Check the <b>parts</b>: 2 cinnamon for every 1 ginger.`,
          empty: '',
        };
        feedback = why[outcome] ?? '';
        draw();
        p.querySelector('.spice-feedback')?.scrollIntoView({ block: 'nearest' });
      });
    };
    this.openPanel('');
    draw();
  }

  private showFixIt() {
    if (!this.state.fixIt) return;
    const slipper = this.state.fixIt.id === 'chewed-slipper';
    this.openPanel(`
      <h2>${slipper ? "Fix-It: Kit's chewed slipper" : 'Fix-It: scorched sock'}</h2>
      <p>${slipper ? 'Rub over the holes to stitch them closed!' : 'Rub the soot off with your finger!'}</p>
      <div class="fixit-area ${slipper ? 'stitch' : ''}"><img src="${dataUri(slipper ? slipperArt(false) : sockArt(false), 2)}" alt="${slipper ? 'A fuzzy blue slipper with tooth holes' : 'A striped sock covered in soot'}" /></div>
      <div class="progress"><div></div></div>
      <div class="row"><button class="btn ghost" data-x="later">Later</button></div>`);
    const area = $('#panel .fixit-area');
    const spots: { el: HTMLDivElement; x: number; y: number; r: number; o: number }[] = [];
    const layout = [
      [30, 30, 17],
      [62, 62, 14],
      [24, 60, 11],
      [48, 22, 10],
      [80, 80, 9],
      [40, 44, 12],
    ];
    for (const [x, y, r] of layout) {
      const el = document.createElement('div');
      el.className = 'soot';
      Object.assign(el.style, { left: `${x - r}%`, top: `${y - r * 1.33}%`, width: `${r * 2}%`, height: `${r * 2.66}%` });
      area.appendChild(el);
      spots.push({ el, x, y, r, o: 1 });
    }
    this.fixitInit = spots.length;
    let lastProgress = this.state.fixIt.progress;
    let scrubSound = 0;
    const rub = (ev: PointerEvent) => {
      if (ev.type === 'pointermove' && ev.buttons === 0 && ev.pointerType === 'mouse') return;
      const rect = area.getBoundingClientRect();
      const px = ((ev.clientX - rect.left) / rect.width) * 100;
      const py = ((ev.clientY - rect.top) / rect.height) * 100;
      let touched = false;
      for (const s of spots) {
        if (s.o > 0 && Math.hypot(px - s.x, (py - s.y) * 0.75) < s.r + 8) {
          s.o = Math.max(0, s.o - 0.12);
          s.el.style.opacity = String(s.o);
          touched = true;
        }
      }
      if (!touched) return;
      if (performance.now() - scrubSound > 120) {
        sfx.play('scrub');
        scrubSound = performance.now();
      }
      const remaining = spots.reduce((a, s) => a + s.o, 0);
      const progress = Math.round(100 * (1 - remaining / this.fixitInit));
      ($('#panel .progress > div') as HTMLElement).style.width = `${progress}%`;
      if (progress > lastProgress) {
        const evs = this.dispatch({ type: 'scrub', amount: progress - lastProgress });
        lastProgress = progress;
        if (evs.some((e) => e.type === 'fixed')) {
          area.removeEventListener('pointermove', rub);
          $('#panel h2').textContent = 'Good as new! ✨';
          setTimeout(() => this.closePanel(), 1000);
        }
      }
    };
    area.addEventListener('pointerdown', (ev) => {
      area.setPointerCapture(ev.pointerId);
      rub(ev);
    });
    area.addEventListener('pointermove', rub);
    $('#panel [data-x="later"]').addEventListener('click', () => this.closePanel());
  }

  private confirmFinish() {
    const d = this.state.dragon;
    const r = TUNING.ready;
    const needs = [d.hunger > r.maxHunger && 'food', (d.spark < r.sparkMin || d.spark > r.sparkMax) && 'a just-right Spark', d.calm < r.minCalm && 'more calm'].filter(Boolean);
    this.openPanel(`
      <h2>Off to school?</h2>
      <p>${this.name} still needs ${needs.join(' and ')}.</p>
      <p class="sub">You can go anyway: ${this.name} will be okay, just a little grumpy.</p>
      <div class="row"><button class="btn" data-x="stay">Keep caring</button><button class="btn ghost" data-x="go">Go anyway</button></div>`);
    $('#panel [data-x="stay"]').addEventListener('click', () => this.closePanel());
    $('#panel [data-x="go"]').addEventListener('click', () => this.finish());
  }

  private async finish() {
    this.closePanel();
    this.dispatch({ type: 'finishMorning' });
    const shot = await this.scene.snapshot();
    const st = this.state.stats;
    const mins = st.readyAt === null ? null : Math.max(1, Math.round(st.readyAt / 60));
    const fixedWhat = this.state.day === 3 ? "Fixed Kit's slipper" : 'Cleaned up a scorched sock';
    const items = [
      [st.balancedPlate, 'A balanced breakfast (meat, greens, minerals)'],
      [st.perfectMix, this.today.morning.recipeScale === 1 ? 'A perfect spice mix' : `A perfect ${this.today.morning.recipeScale === 1.5 ? '1½' : this.today.morning.recipeScale}× batch spice mix`],
      [st.thoughtsSolved.length > 0, `Understood ${st.thoughtsSolved.length} of ${content.thoughts.length} dragon thoughts`],
      ...(st.fixItsDone > 0 ? ([[true, fixedWhat]] as [boolean, string][]) : []),
      [st.readyAt !== null, mins === null ? 'Ready for the day' : `Ready for the day in about ${mins} minute${mins === 1 ? '' : 's'}`],
    ] as [boolean, string][];
    this.openPanel(`
      <h2>Morning done! 🎒</h2>
      <div class="summary">
        <figure class="polaroid">${shot ? `<img src="${shot}" alt="A picture of your dragon" />` : ''}<figcaption>${this.name}, Day ${this.state.day}</figcaption></figure>
        <div>
          <p><b>What you figured out:</b></p>
          <ul class="checklist">${items.map(([ok, t]) => `<li>${ok ? '✅' : '⚪'} ${esc(t)}</li>`).join('')}</ul>
          <div>${this.state.stickers.map((s) => `<span class="sticker">⭐ ${esc(s)}</span>`).join('')}</div>
        </div>
      </div>
      <div class="row"><button class="btn big" data-x="next">Off to school ➜ the afternoon</button></div>`);
    sfx.play('trill');
    $('#panel [data-x="next"]').addEventListener('click', () => this.startAfternoonFlow());
  }

  // ---------- reading rewards ----------

  /** "Read to Pip": reading a story panel aloud to the dragon calms it (once per panel). */
  readPipButton(panelId: string) {
    const done = this.state.reading.readTo.includes(`${this.state.day}:${panelId}`);
    return `<button class="btn ghost small" data-x="readpip" ${done ? 'disabled' : ''}>${done ? `✓ ${this.name} loved listening` : `📖 I read it to ${this.name}`}</button>`;
  }

  bindReadPip(panelId: string) {
    $('#panel [data-x="readpip"]')?.addEventListener('click', (ev) => {
      const evs = this.dispatch({ type: 'readToDragon', panelId });
      const r = evs.find((e) => e.type === 'read-to-dragon');
      if (!r) return;
      sfx.play('purr');
      const b = ev.currentTarget as HTMLButtonElement;
      b.disabled = true;
      b.textContent = `✓ ${this.state.dragon.name} loved listening`;
    });
  }

  /**
   * Sharp Reader: after some story panels the dragon asks one question about what it said.
   * A right first answer earns a star; a wrong one just shows where the answer is.
   */
  askReading(panelId: string, paragraphs: string[], then: () => void) {
    const q = content.reading.questions.find((x) => x.panel === panelId && !this.state.reading.answered.includes(x.id));
    if (!q) return then();
    let firstTry = true;
    const wrong = new Set<string>();
    const draw = (lookAgain: boolean) => {
      const para = paragraphs.find((x) => x.toLowerCase().includes(q.answerText.toLowerCase())) ?? '';
      const i = para.toLowerCase().indexOf(q.answerText.toLowerCase());
      const marked = i < 0 ? this.fill(para) : `${this.fill(para.slice(0, i))}<mark>${this.fill(para.slice(i, i + q.answerText.length))}</mark>${this.fill(para.slice(i + q.answerText.length))}`;
      this.openPanel(`
        <p class="sub">⭐ Sharp Reader · ${this.name} has a question</p>
        <h2>${this.fill(q.question)}</h2>
        ${lookAgain ? `<p class="hint look-again">Not quite! Look again:<br/>${marked}</p>` : ''}
        <div class="row">${q.choices
          .map((c) => `<button class="choice ${wrong.has(c.id) ? 'wrong' : ''}" data-q="${c.id}" ${wrong.has(c.id) ? 'disabled' : ''}>${esc(c.label)}</button>`)
          .join('')}</div>
        <p class="sub">Stars: ${'⭐'.repeat(this.state.reading.stars) || 'none yet'}</p>`);
      $('#panel').querySelectorAll<HTMLButtonElement>('[data-q]').forEach((b) =>
        b.addEventListener('click', () => {
          const evs = this.dispatch({ type: 'readingAnswer', questionId: q.id, choiceId: b.dataset.q!, firstTry });
          const res = evs.find((e) => e.type === 'reading-answer');
          if (res?.type === 'reading-answer' && res.correct) {
            sfx.play(res.star ? 'sparkle' : 'tap');
            this.closePanel();
            if (res.star) this.toast(`⭐ Sharp reading! ${this.name} is impressed.`);
            then();
          } else {
            sfx.play('sniff');
            firstTry = false;
            wrong.add(b.dataset.q!);
            draw(true);
          }
        }),
      );
    };
    draw(false);
  }

  /** Day 1 visits Aunt June first; Day 2 goes to the store; Days 1 and 3 use the library. */
  private startAfternoonFlow() {
    const a = this.today.afternoon;
    if (a.kind === 'clues' || a.kind === 'board' || a.kind === 'map' || a.kind === 'farewell') this.chapters.afternoonStart();
    else if (a.kind === 'store') this.showStoreIntro();
    else if (a.kind === 'research' && a.june) this.showJune();
    else this.showAfternoonIntro();
  }

  /** Aunt June explains who the collector is and why the dragon needs protecting. */
  private showJune() {
    const j = content.story.juneIntro;
    this.openPanel(`
      <div class="thought-icons" aria-hidden="true">${j.emoji}</div>
      <h2>${esc(j.title)} <button class="speak" data-x="read" aria-label="Read aloud">🔈</button></h2>
      <div class="story">${j.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
      <p class="hint">🤝 ${esc(j.closing)}</p>
      <div class="row">${this.readPipButton('june')}<button class="btn big" data-x="next">${esc(j.button)}</button></div>`);
    $('#panel [data-x="read"]').addEventListener('click', () => this.speakText([...j.paragraphs, j.closing].join(' ')));
    this.bindReadPip('june');
    $('#panel [data-x="next"]').addEventListener('click', () => {
      sfx.play('tap');
      this.askReading('june', j.paragraphs, () => this.showAfternoonIntro());
    });
  }

  fill(t: string) {
    return esc(t).replaceAll('{name}', this.name);
  }

  /** Introduces the household (who Kit is) and recaps the evening's goals. */
  private showEveningIntro() {
    if (this.state.part !== 'evening' || this.state.evening.t > 0) return;
    const j = content.story.eveningIntro;
    const paragraphs = this.today.evening.intro ?? j.paragraphs;
    this.openPanel(`
      <div class="thought-icons" aria-hidden="true">${j.emoji}</div>
      <h2>${this.state.day === 1 ? esc(j.title) : `Evening, Day ${this.state.day}`} <button class="speak" data-x="read" aria-label="Read aloud">🔈</button></h2>
      <div class="story">${paragraphs.map((p) => `<p>${this.fill(p)}</p>`).join('')}</div>
      <div class="row">${this.readPipButton(`evening-${this.state.day}`)}<button class="btn big" data-x="go">${esc(j.button)}</button></div>`);
    $('#panel [data-x="read"]').addEventListener('click', () => this.speakText(paragraphs.join(' ').replaceAll('{name}', this.state.dragon.name)));
    this.bindReadPip(`evening-${this.state.day}`);
    $('#panel [data-x="go"]').addEventListener('click', () => {
      sfx.play('tap');
      this.askReading(`evening-${this.state.day}`, paragraphs, () => this.closePanel());
    });
  }

  private showAfternoonIntro() {
    const a = this.today.afternoon;
    this.openPanel(`
      <h2>📚 After school: Larkspur Library</h2>
      <p>The librarian, Ms. Ortiz, points you to Computer 2.</p>
      <p class="riddle">Find out: ${esc(this.archive.question)}</p>
      <p class="sub">${a.kind === 'research' ? this.fill(a.intro) : ''}</p>
      <div class="row">${this.readPipButton(`library-${this.state.day}`)}<button class="btn big" data-x="go">Start searching</button></div>`);
    this.bindReadPip(`library-${this.state.day}`);
    $('#panel [data-x="go"]').addEventListener('click', () => {
      sfx.play('tap');
      this.askReading(`library-${this.state.day}`, a.kind === 'research' ? [a.intro] : [], () => {
        this.closePanel();
        this.dispatch({ type: 'startAfternoon' });
      });
    });
  }

  private showStoreIntro() {
    this.openPanel(`
      <div class="thought-icons" aria-hidden="true">🏪</div>
      <h2>After school: the corner store</h2>
      <p>${esc(content.store.intro)}</p>
      <div class="row">${this.readPipButton('store')}<button class="btn big" data-x="go">Go shopping</button></div>`);
    this.bindReadPip('store');
    $('#panel [data-x="go"]').addEventListener('click', () => {
      sfx.play('tap');
      this.askReading('store', [content.store.intro], () => {
        this.closePanel();
        this.dispatch({ type: 'startAfternoon' });
      });
    });
  }

  private showVisitor(id: string) {
    const v = visitorDef(this.ev, id, content)!;
    if (this.state.evening.awaiting !== id) return;
    const line = this.state.evening.kitDiscovers && id === 'kit' ? content.story.kitDiscovers : v.noisyLine;
    this.openPanel(`
      <div class="thought-icons" aria-hidden="true">${v.emoji}</div>
      <p>${esc(line)}</p>
      <p><b>What do you say?</b> <span class="sub">(Every choice is honest: you never have to lie.)</span></p>
      <div class="col">${v.choices.map((c) => `<button class="choice" data-c="${c.id}">${esc(c.label)}</button>`).join('')}</div>`);
    $('#panel').querySelectorAll<HTMLButtonElement>('[data-c]').forEach((b) =>
      b.addEventListener('click', () => {
        const c = v.choices.find((x) => x.id === b.dataset.c)!;
        this.closePanel();
        this.dispatch({ type: 'visitorChoice', choiceId: c.id });
        this.card(esc(c.result));
      }),
    );
  }

  /** Day 3: Kit's slipper is fixed. Owning up is the only path, and both options are honest. */
  private showOwnUp() {
    if (!this.state.ownUpPending) return;
    const kitKnows = this.state.world.circle.includes('kit');
    this.openPanel(`
      <img class="title-dragon" src="${dataUri(slipperArt(false), 2)}" alt="" />
      <h2>Good as new... almost!</h2>
      <p>This is Kit's favorite slipper. ${this.name} chewed it, so it's up to you to make it right.</p>
      <div class="col">
        <button class="choice" data-o="sorry">Give it back and say sorry</button>
        <button class="choice" data-o="sorry-chores">Give it back, say sorry, and offer to do Kit's chores tomorrow</button>
      </div>`);
    $('#panel').querySelectorAll<HTMLButtonElement>('[data-o]').forEach((b) =>
      b.addEventListener('click', () => {
        const choice = b.dataset.o as 'sorry' | 'sorry-chores';
        this.closePanel();
        this.dispatch({ type: 'ownUp', choice });
        const kitLine = kitKnows ? '"Dragon teeth!" Kit giggles.' : '"Your PET chewed it?" Kit squints, then shrugs.';
        this.card(
          choice === 'sorry'
            ? `Kit takes the slipper. ${kitLine} "Thanks for telling me."`
            : `Kit takes the slipper. ${kitLine} "Chores? Deal!" Making amends feels good.`,
        );
      }),
    );
  }

  /** Spec §5.6: three problems at once, tackled one stone at a time. */
  private showStones() {
    if (!this.state.evening.stones.active) return;
    const ss = content.story.steppingStones;
    const order: StoneId[] = [];
    let reason = '';
    const draw = () => {
      const left = ss.problems.filter((p) => !order.includes(p.id));
      this.openPanel(`
        <h2>${esc(ss.title)}</h2>
        <p>${this.fill(ss.intro)}</p>
        <p><b>${order.length < 3 ? `Which first? Tap the problems in the order you'll do them.` : 'Why did you pick your first stone?'}</b></p>
        <div class="stones">${[0, 1, 2]
          .map((i) => {
            const p = ss.problems.find((x) => x.id === order[i]);
            return `<div class="stone ${p ? 'filled' : ''}"><span class="num">${i + 1}</span>${p ? `${p.emoji} ${this.fill(p.label)}` : ''}</div>`;
          })
          .join('')}</div>
        ${
          order.length < 3
            ? `<div class="row">${left.map((p) => `<button class="choice" data-p="${p.id}">${p.emoji} ${this.fill(p.label)}</button>`).join('')}</div>
               ${order.length ? '<div class="row"><button class="btn ghost" data-x="undo">Start over</button></div>' : ''}`
            : `<div class="row">${ss.reasons.map((r) => `<button class="choice ${reason === r.id ? 'picked' : ''}" data-r="${r.id}">${esc(r.label)}</button>`).join('')}</div>
               <div class="row"><button class="btn" data-x="go" ${reason ? '' : 'disabled'}>One stone at a time ➜</button></div>`
        }`);
      const p = $('#panel');
      p.querySelectorAll<HTMLButtonElement>('[data-p]').forEach((b) =>
        b.addEventListener('click', () => {
          sfx.play('tap');
          order.push(b.dataset.p as StoneId);
          draw();
        }),
      );
      p.querySelector('[data-x="undo"]')?.addEventListener('click', () => {
        order.length = 0;
        draw();
      });
      p.querySelectorAll<HTMLButtonElement>('[data-r]').forEach((b) =>
        b.addEventListener('click', () => {
          sfx.play('tap');
          reason = b.dataset.r!;
          draw();
        }),
      );
      p.querySelector('[data-x="go"]')?.addEventListener('click', () => {
        this.closePanel();
        this.dispatch({ type: 'stepOrder', order: [...order], reason });
      });
    };
    draw();
  }

  private showBedtime() {
    // This runs on a delay, so check the evening really is over (not a later day's evening).
    if (this.state.part !== 'evening' || !this.state.evening.over) return;
    this.openPanel(`
      <h2>🌙 The house is quiet</h2>
      <p>${this.name} yawns a tiny puff of smoke. Time for bed.</p>
      <div class="row"><button class="btn big" data-x="night">Goodnight, ${this.name}</button></div>`);
    $('#panel [data-x="night"]').addEventListener('click', () => {
      this.closePanel();
      this.dispatch({ type: 'finishDay' });
      setTimeout(() => void this.showDaySummary(), 1600);
    });
  }

  private circleNames() {
    return this.state.world.circle.map((m) => ({ june: 'Aunt June', kit: 'Kit', parents: 'Mom & Dad' })[m] ?? m);
  }

  private afternoonLines(line: (ok: boolean, t: string) => string) {
    const s = this.state;
    const kind = this.today.afternoon.kind;
    if (kind === 'store') {
      const st = s.store;
      return `<div><b>🏪 Afternoon</b><ul class="checklist">
        ${line(st.paid, st.paid ? `Bought food for ${money(st.total)}` : 'Bought food for the week')}
        ${line(s.stickers.includes('Smart Shopper') && st.paid, 'Found the best prices per serving')}
        ${line(st.changeChecked === 'wrong', 'Checked the change')}</ul></div>`;
    }
    if (kind !== 'research') {
      const t = s.task;
      const what = {
        clues: [`Found ${t.picks.length} clues on the poster`, t.wrong.length === 0 ? 'No wrong guesses' : 'Checked each clue carefully'],
        board: ['Picked strong evidence for the meeting', 'Showed the "rescue" website is fake'],
        map: ['Planned the route north', 'Packed the right travel snacks'],
        farewell: ['Visited Mr. Patel, Ms. Ortiz and Aunt June', 'Said thank you to the helpers'],
      }[kind];
      return `<div><b>🏡 Afternoon</b><ul class="checklist">${line(t.done, what[0])}${line(t.done, what[1])}</ul></div>`;
    }
    const r = s.research;
    const ratedRight = Object.entries(r.ratings).filter(([id, rating]) => {
      const p = this.archive.pages.find((x) => x.id === id)!;
      return (p.credibility === 'trusted' && rating === 'trust') || (p.credibility === 'mixed' && rating !== 'trust') || (p.credibility === 'trap' && rating === 'distrust');
    }).length;
    return `<div><b>📚 Afternoon</b><ul class="checklist">
      ${line(r.foundAnswerOnSearch !== null, r.foundAnswerOnSearch ? `Found the answer in ${r.foundAnswerOnSearch} search${r.foundAnswerOnSearch === 1 ? '' : 'es'}` : 'Found the answer')}
      ${Object.keys(r.ratings).length ? line(ratedRight > 0, `Judged ${ratedRight} of ${Object.keys(r.ratings).length} websites right`) : line(false, 'Checked a website before trusting it')}
      ${Object.keys(r.trapChoices).length ? line(!Object.values(r.trapChoices).includes('share'), 'Kept your address private') : line(false, 'Spotted a trap website')}</ul></div>`;
  }

  private collectorLine() {
    const a = this.state.world.collectorAttention;
    if (this.state.world.craneGone) return '👁️ Silas Crane has left town, and BLINK is your lookout now!';
    return `👁️ The collector is <b>${attentionWord(a).replace('!', '')}</b>${a < 20 ? '. Your dragon is safe!' : a < 50 ? '. Be careful tomorrow.' : '. BLINK will be back...'}`;
  }

  private async showDaySummary() {
    const s = this.state;
    const shot = await this.scene.snapshot();
    const st = s.stats;
    const e = s.evening;
    const line = (ok: boolean, t: string) => `<li>${ok ? '✅' : '⚪'} ${esc(t)}</li>`;
    const chapterEnd = s.day >= Math.min(chapterFor(content, s.day).lastDay, lastDay(content));
    const visits = this.ev.visitors.length;
    const scouts = this.ev.windowThings.filter((w) => w.suspicious).length;
    const special = { 'crane-door': 'Spotted the clues at the door', 'hill-flight': 'Flew over Larkspur Hill', choice: 'Chose together' } as const;
    const evening = [
      visits ? line(e.scaredKnocks === 0, `Stayed calm at ${e.calmKnocks + e.helpers} of ${visits} visits`) : '',
      scouts ? line(e.missed === 0, `Spotted ${e.spotted} of ${scouts} scouts`) : '',
      this.ev.special ? line(e.special.done, special[this.ev.special]) : '',
      !visits && !scouts && !this.ev.special ? line(true, 'A peaceful night') : '',
    ].join('');
    this.openPanel(`
      <h2>Day ${s.day} complete! 🌙</h2>
      <div class="summary">
        <figure class="polaroid small">${shot ? `<img src="${shot}" alt="Your dragon asleep in the nest" />` : ''}<figcaption>${this.name}, asleep</figcaption></figure>
        <div class="day-cols">
          <div><b>☀️ Morning</b><ul class="checklist">
            ${line(st.balancedPlate, 'Balanced breakfast')}${line(st.perfectMix, 'Perfect spice mix')}${line(st.readyAt !== null, 'Ready for the day')}${this.today.morning.activity ? line(s.activity.done, this.activityLabel()) : ''}</ul></div>
          ${this.afternoonLines(line)}
          <div><b>🌙 Evening</b><ul class="checklist">${evening}</ul></div>
        </div>
      </div>
      <p>${this.collectorLine()} · 🤝 Keeper Circle: ${esc(this.circleNames().join(', '))}</p>
      <div>${s.stickers.map((x) => `<span class="sticker">⭐ ${esc(x)}</span>`).join('')}</div>
      <div class="row">
        ${chapterEnd ? '<button class="btn big" data-x="end">What happens next? ➜</button>' : `<button class="btn big" data-x="next">Good morning, Day ${s.day + 1} ➜</button>`}
        <button class="btn big ghost" data-x="more">📖 Find out more</button>
        <button class="btn ghost" data-x="scrapbook">📷 Scrapbook</button>
      </div>`);
    sfx.play('trill');
    if (shot) void addScrapPage({ day: s.day, title: this.today.title, name: s.dragon.name, img: shot });
    $('#panel [data-x="more"]').addEventListener('click', () => {
      sfx.play('tap');
      showFindOutMore($('#panel'), () => void this.showDaySummary());
    });
    $('#panel [data-x="scrapbook"]').addEventListener('click', () => this.showScrapbook(() => void this.showDaySummary()));
    $('#panel [data-x="next"]')?.addEventListener('click', () => this.goToNextDay());
    $('#panel [data-x="end"]')?.addEventListener('click', () => {
      if (s.day >= lastDay(content)) this.chapters.epilogue(bondExtras(this.state, content), () => this.showChapterSummary());
      else this.showCliffhanger();
    });
  }

  private activityLabel() {
    const labels = { insulation: 'Built a warm, dry nest', flight: 'Practiced flying (and read the graph)', fire: 'Learned fire control', letter: "Read Aunt June's letter", favorites: 'A special last morning' };
    return labels[this.today.morning.activity!];
  }

  /** Each morning's little surprise, then any trick learned today, then the day's lesson. */
  private morningExtras(then: () => void) {
    const steps: (() => void)[] = [];
    const twist = twistFor(this.state.day, content);
    if (twist) {
      steps.push(() => {
        this.scene.twist(twist.anim);
        this.card(`🌅 ${this.fill(twist.text)}`, next);
      });
    }
    for (const t of tricksLearnedToday(this.state, content)) {
      steps.push(() => this.card(`${t.emoji} ${this.fill(t.learned)} <span class="sub">Try it with the 🧶 Play button.</span>`, next));
    }
    let i = 0;
    function next() {
      const step = steps[i++];
      if (step) step();
      else then();
    }
    next();
  }

  /** Toys and tricks. The panel closes so the player can watch the dragon. */
  private showPlay() {
    const toys = toysFor(this.state, content);
    const tricks = tricksKnown(this.state, content);
    this.openPanel(`
      <h2>🧶 Play with ${this.name}</h2>
      <p><b>Toys</b></p>
      <div class="play-grid">${toys.map((t) => `<button class="act" data-toy="${t.id}"><span class="emo">${t.emoji}</span><span>${esc(t.label)}</span></button>`).join('')}</div>
      <p><b>Tricks</b></p>
      ${
        tricks.length
          ? `<div class="play-grid">${tricks
              .map((t) => `<button class="act" data-trick="${t.id}"><span class="emo">${t.emoji}</span><span>${esc(t.label)}</span>${this.state.play.tricksToday.includes(t.id) ? '<span class="sub">done today ✓</span>' : ''}</button>`)
              .join('')}</div>`
          : `<p class="sub">${this.name} will learn its first trick tomorrow.</p>`
      }
      <div class="row"><button class="btn ghost" data-x="close">Close</button></div>`);
    const p = $('#panel');
    p.querySelectorAll<HTMLButtonElement>('[data-toy]').forEach((b) =>
      b.addEventListener('click', () => {
        this.closePanel();
        this.dispatch({ type: 'toy', id: b.dataset.toy! });
      }),
    );
    p.querySelectorAll<HTMLButtonElement>('[data-trick]').forEach((b) =>
      b.addEventListener('click', () => {
        this.closePanel();
        this.dispatch({ type: 'trick', id: b.dataset.trick! });
      }),
    );
    p.querySelector('[data-x="close"]')!.addEventListener('click', () => this.closePanel());
  }

  /** The week's photos, kept on this device. */
  private showScrapbook(back: () => void) {
    const pages = loadScrapbook();
    this.openPanel(`
      <h2>📷 ${pages.length ? `${esc(pages[0].name)}'s scrapbook` : 'Scrapbook'}</h2>
      ${
        pages.length
          ? `<div class="scrapbook">${pages
              .map((p) => `<figure class="polaroid scrap"><img src="${p.img}" alt="${esc(p.name)} asleep on Day ${p.day}" /><figcaption>Day ${p.day}: ${esc(p.title)}</figcaption></figure>`)
              .join('')}</div>`
          : '<p>No photos yet. A new photo is added at the end of each day.</p>'
      }
      <p class="sub">Photos stay on this device.</p>
      <div class="row"><button class="btn" data-x="back">Back</button></div>`);
    $('#panel [data-x="back"]').addEventListener('click', () => {
      sfx.play('tap');
      back();
    });
  }

  /** After the ending: time with the dragon, with no clock and no goals. */
  private startFreePlay() {
    sfx.play('trill');
    this.closePanel();
    this.clearCards();
    this.dispatch({ type: 'freePlay' });
    this.scene.scene.restart(this.scene.bootData);
    this.paused = false;
    const line =
      this.state.world.ending === 'fly'
        ? `It's next summer, and ${this.name} has flown home for a visit! Play, do tricks, and just enjoy being together.`
        : `A sunny afternoon in the treehouse with ${this.name}. Play, do tricks, and just enjoy being together.`;
    setTimeout(() => this.card(line), 700);
  }

  private goToNextDay() {
    sfx.play('tap');
    this.closePanel();
    this.clearCards();
    this.dispatch({ type: 'nextDay' });
    this.scene.scene.restart(this.scene.bootData); // back to daytime, dragon on the rug
    this.paused = false;
    setTimeout(() => this.card(this.fill(this.today.morning.intro), () => this.morningExtras(() => this.chapters.morningStart())), 700);
  }

  private showCliffhanger() {
    const ch = chapterFor(content, this.state.day);
    const c = ch.cliffhanger;
    if (!c) return this.showChapterSummary();
    const told = this.state.world.circle.includes('parents');
    const paragraphs = [...c.paragraphs, told ? c.toldParents : c.notToldParents].filter(Boolean);
    this.openPanel(`
      <div class="thought-icons" aria-hidden="true">${ch.n === 1 ? '📦💥🐉' : '🏔️🪽🐉'}</div>
      <h2>${esc(c.title)} <button class="speak" data-x="read" aria-label="Read aloud">🔈</button></h2>
      <div class="story">${paragraphs.map((p) => `<p>${this.fill(p)}</p>`).join('')}</div>
      <div class="row">${this.readPipButton(`cliffhanger-${ch.n}`)}<button class="btn big" data-x="go">Chapter ${ch.n} complete ➜</button></div>`);
    $('#panel [data-x="read"]').addEventListener('click', () => this.speakText(paragraphs.join(' ').replaceAll('{name}', this.state.dragon.name)));
    this.bindReadPip(`cliffhanger-${ch.n}`);
    $('#panel [data-x="go"]').addEventListener('click', () => this.showChapterSummary());
  }

  private showChapterSummary() {
    const s = this.state;
    const ch = chapterFor(content, s.day);
    const first = content.days.chapters.find((x) => x.n === ch.n - 1)?.lastDay ?? 0;
    const final = s.day >= lastDay(content);
    const tick = (ok: boolean) => (ok ? '✅' : '⚪');
    const rows = s.history
      .filter((h) => h.day > first && h.day <= ch.lastDay)
      .map((h) => {
        const def = dayDef(content, h.day);
        const task = { clues: 'Spotted the clues', board: 'Showed the website is fake', map: 'Planned the route north', farewell: 'Thanked the helpers' } as Record<string, string>;
        const afternoon = h.afternoon === 'store' ? `${tick(h.smartShopper)} Smart shopping` : h.afternoon === 'research' ? `${tick(h.foundAnswer)} Found a trusted tip` : `${tick(h.foundAnswer)} ${task[h.afternoon]}`;
        return `<tr><td><b>Day ${h.day}</b><br/><span class="sub">${esc(def.title)}</span></td>
          <td>${tick(h.ready)} Ready for the day</td><td>${afternoon}</td>
          <td>${tick(h.scaredKnocks === 0)} Calm night${h.spotted ? ` · ${h.spotted} scouts spotted` : ''}</td></tr>`;
      })
      .join('');
    const ending = s.world.ending === 'stay' ? `${this.name} stayed on Larkspur Lane as its hidden guardian.` : s.world.ending === 'fly' ? `${this.name} flew north with the flock, and comes home every summer.` : '';
    const next = content.days.chapters.find((x) => x.n === ch.n + 1);
    this.openPanel(`
      <h2>${final ? `The End: ${esc(ch.title)} 🐉` : `Chapter ${ch.n}: ${esc(ch.title)}, complete! 🐉`}</h2>
      <table class="chapter">${rows}</table>
      ${ending ? `<p>🌄 ${ending}</p>` : ''}
      <p>🤝 Keeper Circle: <b>${esc(this.circleNames().join(', '))}</b> · ${this.collectorLine()}</p>
      <div>${s.stickers.map((x) => `<span class="sticker">⭐ ${esc(x)}</span>`).join('')}</div>
      ${final ? `<p class="sub">Thanks for being such a wonderful dragon keeper. Want more dragon stories? Tap Find out more for the books that inspired this game.</p>` : ''}
      <div class="row">
        ${next && !final ? `<button class="btn big" data-x="next">Start Chapter ${next.n}: ${esc(next.title)} ➜</button>` : `<button class="btn big" data-x="visit">🐉 Visit ${this.name}</button>`}
        <button class="btn big ghost" data-x="more">📖 Find out more</button>
        <button class="btn ghost" data-x="scrapbook">📷 Scrapbook</button>
        ${final ? '<button class="btn ghost" data-x="again">Play again</button>' : ''}
      </div>`);
    sfx.play('trill');
    $('#panel [data-x="more"]').addEventListener('click', () => {
      sfx.play('tap');
      showFindOutMore($('#panel'), () => this.showChapterSummary());
    });
    $('#panel [data-x="scrapbook"]').addEventListener('click', () => this.showScrapbook(() => this.showChapterSummary()));
    $('#panel [data-x="visit"]')?.addEventListener('click', () => this.startFreePlay());
    $('#panel [data-x="next"]')?.addEventListener('click', () => this.goToNextDay());
    $('#panel [data-x="again"]')?.addEventListener('click', () => {
      this.newGame();
      this.toast('Tap the egg to help it hatch!');
      this.render();
    });
  }

  // ---------- controls ----------

  private bindStatic() {
    document.querySelectorAll<HTMLButtonElement>('.act').forEach((b) =>
      b.addEventListener('click', () => {
        sfx.unlock();
        sfx.play('tap');
        const act = b.dataset.act;
        if (act === 'food') this.toggleTray();
        else if (act === 'spice') this.showSpice();
        else if (act === 'hum') this.dispatch({ type: 'hum' });
        else if (act === 'sock') this.dispatch({ type: 'sock' });
        else if (act === 'play') this.showPlay();
        else if (act === 'finish') {
          if (!morningActivityDone(this.state, content)) this.chapters.morningStart();
          else if (isReady(this.state)) void this.finish();
          else this.confirmFinish();
        }
      }),
    );
    document.querySelectorAll<HTMLButtonElement>('[data-eve]').forEach((b) =>
      b.addEventListener('click', () => {
        sfx.unlock();
        const act = b.dataset.eve;
        if (act === 'lamp') this.dispatch({ type: 'lamp' });
        else if (act === 'hum') this.dispatch({ type: 'hum' });
        else if (act === 'blanket') {
          if (!this.state.world.blanketUnlocked) {
            sfx.play('sniff');
            this.card("You don't know how to use the blanket yet. Did the library have any tips?");
          } else this.dispatch({ type: 'blanket' });
        }
      }),
    );
    document.querySelectorAll<HTMLButtonElement>('[data-free]').forEach((b) =>
      b.addEventListener('click', () => {
        sfx.unlock();
        sfx.play('tap');
        const act = b.dataset.free;
        if (act === 'play') this.showPlay();
        else if (act === 'hum') this.dispatch({ type: 'hum' });
        else if (act === 'scrapbook') this.showScrapbook(() => this.closePanel());
        else if (act === 'menu') this.showTitle(true);
      }),
    );
    $('#bubble').addEventListener('click', () => {
      sfx.play('tap');
      this.showThought();
    });

    $('#msgcard [data-x="ok"]').addEventListener('click', () => {
      sfx.play('tap');
      this.nextCard();
    });
    $('#btn-log').addEventListener('click', () => {
      sfx.unlock();
      sfx.play('tap');
      this.showLog();
    });
    const soundBtn = $('#btn-sound');
    const readBtn = $('#btn-read');
    const musicBtn = $('#btn-music');
    const syncToggles = () => {
      soundBtn.classList.toggle('off', !sfx.enabled);
      soundBtn.textContent = sfx.enabled ? '🔊' : '🔇';
      musicBtn.classList.toggle('off', !music.enabled || !sfx.enabled);
      music.refresh();
      readBtn.classList.toggle('off', !this.readAloud);
    };
    soundBtn.addEventListener('click', () => {
      sfx.unlock();
      sfx.enabled = !sfx.enabled;
      savePref('sound', sfx.enabled);
      syncToggles();
    });
    musicBtn.addEventListener('click', () => {
      sfx.unlock();
      music.setEnabled(!music.enabled);
      savePref('music', music.enabled);
      syncToggles();
    });
    readBtn.addEventListener('click', () => {
      this.readAloud = !this.readAloud;
      savePref('readAloud', this.readAloud);
      syncToggles();
      this.toast(this.readAloud ? 'Read-aloud is on.' : 'Read-aloud is off.');
    });
    syncToggles();

    this.buildTray();
  }

  private toggleTray() {
    const tray = $('#tray');
    tray.hidden = !tray.hidden;
    document.querySelector('.act[data-act="food"]')!.classList.toggle('selected', !tray.hidden);
    if (tray.hidden) this.setHeld(null);
  }

  private setHeld(id: string | null) {
    this.held = id;
    document.querySelectorAll<HTMLElement>('.food').forEach((f) => f.classList.toggle('held', f.dataset.food === id));
  }

  private buildTray() {
    const tray = $('#tray');
    tray.innerHTML =
      `<div class="tray-hint">Drag food to your dragon, or tap a food then the dragon</div>` +
      content.foods
        .map((f) => `<button class="food" data-food="${f.id}"><img src="${dataUri(foodArt[f.art], 2)}" alt="" />${esc(f.name)}</button>`)
        .join('');

    tray.querySelectorAll<HTMLButtonElement>('.food').forEach((el) => {
      let start: { x: number; y: number } | null = null;
      let ghost: HTMLImageElement | null = null;
      el.addEventListener('pointerdown', (ev) => {
        start = { x: ev.clientX, y: ev.clientY };
        el.setPointerCapture(ev.pointerId);
      });
      el.addEventListener('pointermove', (ev) => {
        if (!start) return;
        if (!ghost && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 10) {
          ghost = document.createElement('img');
          ghost.className = 'drag-ghost';
          ghost.src = el.querySelector('img')!.src;
          document.body.appendChild(ghost);
        }
        if (ghost) {
          ghost.style.left = `${ev.clientX}px`;
          ghost.style.top = `${ev.clientY}px`;
        }
      });
      const end = (ev: PointerEvent) => {
        if (!start) return;
        const id = el.dataset.food!;
        if (ghost) {
          ghost.remove();
          ghost = null;
          const r = this.scene.dragonClientRect();
          if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) this.feed(id, ev.clientX, ev.clientY);
        } else if (ev.type === 'pointerup') {
          sfx.unlock();
          sfx.play('tap');
          this.setHeld(this.held === id ? null : id);
        }
        start = null;
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('click', (ev) => ev.preventDefault());
    });
  }

  private feed(foodId: string, x: number, y: number) {
    const evs = this.dispatch({ type: 'feed', foodId });
    if (evs.some((e) => e.type === 'eat')) this.scene.flyFood(foodId, x, y);
  }

  // ---------- scene callbacks ----------

  onEggTap() {
    sfx.unlock();
    this.dispatch({ type: 'tapEgg' });
  }

  onDragonTap() {
    if (this.state.phase !== 'care' || !this.held) return;
    const el = document.querySelector<HTMLElement>(`.food[data-food="${this.held}"]`);
    const r = el?.getBoundingClientRect();
    const id = this.held;
    this.setHeld(null); // tapping the same food again picks it up again
    this.feed(id, r ? r.left + r.width / 2 : 0, r ? r.top : 0);
  }

  onPet(amount: number) {
    if (this.state.phase === 'care') this.dispatch({ type: 'pet', amount });
  }

  onWindowTap(thingId: string) {
    if (this.state.part === 'evening' && !this.paused) this.dispatch({ type: 'windowTap', thingId });
  }

  onScorchedSockTap() {
    this.showFixIt();
  }

  /** Called every time the scene (re)starts. */
  onSceneCreated(scene: BedroomScene, hasSave: boolean) {
    if (!this.scene) {
      this.attach(scene);
      this.showTitle(hasSave);
    } else {
      scene.setGameState(this.state);
      this.render();
    }
  }

  onReady() {
    /* the toast is handled in onEvent */
  }
}
