import { sfx } from '../audio/sfx';
import { CHECK_KEYS, content, type CheckKey, type PageDef } from '../core/content';
import { attentionWord, ratingIsCorrect } from '../core/day';
import type { Action, GameEvent, GameState, Rating, TrapChoice } from '../core/state';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const CHECK_LABEL: Record<CheckKey, string> = { who: '🧑 Who made it?', when: '📅 When?', why: '🎯 Why does it exist?', proof: '🔍 Does another source agree?' };
const RATING_LABEL: Record<Rating, string> = { trust: '👍 I trust it', unsure: '🤔 Not sure', distrust: '👎 Don\'t trust it' };

const FEEDBACK: Record<PageDef['credibility'], { right: string; wrong: string }> = {
  trusted: {
    right: 'Good call! Real names, a recent date, nothing to sell, and Aunt June\'s notebook agrees.',
    wrong: 'Look at the checks again: real names, a recent date, nothing for sale, and another source agrees. This page is trustworthy.',
  },
  mixed: {
    right: 'Smart! Some facts here are true, but there\'s no author or date, and some facts are wrong. Check facts like these somewhere else.',
    wrong: 'Careful! No author, no date, and Fact #7 disagrees with other sources. Shouting scares hatchlings!',
  },
  trap: {
    right: 'You spotted a trap! Real helpers never need to know where you live.',
    wrong: 'Look closer: this site is a trap. It wants to know where you live.',
  },
};

const SEARCH_MSG = {
  empty: 'Tap some words, then press Search.',
  none: 'No results. Try different words.',
  'too-many': 'Lots of results! Add another word to narrow it down.',
  ok: '',
};

export interface ResearchHost {
  state: GameState;
  dispatch(a: Action): GameEvent[];
  toast(html: string): void;
  speakText(text: string): void;
}

/** The library computer: a pretend web browser with keyword search and source checks. */
export class ResearchScreen {
  private root: HTMLElement;
  private chips: string[] = [];
  private view: 'search' | string = 'search';
  private homeAsked = false;

  constructor(private host: ResearchHost) {
    this.root = document.getElementById('research')!;
  }

  show() {
    if (this.root.hidden) {
      this.view = 'search';
      this.chips = [];
      this.homeAsked = false;
    }
    this.root.hidden = false;
    this.render();
  }

  hide() {
    this.root.hidden = true;
  }

  render() {
    if (this.root.hidden) return;
    const s = this.host.state;
    const a = s.world.collectorAttention;
    const done = s.research.tipSaved;
    this.root.innerHTML = `
      <div class="lib-top">
        <div class="lib-title">📚 Larkspur Library · Computer 2</div>
        <div class="pill attention ${a >= 20 ? 'warn' : ''}" title="Collector Attention">👁️ Collector: <b>${attentionWord(a)}</b></div>
        <button class="btn ${done ? '' : 'ghost'} small" data-x="home">Head home ➜</button>
      </div>
      <div class="question ${done ? 'done' : ''}">${done ? '✅' : '❓'} <b>Find out:</b> ${esc(content.archive.question)}</div>
      <div class="browser">
        <div class="urlbar">
          <button class="nav" data-x="back" ${this.view === 'search' ? 'disabled' : ''} aria-label="Back">◀</button>
          <div class="url">${this.view === 'search' ? 'search.keep' : esc(this.page(this.view).site)}</div>
        </div>
        <div class="viewport">${this.view === 'search' ? this.searchView() : this.pageView(this.page(this.view))}</div>
      </div>`;
    this.bind();
  }

  private page(id: string) {
    return content.archive.pages.find((p) => p.id === id)!;
  }

  private searchView() {
    const r = this.host.state.research;
    const max = content.archive.maxChips;
    const results = r.results.map((id) => this.page(id));
    return `
      <div class="search-box">${this.chips.length ? this.chips.map((c) => `<span class="q-chip">${c}</span>`).join(' ') : '<span class="sub">Tap up to ' + max + ' words…</span>'}
        <button class="btn small" data-x="search">🔎 Search</button></div>
      <div class="chips">${content.archive.chips
        .map((c) => `<button class="chip ${this.chips.includes(c) ? 'on' : ''}" data-chip="${c}">${c}</button>`)
        .join('')}</div>
      ${r.feedback && SEARCH_MSG[r.feedback] ? `<p class="search-msg">${SEARCH_MSG[r.feedback]}</p>` : ''}
      <div class="results">${results
        .map(
          (p) => `<button class="result" data-open="${p.id}">
            <span class="r-title">${esc(p.title)}</span>
            <span class="r-site">${esc(p.site)}</span>
            <span class="r-snip">${esc(p.snippet)}</span></button>`,
        )
        .join('')}</div>`;
  }

