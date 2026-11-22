import { dataUri, foodArt, sockArt } from '../art/svg';
import { sfx } from '../audio/sfx';
import { content, type Nutrient, type ThoughtDef } from '../core/content';
import { attentionWord } from '../core/day';
import { isReady, step, TUNING } from '../core/reducer';
import { clearSave, loadPref, savePref, writeSave } from '../core/save';
import { initialState, type Action, type GameEvent, type GameState } from '../core/state';
import type { BedroomScene } from '../scenes/BedroomScene';
import { showFindOutMore } from './findOutMore';
import { ResearchScreen } from './research';

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const WANTS: Record<Nutrient, string> = { protein: 'meaty', greens: 'leafy and green', minerals: 'crunchy and white' };

const NAME_IDEAS = ['Sprocket', 'Pip', 'Ember', 'Biscuit', 'Mochi', 'Zuzu'];

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
  private research: ResearchScreen;

  constructor(initial: GameState) {
    this.state = initial;
    sfx.enabled = loadPref('sound', true);
    this.research = new ResearchScreen(this);
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
      const live = (s.part === 'morning' && s.phase === 'care') || (s.part === 'evening' && !s.evening.over);
      if (!this.paused && !document.hidden && live) this.dispatch({ type: 'tick', dt: 1 });
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
        this.toast(`${n} sniffs the ${esc(food)}... and turns away. It wants something ${e.wants.map((w) => WANTS[w]).join(' or ')}.`);
        break;
      }
      case 'refuse-full':
        sfx.play('sniff');
        this.toast(`${n} is full! Its tummy is round as a ball.`);
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
          'too-little': 'A little warmer, but that mix was too small.',
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
      case 'scorched':
        setTimeout(() => this.toast('Oops! A hiccup scorched a sock. Tap the sock to clean it up.'), 1500);
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
        this.toast(`You understood! "${esc(def?.meaning ?? '')}"`);
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
        if (e.feedback === 'ok' && e.ids.includes(content.archive.answerPageId) && this.state.research.searches <= 3) sfx.play('sparkle');
        break;
      case 'trap':
        if (e.choice === 'share') sfx.play('startle');
        else sfx.play('sparkle');
        break;
      case 'evening-start':
        this.research.hide();
        this.showEveningIntro(); // the evening clock waits until the player taps "Let's go"
        break;
      case 'footsteps': {
        sfx.play('steps');
        break;
      }
      case 'knock': {
        sfx.play('knock');
        const v = content.evening.visitors.find((x) => x.id === e.visitorId)!;
        this.toast(`<b>Knock knock!</b> ${esc(v.name)}: ${esc(v.line)}`);
        if (e.quiet) setTimeout(() => this.toast(esc(v.quietLine)), 2600);
        else {
          sfx.play('chirp');
          setTimeout(() => this.showVisitor(v.id), 1500);
        }
        break;
      }
      case 'visitor-left':
        if (e.joined) sfx.play('trill');
        break;
      case 'window-thing':
        if (this.state.evening.windowIdx === 0) this.toast('Something is moving outside the window... Tap it if it looks suspicious!');
        break;
      case 'window-gone': {
        const w = content.evening.windowThings.find((x) => x.id === e.thingId)!;
        if (e.missed && w.missLine) this.toast(`${esc(w.missLine)} <span class="sub-dark">(Collector Attention went up.)</span>`);
        break;
      }
      case 'spotted': {
        const w = content.evening.windowThings.find((x) => x.id === e.thingId)!;
        sfx.play(e.suspicious ? 'sparkle' : 'tap');
        this.toast(esc(w.tapLine));
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
      case 'evening-over':
        setTimeout(() => this.showBedtime(), 1200);
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
    if (!caring) $('#tray').hidden = true;
    if (caring) this.renderMeters();
    if (evening) this.renderEvening();
    else $('#banner').hidden = true;
    $('.act.go').classList.toggle('ready', isReady(s));
    if (s.part === 'afternoon') this.research.show();
    else this.research.hide();

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
    const quiet = content.evening.quietCalm;
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

    const lamp = document.querySelector('[data-eve="lamp"] .lbl')!;
    lamp.textContent = e.lampDim ? 'Lamp on' : 'Dim lamp';
    const bl = document.querySelector<HTMLElement>('[data-eve="blanket"]')!;
    bl.classList.toggle('locked', !s.world.blanketUnlocked);
    bl.classList.toggle('selected', e.blanket);
    bl.querySelector('.lbl')!.textContent = s.world.blanketUnlocked ? (e.blanket ? 'Uncover' : 'Blanket') : '🔒 Blanket';
    document.querySelector('[data-eve="lamp"]')!.classList.toggle('selected', e.lampDim);

    const banner = $('#banner');
    if (e.visitor) {
      const v = content.evening.visitors.find((x) => x.id === e.visitor!.id)!;
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

  toast(html: string) {
    if (!html) return;
    const t = $('#toast');
    t.innerHTML = html;
    t.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => t.classList.remove('show'), 3800);
    this.speak(t.textContent ?? '');
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

  private openPanel(html: string, opts: { clear?: boolean } = {}) {
    $('#panel').innerHTML = html;
    $('#overlay').classList.toggle('clear', !!opts.clear);
    $('#overlay').hidden = false;
    this.paused = true;
    $('#tray').hidden = true;
    this.setHeld(null);
    document.querySelectorAll('.act.selected').forEach((b) => b.classList.remove('selected'));
  }

  private closePanel() {
    $('#overlay').hidden = true;
    $('#panel').innerHTML = '';
    const st = this.state;
    this.paused = !((st.part === 'morning' && st.phase === 'care') || (st.part === 'evening' && !st.evening.over));
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  showTitle(hasSave: boolean) {
    this.openPanel(`
      <img class="title-dragon" src="./icon.svg" alt="" />
      <h1>Dragon Keeper</h1>
      <p class="sub">Prototype 1: Morning Care</p>
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
        if (this.state.part === 'morning' && this.state.phase === 'done') this.showJune();
        if (this.state.part === 'evening' && this.state.evening.t === 0) this.showEveningIntro();
        if (this.state.part === 'evening' && this.state.evening.awaiting) this.showVisitor(this.state.evening.awaiting);
        if (this.state.part === 'evening' && this.state.evening.over) this.showBedtime();
        this.render();
      }),
    );
  }

  private newGame() {
    clearSave();
    const fresh = initialState((Date.now() >>> 0) ^ 0x9e3779b9);
    this.state = fresh;
    this.scene.scene.restart(this.scene.bootData);
    this.research.hide();
    this.closePanel();
  }

  private showNaming() {
    if (this.state.phase !== 'naming') return;
    this.openPanel(`
      <h2>Your dragon needs a name!</h2>
      <div class="row">${NAME_IDEAS.map((n) => `<button class="choice" data-name="${n}">${n}</button>`).join('')}</div>
      <div class="row"><input class="name" maxlength="16" placeholder="...or type your own" aria-label="Type your own name" /></div>
      <p class="sub">Names stay on this device.</p>
      <div class="row"><button class="btn big" id="name-ok" disabled>That's the name!</button></div>`);
    let chosen = '';
    const ok = $('#name-ok') as HTMLButtonElement;
    const input = $('#panel input.name') as HTMLInputElement;
    $('#panel')
      .querySelectorAll<HTMLButtonElement>('[data-name]')
      .forEach((b) =>
        b.addEventListener('click', () => {
          sfx.play('tap');
          chosen = b.dataset.name!;
          input.value = '';
          $('#panel').querySelectorAll('.choice').forEach((c) => c.classList.toggle('picked', c === b));
          ok.disabled = false;
        }),
      );
    input.addEventListener('input', () => {
      chosen = input.value.trim();
      $('#panel').querySelectorAll('.choice').forEach((c) => c.classList.remove('picked'));
      ok.disabled = chosen.length === 0;
    });
    ok.addEventListener('click', () => {
      this.closePanel();
      this.dispatch({ type: 'name', name: chosen });
      this.paused = false;
      this.toast(`Hello, ${this.name}! It's hungry, chilly and a bit scared. Help it get ready for the day.`);
    });
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
    this.spiceScoops = {};
    const total = () => Object.values(this.spiceScoops).reduce((a, b) => a + b, 0);
    const draw = () => {
      const scoops = content.spices.flatMap((sp) => Array.from({ length: this.spiceScoops[sp.id] ?? 0 }, () => sp.color));
      const tally = content.spices
        .filter((sp) => this.spiceScoops[sp.id])
        .map((sp) => `${sp.name} ${this.spiceScoops[sp.id]}`)
        .join(' · ');
      $('#panel').innerHTML = `
        <h2>🫙 Spice tin</h2>
        <div class="spice-wrap">
          <div>
            <div class="recipe-card"><b>${esc(recipe.name)}</b><br/>${esc(recipe.card)}<br/><span class="sub">From Aunt June's notebook</span></div>
            <div class="jars" style="margin-top:12px">${content.spices
              .map((sp) => `<button class="jar" data-sp="${sp.id}"><div class="powder" style="background:${sp.color}"></div>${esc(sp.name)}</button>`)
              .join('')}</div>
          </div>
          <div class="tin">
            <div class="tin-body">${scoops.map((c) => `<div class="scoop" style="background:${c}"></div>`).join('')}</div>
            <div class="tin-count">${total()} scoop${total() === 1 ? '' : 's'}</div>
            <div class="tally">${tally}</div>
          </div>
        </div>
        <div class="row">
          <button class="btn ghost" data-x="empty" ${total() ? '' : 'disabled'}>Empty tin</button>
          <button class="btn" data-x="feed" ${total() ? '' : 'disabled'}>Feed the mix</button>
          <button class="btn ghost" data-x="close">Close</button>
        </div>`;
      const p = $('#panel');
      p.querySelectorAll<HTMLButtonElement>('[data-sp]').forEach((b) =>
        b.addEventListener('click', () => {
          if (total() >= 9) return this.toast('The tin is full!');
          this.spiceScoops[b.dataset.sp!] = (this.spiceScoops[b.dataset.sp!] ?? 0) + 1;
          sfx.play('pour');
          draw();
        }),
      );
      p.querySelector('[data-x="empty"]')!.addEventListener('click', () => {
        this.spiceScoops = {};
        draw();
      });
      p.querySelector('[data-x="close"]')!.addEventListener('click', () => this.closePanel());
      p.querySelector('[data-x="feed"]')!.addEventListener('click', () => {
        const scoops = { ...this.spiceScoops };
        this.closePanel();
        this.dispatch({ type: 'spice', scoops });
      });
    };
    this.openPanel('');
    draw();
  }

  private showFixIt() {
    if (!this.state.fixIt) return;
    this.openPanel(`
      <h2>Fix-It: scorched sock</h2>
      <p>Rub the soot off with your finger!</p>
      <div class="fixit-area"><img src="${dataUri(sockArt(false), 2)}" alt="A striped sock covered in soot" /></div>
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
    const items = [
      [st.balancedPlate, 'A balanced breakfast (meat, greens, minerals)'],
      [st.perfectMix, 'A perfect spice mix'],
      [st.thoughtsSolved.length > 0, `Understood ${st.thoughtsSolved.length} of ${content.thoughts.length} dragon thoughts`],
      ...(st.fixItsDone > 0 ? ([[true, 'Cleaned up a scorched sock']] as [boolean, string][]) : []),
      [st.readyAt !== null, mins === null ? 'Ready for the day' : `Ready for the day in about ${mins} minute${mins === 1 ? '' : 's'}`],
    ] as [boolean, string][];
    this.openPanel(`
      <h2>Morning done! 🎒</h2>
      <div class="summary">
        <figure class="polaroid">${shot ? `<img src="${shot}" alt="A picture of your dragon" />` : ''}<figcaption>${this.name}, Day 1</figcaption></figure>
        <div>
          <p><b>What you figured out:</b></p>
          <ul class="checklist">${items.map(([ok, t]) => `<li>${ok ? '✅' : '⚪'} ${esc(t)}</li>`).join('')}</ul>
          <div>${this.state.stickers.map((s) => `<span class="sticker">⭐ ${esc(s)}</span>`).join('')}</div>
        </div>
      </div>
      <div class="row"><button class="btn big" data-x="next">Off to school ➜ the afternoon</button></div>`);
    sfx.play('trill');
    $('#panel [data-x="next"]').addEventListener('click', () => this.showJune());
  }

  /** Aunt June explains who the collector is and why the dragon needs protecting. */
  private showJune() {
    const j = content.story.juneIntro;
    this.openPanel(`
      <div class="thought-icons" aria-hidden="true">${j.emoji}</div>
      <h2>${esc(j.title)} <button class="speak" data-x="read" aria-label="Read aloud">🔈</button></h2>
      <div class="story">${j.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
      <p class="hint">🤝 ${esc(j.closing)}</p>
      <div class="row"><button class="btn big" data-x="next">${esc(j.button)}</button></div>`);
    $('#panel [data-x="read"]').addEventListener('click', () => this.speakText([...j.paragraphs, j.closing].join(' ')));
    $('#panel [data-x="next"]').addEventListener('click', () => {
      sfx.play('tap');
      this.showAfternoonIntro();
    });
  }

  /** Introduces the household (who Kit is) and recaps the evening's goals. */
  private showEveningIntro() {
    if (this.state.part !== 'evening' || this.state.evening.t > 0) return;
    const j = content.story.eveningIntro;
    const fill = (t: string) => esc(t).replaceAll('{name}', this.name);
    this.openPanel(`
      <div class="thought-icons" aria-hidden="true">${j.emoji}</div>
      <h2>${esc(j.title)} <button class="speak" data-x="read" aria-label="Read aloud">🔈</button></h2>
      <div class="story">${j.paragraphs.map((p) => `<p>${fill(p)}</p>`).join('')}</div>
      <div class="row"><button class="btn big" data-x="go">${esc(j.button)}</button></div>`);
    $('#panel [data-x="read"]').addEventListener('click', () => this.speakText(j.paragraphs.join(' ').replaceAll('{name}', this.state.dragon.name)));
    $('#panel [data-x="go"]').addEventListener('click', () => {
      sfx.play('tap');
      this.closePanel();
    });
  }

  private showAfternoonIntro() {
    this.openPanel(`
      <h2>📚 After school: Larkspur Library</h2>
      <p>The librarian, Ms. Ortiz, points you to Computer 2.</p>
      <p class="riddle">Find out: ${esc(content.archive.question)}</p>
      <p class="sub">Tonight your family will knock on your door, and ${this.name} gets scared of knocks. Search the dragon-care websites, and check each one before you trust it: remember Aunt June's warning about Crane's fake websites!</p>
      <div class="row"><button class="btn big" data-x="go">Start searching</button></div>`);
    $('#panel [data-x="go"]').addEventListener('click', () => {
      sfx.play('tap');
      this.closePanel();
      this.dispatch({ type: 'startAfternoon' });
    });
  }

  private showVisitor(id: string) {
    const v = content.evening.visitors.find((x) => x.id === id)!;
    if (this.state.evening.awaiting !== id) return;
    this.openPanel(`
      <div class="thought-icons" aria-hidden="true">${v.emoji}</div>
      <p>${esc(v.noisyLine)}</p>
      <p><b>What do you say?</b> <span class="sub">(Every choice is honest: you never have to lie.)</span></p>
      <div class="col">${v.choices.map((c) => `<button class="choice" data-c="${c.id}">${esc(c.label)}</button>`).join('')}</div>`);
    $('#panel').querySelectorAll<HTMLButtonElement>('[data-c]').forEach((b) =>
      b.addEventListener('click', () => {
        const c = v.choices.find((x) => x.id === b.dataset.c)!;
        this.closePanel();
        this.dispatch({ type: 'visitorChoice', choiceId: c.id });
        this.toast(esc(c.result));
      }),
    );
  }

  private showBedtime() {
    if (this.state.part !== 'evening') return;
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

  private async showDaySummary() {
    const s = this.state;
    const shot = await this.scene.snapshot();
    const st = s.stats;
    const r = s.research;
    const e = s.evening;
    const a = s.world.collectorAttention;
    const line = (ok: boolean, t: string) => `<li>${ok ? '✅' : '⚪'} ${esc(t)}</li>`;
    const ratedRight = Object.entries(r.ratings).filter(([id, rating]) => {
      const p = content.archive.pages.find((x) => x.id === id)!;
      return (p.credibility === 'trusted' && rating === 'trust') || (p.credibility === 'mixed' && rating !== 'trust') || (p.credibility === 'trap' && rating === 'distrust');
    }).length;
    const circle = s.world.circle.map((m) => (m === 'june' ? 'Aunt June' : m === 'kit' ? 'Kit' : m));
    this.openPanel(`
      <h2>Day 1 complete! 🌙</h2>
      <div class="summary">
        <figure class="polaroid small">${shot ? `<img src="${shot}" alt="Your dragon asleep in the nest" />` : ''}<figcaption>${this.name}, asleep</figcaption></figure>
        <div class="day-cols">
          <div><b>☀️ Morning</b><ul class="checklist">
            ${line(st.balancedPlate, 'Balanced breakfast')}${line(st.perfectMix, 'Perfect spice mix')}${line(st.readyAt !== null, 'Ready for the day')}</ul></div>
          <div><b>📚 Afternoon</b><ul class="checklist">
            ${line(r.foundAnswerOnSearch !== null, r.foundAnswerOnSearch ? `Found the answer in ${r.foundAnswerOnSearch} search${r.foundAnswerOnSearch === 1 ? '' : 'es'}` : 'Found the answer')}
            ${Object.keys(r.ratings).length ? line(ratedRight > 0, `Judged ${ratedRight} of ${Object.keys(r.ratings).length} websites right`) : line(false, 'Checked a website before trusting it')}
            ${Object.keys(r.trapChoices).length ? line(!Object.values(r.trapChoices).includes('share'), 'Kept your address private') : line(false, 'Spotted a trap website')}</ul></div>
          <div><b>🌙 Evening</b><ul class="checklist">
            ${line(e.noisy === 0, `${e.quiet} of ${content.evening.visitors.length} visits stayed quiet`)}
            ${line(e.missed === 0, `Spotted ${e.spotted} of ${content.evening.windowThings.filter((w) => w.suspicious).length} scouts`)}</ul></div>
        </div>
      </div>
      <p>👁️ The collector is <b>${attentionWord(a).replace('!', '')}</b>${a < 20 ? '. Your dragon is safe!' : a < 50 ? '. Be careful tomorrow.' : '. BLINK will be back...'} · 🤝 Keeper Circle: ${esc(circle.join(', '))}</p>
      <div>${s.stickers.map((x) => `<span class="sticker">⭐ ${esc(x)}</span>`).join('')}</div>
      <p class="sub">Thanks for playtesting Day 1!</p>
      <div class="row">
        <button class="btn big" data-x="again">Play again</button>
        <button class="btn big ghost" data-x="more">📖 Find out more</button>
      </div>`);
    sfx.play('trill');
    $('#panel [data-x="more"]').addEventListener('click', () => {
      sfx.play('tap');
      showFindOutMore($('#panel'), () => void this.showDaySummary());
    });
    $('#panel [data-x="again"]').addEventListener('click', () => {
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
        else if (act === 'finish') isReady(this.state) ? this.finish() : this.confirmFinish();
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
            this.toast("You don't know how to use the blanket yet. Did the library have any tips?");
          } else this.dispatch({ type: 'blanket' });
        }
      }),
    );
    $('#bubble').addEventListener('click', () => {
      sfx.play('tap');
      this.showThought();
    });

    const soundBtn = $('#btn-sound');
    const readBtn = $('#btn-read');
    const syncToggles = () => {
      soundBtn.classList.toggle('off', !sfx.enabled);
      soundBtn.textContent = sfx.enabled ? '🔊' : '🔇';
      readBtn.classList.toggle('off', !this.readAloud);
    };
    soundBtn.addEventListener('click', () => {
      sfx.unlock();
      sfx.enabled = !sfx.enabled;
      savePref('sound', sfx.enabled);
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
      `<div class="tray-hint">Drag food to your dragon (or tap food, then tap the dragon)</div>` +
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
