import { dataUri, foodArt } from '../art/svg';
import { sfx } from '../audio/sfx';
import { content } from '../core/content';
import { cartServings, unitPrice } from '../core/days';
import type { Action, GameEvent, GameState } from '../core/state';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** $5.40, or 60¢ for amounts under a dollar. */
export function money(cents: number): string {
  const c = Math.round(cents);
  return c < 100 ? `${c}¢` : `$${(c / 100).toFixed(2)}`;
}

/** 80¢, or 65¢; rounds to the nearest cent for display. */
function perServing(cents: number): string {
  return money(Math.round(cents));
}

export interface StoreHost {
  state: GameState;
  dispatch(a: Action): GameEvent[];
  toast(html: string): void;
}

/** Mr. Patel's corner store (Day 2): unit prices, a budget, paying and checking change. */
export class StoreScreen {
  private root: HTMLElement;
  private showUnit = new Set<string>();
  private tender: number[] = []; // indexes into the wallet
  private paying = false;
  private homeAsked = false;

  constructor(private host: StoreHost) {
    this.root = document.getElementById('store')!;
  }

  show() {
    if (this.root.hidden) {
      this.showUnit.clear();
      this.tender = [];
      this.paying = false;
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
    const st = s.store;
    const store = content.store;
    const keepScroll = this.root.querySelector<HTMLElement>('.shelf-wrap')?.scrollTop ?? 0;
    const got = cartServings(st.cart, content);
    const over = st.total > s.coins && !st.paid;
    const listDone = store.list.every((l) => (got[l.food] ?? 0) >= l.servings);

    this.root.innerHTML = `
      <div class="lib-top">
        <div class="lib-title">🏪 ${esc(store.shopkeeper)}'s Corner Store</div>
        <div class="pill" title="Money in your wallet">👛 ${money(st.paid ? s.coins : s.coins)}</div>
        <button class="btn ${st.paid ? '' : 'ghost'} small" data-x="home">Head home ➜</button>
      </div>
      <div class="question ${listDone ? 'done' : ''}">📝 <b>Shopping list:</b> ${store.list
        .map((l) => `${(got[l.food] ?? 0) >= l.servings ? '✅' : '⬜'} ${esc(l.label)} <span class="sub">(${got[l.food] ?? 0} in cart)</span>`)
        .join(' &nbsp; ')}</div>
      <div class="shelf-wrap">
        ${st.paid ? this.paidView() : this.shelfView(over)}
      </div>`;
    const wrap = this.root.querySelector<HTMLElement>('.shelf-wrap');
    if (wrap) wrap.scrollTop = keepScroll;
    this.bind();
  }

  private shelfView(over: boolean) {
    const s = this.host.state;
    const st = s.store;
    const items = content.store.items
      .map((it) => {
        const n = st.cart[it.id] ?? 0;
        const unit = this.showUnit.has(it.id)
          ? `<span class="unit">${money(it.price)} ÷ ${it.servings} = <b>${perServing(unitPrice(it))}</b> per serving</span>`
          : `<button class="link" data-unit="${it.id}">🧮 Price per serving?</button>`;
        return `<div class="item ${n ? 'in-cart' : ''}">
          ${it.tag ? `<span class="tag">${esc(it.tag)}</span>` : ''}
          <img src="${dataUri(foodArt[it.art], 2)}" alt="" />
          <div class="item-name">${esc(it.name)}</div>
          <div class="item-price"><b>${money(it.price)}</b> · ${it.servings} serving${it.servings === 1 ? '' : 's'}</div>
          ${unit}
          <div class="qty">
            <button class="qbtn" data-rm="${it.id}" aria-label="Remove one" ${n ? '' : 'disabled'}>−</button>
            <span class="n">${n}</span>
            <button class="qbtn" data-add="${it.id}" aria-label="Add one">+</button>
          </div>
        </div>`;
      })
      .join('');
    const pay = this.paying ? this.payView() : '';
    return `<div class="shelf">${items}</div>
      <div class="till">
        <span>Basket: <b>${money(st.total)}</b></span>
        ${over ? `<span class="warn-text">That's more than your ${money(s.coins)}!</span>` : ''}
        <button class="btn" data-x="pay" ${st.total === 0 || over || this.paying ? 'disabled' : ''}>Pay</button>
      </div>
      ${pay}`;
  }

  private payView() {
    const s = this.host.state;
    const wallet = content.store.wallet;
    const tendered = this.tender.reduce((a, i) => a + wallet[i], 0);
    return `<div class="pay-box">
      <p><b>${esc(content.store.shopkeeper)}:</b> "That's ${money(s.store.total)}, please." Tap the money you'll hand over.</p>
      <div class="row wallet">${wallet
        .map((c, i) => `<button class="coin ${c >= 100 ? 'bill' : ''} ${this.tender.includes(i) ? 'picked' : ''}" data-coin="${i}">${money(c)}</button>`)
        .join('')}</div>
      <p>Handing over: <b>${money(tendered)}</b></p>
      <div class="row">
        <button class="btn" data-x="hand" ${tendered >= s.store.total ? '' : 'disabled'}>Hand it over</button>
        <button class="btn ghost" data-x="cancel">Back</button>
      </div>
    </div>`;
  }

  private paidView() {
    const st = this.host.state.store;
    const due = st.tendered - st.total;
    const checked = st.changeChecked;
    const result = checked
      ? checked === 'wrong'
        ? `🎉 Good catch! You handed over ${money(st.tendered)} for ${money(st.total)}, so the change should be <b>${money(due)}</b>. ${esc(content.store.shopkeeper)} laughs: "Sharp eyes! Here's the rest."`
        : `Let's check: ${money(st.tendered)} − ${money(st.total)} = <b>${money(due)}</b>, but you got ${money(st.changeGiven ?? 0)}. ${esc(content.store.shopkeeper)} says, "Oops, my mistake!" and hands you the rest. Always count your change!`
      : '';
    return `<div class="pay-box">
      <p>You handed over <b>${money(st.tendered)}</b> for food costing <b>${money(st.total)}</b>.</p>
      <p><b>${esc(content.store.shopkeeper)}:</b> "Here's your change: <b>${money(st.changeGiven ?? 0)}</b>. Did I get that right?"</p>
      ${
        checked
          ? `<p class="hint">${result}</p><p class="sub">Your food is in your bag. Head home when you're ready!</p>`
          : `<div class="row"><button class="choice" data-change="right">"Yes, that's right."</button><button class="choice" data-change="wrong">"No, that's not right."</button></div>`
      }
    </div>`;
  }

  private bind() {
    const q = <T extends HTMLElement>(sel: string) => [...this.root.querySelectorAll<T>(sel)];
    const tap = () => {
      sfx.unlock();
      sfx.play('tap');
    };
    q('[data-add]').forEach((b) =>
      b.addEventListener('click', () => {
        tap();
        this.host.dispatch({ type: 'addToCart', itemId: b.dataset.add! });
      }),
    );
    q('[data-rm]').forEach((b) =>
      b.addEventListener('click', () => {
        tap();
        this.host.dispatch({ type: 'removeFromCart', itemId: b.dataset.rm! });
      }),
    );
    q('[data-unit]').forEach((b) =>
      b.addEventListener('click', () => {
        tap();
        this.showUnit.add(b.dataset.unit!);
        this.render();
      }),
    );
    q('[data-x="pay"]').forEach((b) =>
      b.addEventListener('click', () => {
        tap();
        this.paying = true;
        this.tender = [];
        this.render();
        this.root.querySelector('.pay-box')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }),
    );
    q('[data-coin]').forEach((b) =>
      b.addEventListener('click', () => {
        sfx.play('tap');
        const i = Number(b.dataset.coin);
        this.tender = this.tender.includes(i) ? this.tender.filter((x) => x !== i) : [...this.tender, i];
        this.render();
      }),
    );
    q('[data-x="cancel"]').forEach((b) =>
      b.addEventListener('click', () => {
        tap();
        this.paying = false;
        this.render();
      }),
    );
    q('[data-x="hand"]').forEach((b) =>
      b.addEventListener('click', () => {
        sfx.play('pour');
        const wallet = content.store.wallet;
        this.host.dispatch({ type: 'pay', tender: this.tender.map((i) => wallet[i]) });
        this.paying = false;
        this.root.querySelector('.pay-box')?.scrollIntoView({ block: 'nearest' });
      }),
    );
    q('[data-change]').forEach((b) =>
      b.addEventListener('click', () => {
        const evs = this.host.dispatch({ type: 'checkChange', answer: b.dataset.change as 'right' | 'wrong' });
        sfx.play(evs.some((e) => e.type === 'change-checked' && e.correct) ? 'sparkle' : 'sniff');
      }),
    );
    q('[data-x="home"]').forEach((b) =>
      b.addEventListener('click', () => {
        tap();
        if (!this.host.state.store.paid && !this.homeAsked) {
          this.homeAsked = true;
          this.host.toast("You haven't bought any food yet. Tap <b>Head home</b> again to go anyway (Aunt June will share some).");
          return;
        }
        this.host.dispatch({ type: 'startEvening' });
      }),
    );
  }
}