  private pageView(p: PageDef) {
    const r = this.host.state.research;
    const revealed = r.checks[p.id] ?? [];
    const rating = r.ratings[p.id];
    const trap = r.trapChoices[p.id];
    const isAnswer = p.id === content.archive.answerPageId;
    const fb = rating ? FEEDBACK[p.credibility][ratingIsCorrect(p, rating) ? 'right' : 'wrong'] : '';
    const trapBox = p.trap
      ? `<div class="trap-box">
          <p><b>${esc(p.trap.prompt)}</b></p>
          ${
            trap
              ? `<p class="trap-result">${
                  trap === 'share'
                    ? '😬 You shared your street. Somewhere, a red light blinks on... (Collector Attention went up.)'
                    : trap === 'ask'
                      ? '📞 Aunt June says: "Never tell a website where you live. Close it, and check who made it!"'
                      : '🛡️ You closed it. Your address stays private!'
                }</p>`
              : `<div class="row">
                  <button class="choice" data-trap="share">Share my street</button>
                  <button class="choice" data-trap="ask">Ask Aunt June first</button>
                  <button class="choice" data-trap="close">Close the page</button>
                </div>`
          }
        </div>`
      : '';
    return `
      <article class="site site-${p.credibility === 'trusted' ? 'commons' : p.id}">
        <h3>${esc(p.title)}</h3>
        ${p.body.map((b) => `<p>${esc(b)}</p>`).join('')}
        <button class="speak" data-x="read" aria-label="Read this page aloud">🔈</button>
      </article>
      ${trapBox}
      <div class="nest-check">
        <p class="nc-title">🪺 Check the Nest <span class="sub">(tap each one)</span></p>
        <div class="checks">${CHECK_KEYS.map(
          (k) => `<button class="check ${revealed.includes(k) ? 'open' : ''}" data-check="${k}">
            <b>${CHECK_LABEL[k]}</b>${revealed.includes(k) ? `<span>${esc(p.checks[k])}</span>` : ''}</button>`,
        ).join('')}</div>
        <p class="nc-title">Do you trust this page?</p>
        <div class="row">${(Object.keys(RATING_LABEL) as Rating[])
          .map((k) => `<button class="choice ${rating === k ? 'picked' : ''}" data-rate="${k}">${RATING_LABEL[k]}</button>`)
          .join('')}</div>
        ${fb ? `<p class="hint">${esc(fb)}</p>` : ''}
      </div>
      ${
        isAnswer && rating === 'trust'
          ? `<div class="tip-box">${
              r.tipSaved
                ? `✅ <b>Saved to your journal:</b> ${esc(p.tip!.text)}<br/><span class="sub">You can use a blanket tonight! Head home when you're ready.</span>`
                : `<p><b>💡 Useful tip:</b> ${esc(p.tip!.text)}</p><button class="btn" data-x="save">📓 Save this tip to my journal</button>`
            }</div>`
          : ''
      }`;
  }

  private bind() {
    const q = <T extends HTMLElement>(sel: string) => [...this.root.querySelectorAll<T>(sel)];
    const tap = () => {
      sfx.unlock();
      sfx.play('tap');
    };
    q('[data-chip]').forEach((b) =>
      b.addEventListener('click', () => {
        tap();
        const c = b.dataset.chip!;
        if (this.chips.includes(c)) this.chips = this.chips.filter((x) => x !== c);
        else if (this.chips.length < content.archive.maxChips) this.chips.push(c);
        else this.host.toast(`Up to ${content.archive.maxChips} words. Tap a word again to remove it.`);
        this.render();
      }),
    );
    q('[data-x="search"]').forEach((b) =>
      b.addEventListener('click', () => {
        tap();
        this.host.dispatch({ type: 'search', chips: this.chips });
        const target = this.root.querySelector('.search-msg') ?? this.root.querySelector('.results');
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }),
    );
    q('[data-open]').forEach((b) =>
      b.addEventListener('click', () => {
        tap();
        this.view = b.dataset.open!;
        this.host.dispatch({ type: 'openPage', pageId: this.view });
        this.root.querySelector('.viewport')?.scrollTo(0, 0);
      }),
    );
    q('[data-x="back"]').forEach((b) =>
      b.addEventListener('click', () => {
        tap();
        this.view = 'search';
        this.render();
      }),
    );
    q('[data-check]').forEach((b) =>
      b.addEventListener('click', () => {
        tap();
        this.host.dispatch({ type: 'check', pageId: this.view, check: b.dataset.check as CheckKey });
      }),
    );
    q('[data-rate]').forEach((b) =>
      b.addEventListener('click', () => {
        const evs = this.host.dispatch({ type: 'rate', pageId: this.view, rating: b.dataset.rate as Rating });
        const ok = evs.some((e) => e.type === 'rated' && e.correct);
        sfx.play(ok ? 'sparkle' : 'sniff');
      }),
    );
    q('[data-trap]').forEach((b) =>
      b.addEventListener('click', () => {
        tap();
        this.host.dispatch({ type: 'trapChoice', pageId: this.view, choice: b.dataset.trap as TrapChoice });
      }),
    );
    q('[data-x="save"]').forEach((b) =>
      b.addEventListener('click', () => {
        sfx.play('trill');
        this.host.dispatch({ type: 'saveTip' });
        this.host.toast('Tip saved! Tonight you can cover the nest with a blanket.');
      }),
    );
    q('[data-x="read"]').forEach((b) =>
      b.addEventListener('click', () => {
        const p = this.page(this.view);
        this.host.speakText(`${p.title}. ${p.body.join(' ')}`);
      }),
    );
    q('[data-x="home"]').forEach((b) =>
      b.addEventListener('click', () => {
        tap();
        if (!this.host.state.research.tipSaved && !this.homeAsked) {
          this.homeAsked = true;
          this.host.toast("You haven't saved a tip for tonight yet. Tap <b>Head home</b> again to go anyway.");
          return;
        }
        this.host.dispatch({ type: 'startEvening' });
      }),
    );
  }
}
