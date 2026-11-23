import Phaser from 'phaser';
import {
  bedroom,
  blanketArt,
  bowl,
  dragonParts,
  egg,
  eggCracks,
  floorLamp,
  foodArt,
  heart,
  lampGlow,
  nestFront,
  nightWindow,
  note,
  ROOM,
  sockArt,
  slipperArt,
  sparkle,
  windowThingArt,
  zzz,
  type Art,
} from '../art/svg';
import { content, eveningFor } from '../core/content';
import type { GameEvent, GameState } from '../core/state';

export const TEX_SCALE = 2;

/** Every texture the scene uses, generated from SVG. */
export function textureList(): Record<string, Art> {
  const list: Record<string, Art> = {
    bedroom,
    egg,
    bowl,
    heart,
    sparkle,
    note,
    sock: sockArt(false),
    sockScorched: sockArt(true),
    slipperChewed: slipperArt(true),
    nightWindow,
    floorLamp,
    lampGlow,
    blanket: blanketArt,
    nestFront,
    zzz,
  };
  for (const [k, a] of Object.entries(windowThingArt)) list[`thing-${k}`] = a;
  for (const [k, a] of Object.entries(dragonParts)) list[`dragon-${k}`] = a;
  eggCracks.forEach((a, i) => (list[`crack${i}`] = a));
  for (const [k, a] of Object.entries(foodArt)) list[`food-${k}`] = a;
  return list;
}

export interface SceneCallbacks {
  onEggTap(): void;
  onDragonTap(): void;
  onPet(amount: number): void;
  onScorchedSockTap(): void;
  onReady(): void;
  onCreated(scene: BedroomScene): void;
  onWindowTap(thingId: string): void;
}

// Draw order, back to front.
const DEPTH = { room: 0, decor: 1, overlay: 5, window: 6, thing: 7, curtain: 8, glow: 9, dragon: 10, blanket: 11, nestFront: 12, fx: 20, input: 30 };

type Mood = 'content' | 'happy' | 'cold' | 'hungry' | 'nervous';

const HALF = 1 / TEX_SCALE;

export class BedroomScene extends Phaser.Scene {
  private cb!: SceneCallbacks;
  private images!: Record<string, HTMLImageElement>;
  private state: GameState | null = null;

  private dragon!: Phaser.GameObjects.Container;
  private headC!: Phaser.GameObjects.Container;
  private eyesC!: Phaser.GameObjects.Container;
  private parts: Record<string, Phaser.GameObjects.Image> = {};
  private eggC!: Phaser.GameObjects.Container;
  private cracks: Phaser.GameObjects.Image[] = [];
  private nestSock!: Phaser.GameObjects.Image;
  private floorSock!: Phaser.GameObjects.Image;
  private tailTween?: Phaser.Tweens.Tween;
  private mood: Mood = 'content';
  private busyUntil = 0; // ms timestamp; mood poses wait while a reaction plays
  private petDistance = 0;
  private lastPetPoint: Phaser.Math.Vector2 | null = null;
  private shiver = 0;
  // Where the dragon sits now: the rug by day, the nest at night.
  private bx = ROOM.dragonX;
  private by = ROOM.dragonY;
  private bs = 1;
  private zone!: Phaser.GameObjects.Zone;
  private night = false;
  private sleeping = false;
  private overlay!: Phaser.GameObjects.Graphics;
  private nightWin!: Phaser.GameObjects.Image;
  private glowImg!: Phaser.GameObjects.Image;
  private blanketImg!: Phaser.GameObjects.Image;
  private nestFrontImg!: Phaser.GameObjects.Image;
  private curtains: Phaser.GameObjects.Rectangle[] = [];
  private thing: { id: string; img: Phaser.GameObjects.Image } | null = null;
  private lampDim: boolean | null = null;
  private moving = false;

  constructor() {
    super('bedroom');
  }

  bootData!: { callbacks: SceneCallbacks; images: Record<string, HTMLImageElement> };

  init(data: { callbacks: SceneCallbacks; images: Record<string, HTMLImageElement> }) {
    this.bootData = data;
    this.cb = data.callbacks;
    this.images = data.images;
    this.state = null;
    this.parts = {};
    this.mood = 'content';
    this.busyUntil = 0;
    this.shiver = 0;
    this.bx = ROOM.dragonX;
    this.by = ROOM.dragonY;
    this.bs = 1;
    this.night = false;
    this.sleeping = false;
    this.thing = null;
    this.lampDim = null;
    this.curtains = [];
    this.moving = false;
  }

  create() {
    for (const [key, img] of Object.entries(this.images)) {
      if (!this.textures.exists(key)) this.textures.addImage(key, img);
    }
    const img = (x: number, y: number, key: string) => this.add.image(x, y, key).setScale(HALF);

    img(ROOM.w / 2, ROOM.h / 2, 'bedroom');
    this.nestSock = img(ROOM.nestX, ROOM.nestY - 14, 'sock').setScale(HALF * 0.8).setAngle(-8).setVisible(false);
    img(ROOM.bowlX, ROOM.bowlY, 'bowl');
    this.floorSock = img(ROOM.sockX, ROOM.sockY, 'sockScorched').setVisible(false).setInteractive({ useHandCursor: true });
    this.floorSock.on('pointerdown', () => this.cb.onScorchedSockTap());
    this.floorSock.setDepth(DEPTH.decor + 1);
    this.tweens.add({ targets: this.floorSock, angle: { from: -6, to: 6 }, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    img(ROOM.lampX, ROOM.lampY, 'floorLamp').setDepth(DEPTH.decor);

    this.buildNight();
    this.buildDragon();
    this.buildEgg();
    this.setupPetting();

    this.time.addEvent({ delay: 3200, loop: true, callback: () => this.blink() });
    this.cb.onCreated(this);
  }

  // ---------- construction ----------

  private part(key: string, px: number, py: number): Phaser.GameObjects.Image {
    // All parts share a 300×300 frame; origin at the pivot keeps them aligned.
    const im = this.add.image(0, 0, `dragon-${key}`).setOrigin(px / 300, py / 300).setScale(HALF);
    this.parts[key] = im;
    return im;
  }

  private buildDragon() {
    const wingL = this.part('wingL', 112, 160).setPosition(112 - 150, 160 - 150);
    const wingR = this.part('wingR', 188, 160).setPosition(188 - 150, 160 - 150);
    const tail = this.part('tail', 190, 232).setPosition(190 - 150, 232 - 150);
    const body = this.part('body', 150, 150);
    const glow = this.part('glow', 150, 150).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);

    const head = this.part('head', 150, 160);
    const eyes = this.part('eyes', 150, 98);
    this.eyesC = this.add.container(0, 98 - 160, [eyes]);
    const smile = this.part('mouthSmile', 150, 160);
    const open = this.part('mouthOpen', 150, 160).setVisible(false);
    const worried = this.part('mouthWorried', 150, 160).setVisible(false);
    this.headC = this.add.container(0, 160 - 150, [head, this.eyesC, smile, open, worried]);

    this.dragon = this.add.container(this.bx, this.by, [wingL, wingR, tail, body, glow, this.headC]);
    this.dragon.setVisible(false).setDepth(DEPTH.dragon);

    this.tweens.add({ targets: [body, glow], scaleY: HALF * 1.025, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: this.headC, y: this.headC.y - 3, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.setTailSpeed(1000, 0.12);
  }

  private buildEgg() {
    const e = this.add.image(0, 0, 'egg').setScale(HALF);
    this.cracks = [0, 1, 2].map((i) => this.add.image(0, 0, `crack${i}`).setScale(HALF).setVisible(false));
    this.eggC = this.add.container(this.bx, this.by + 6, [e, ...this.cracks]).setDepth(DEPTH.dragon);
    this.tweens.add({ targets: this.eggC, angle: { from: -2, to: 2 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  private setupPetting() {
    const zone = this.add.zone(this.bx, this.by + 20, 230, 270).setInteractive({ useHandCursor: true }).setDepth(DEPTH.input);
    this.zone = zone;
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.state?.phase === 'egg') return this.cb.onEggTap();
      this.lastPetPoint = new Phaser.Math.Vector2(p.x, p.y);
      this.petDistance = 0;
      this.cb.onDragonTap();
    });
    zone.on('pointermove', (p: Phaser.Input.Pointer) => {
      const canPet = this.state && ((this.state.part === 'morning' && this.state.phase === 'care') || (this.state.part === 'evening' && !this.state.evening.over));
      if (!p.isDown || !this.lastPetPoint || !canPet) return;
      this.petDistance += Phaser.Math.Distance.Between(p.x, p.y, this.lastPetPoint.x, this.lastPetPoint.y);
      this.lastPetPoint.set(p.x, p.y);
      if (this.petDistance > 90) {
        this.petDistance = 0;
        this.cb.onPet(2);
        this.floatUp('heart', p.x, p.y - 20);
      }
    });
    const end = () => (this.lastPetPoint = null);
    zone.on('pointerup', end);
    zone.on('pointerout', end);
  }

  // ---------- state → visuals ----------

  setGameState(s: GameState) {
    const first = this.state === null;
    this.state = s;
    const hatched = s.phase !== 'egg';
    if (first) {
      this.eggC.setVisible(!hatched);
      this.dragon.setVisible(hatched);
      this.cracks.forEach((c, i) => c.setVisible(i < s.eggTaps));
    }
    this.nestSock.setVisible(s.sockInNest && !this.night);
    this.floorSock.setVisible(s.fixIt !== null && s.part === 'morning');
    if (s.fixIt) this.floorSock.setTexture(s.fixIt.id === 'chewed-slipper' ? 'slipperChewed' : 'sockScorched');
    if (s.part === 'evening' || s.part === 'end') this.applyNight(s, first);
    const spark = s.dragon.spark;
    this.parts.glow.setAlpha(Phaser.Math.Clamp((spark - 10) / 70, 0, 1) * 0.9);
    this.applyMood(this.moodFor(s));
  }

  private moodFor(s: GameState): Mood {
    const d = s.dragon;
    if (s.part === 'evening') return d.calm < 50 ? 'nervous' : d.calm >= 70 ? 'happy' : 'content';
    if (s.part !== 'morning' || (s.phase !== 'care' && s.phase !== 'done')) return 'content';
    if (d.calm < 40) return 'nervous';
    if (d.spark < 35) return 'cold';
    if (d.hunger > 55) return 'hungry';
    if (d.hunger <= 30 && d.spark >= 40 && d.spark <= 70 && d.calm >= 70) return 'happy';
    return 'content';
  }

  private applyMood(m: Mood) {
    if (m === this.mood || this.time.now < this.busyUntil) return;
    this.mood = m;
    this.showMouth(m === 'nervous' || m === 'hungry' ? 'mouthWorried' : 'mouthSmile');
    const wingAngle = m === 'nervous' ? 1 : 0;
    this.tweens.add({ targets: this.parts.wingL, angle: wingAngle * 18, duration: 300 });
    this.tweens.add({ targets: this.parts.wingR, angle: -wingAngle * 18, duration: 300 });
    this.tweens.add({ targets: this.headC, angle: m === 'hungry' ? 6 : 0, duration: 400 });
    if (m === 'happy') this.setTailSpeed(380, 0.25);
    else if (m === 'nervous') this.setTailSpeed(1600, 0.04);
    else if (m === 'cold') this.setTailSpeed(1400, 0.06);
    else this.setTailSpeed(900, 0.12);
    this.shiver = m === 'cold' ? 1.6 : m === 'nervous' ? 1 : 0;
  }

  private setTailSpeed(duration: number, amount: number) {
    this.tailTween?.stop();
    this.parts.tail.setRotation(-amount);
    this.tailTween = this.tweens.add({ targets: this.parts.tail, rotation: amount, duration, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  private showMouth(key: 'mouthSmile' | 'mouthOpen' | 'mouthWorried') {
    for (const k of ['mouthSmile', 'mouthOpen', 'mouthWorried']) this.parts[k].setVisible(k === key);
  }

  private blink() {
    if (!this.dragon.visible || this.sleeping) return;
    this.tweens.add({ targets: this.eyesC, scaleY: 0.1, duration: 80, yoyo: true });
    if (Math.random() < 0.3) this.time.delayedCall(260, () => this.tweens.add({ targets: this.eyesC, scaleY: 0.1, duration: 80, yoyo: true }));
  }

  update(time: number) {
    if (!this.dragon.visible) return;
    if (this.moving) return;
    this.dragon.x = this.bx + (this.shiver ? Math.sin(time / 22) * this.shiver : 0);
  }

  // ---------- reactions ----------

  react(e: GameEvent) {
    switch (e.type) {
      case 'egg-crack':
        this.cracks[e.taps - 1]?.setVisible(true);
        this.tweens.add({ targets: this.eggC, scaleX: 1.08, scaleY: 0.94, duration: 90, yoyo: true });
        break;
      case 'hatched':
        this.hatch();
        break;
      case 'eat':
        this.busy(900);
        this.showMouth('mouthOpen');
        this.tweens.add({ targets: this.headC, scaleY: 0.92, duration: 120, yoyo: true, repeat: 2, onComplete: () => this.showMouth('mouthSmile') });
        break;
      case 'refuse-full':
      case 'refuse-wants-other':
        this.busy(1100);
        this.showMouth('mouthWorried');
        this.tweens.add({ targets: this.headC, angle: -16, duration: 220, yoyo: true, hold: 500 });
        break;
      case 'balanced':
      case 'ready':
        this.hop(e.type === 'ready' ? 2 : 1);
        this.sparkles(e.type === 'ready' ? 10 : 6);
        if (e.type === 'ready') this.cb.onReady();
        break;
      case 'spice':
        this.busy(1400);
        this.tweens.add({ targets: this.parts.glow, scale: HALF * 1.25, duration: 300, yoyo: true });
        if (e.sneeze) this.sneeze();
        if (e.hiccup) this.time.delayedCall(e.sneeze ? 700 : 200, () => this.hiccup(3));
        if (!e.sneeze && !e.hiccup) this.hop(1);
        break;
      case 'scorched':
        this.time.delayedCall(900, () => this.puffAt(ROOM.sockX, ROOM.sockY - 20));
        break;
      case 'hum':
        for (let i = 0; i < 4; i++) this.time.delayedCall(i * 350, () => this.floatUp('note', this.bx - 120 + i * 60, this.by - 120));
        this.tweens.add({ targets: this.headC, angle: { from: -6, to: 6 }, duration: 500, yoyo: true, repeat: 1 });
        break;
      case 'sock':
        this.floatUp('heart', ROOM.nestX, ROOM.nestY - 60);
        this.hop(1);
        break;
      case 'startle':
        this.busy(1200);
        this.showMouth('mouthWorried');
        this.tweens.add({ targets: this.dragon, y: this.by - 26 * this.bs, duration: 120, yoyo: true, ease: 'Quad.out' });
        this.tweens.add({ targets: this.eyesC, scale: 1.2, duration: 120, yoyo: true, hold: 700 });
        this.cameras.main.shake(250, 0.004);
        break;
      case 'thought-solved':
        this.floatUp('sparkle', this.bx, this.by - 150);
        break;
      case 'fixed':
        this.sparklesAt(ROOM.sockX, ROOM.sockY, 6);
        break;
      case 'knock':
        this.cameras.main.shake(180, 0.003);
        if (!e.calm) {
          this.busy(1400);
          this.showMouth('mouthOpen');
          this.tweens.add({ targets: this.dragon, y: this.by - 18 * this.bs, duration: 110, yoyo: true, repeat: 1 });
          this.tweens.add({ targets: this.eyesC, scale: 1.2, duration: 120, yoyo: true, hold: 700 });
        } else {
          this.floatUp('heart', this.bx + 30, this.by - 70);
        }
        break;
      case 'helper-visit':
        this.floatUp('heart', this.bx, this.by - 70);
        this.time.delayedCall(300, () => this.floatUp('heart', this.bx + 30, this.by - 60));
        break;
      case 'spotted':
        if (e.suspicious) this.closeCurtains();
        this.hideThing(true);
        break;
      case 'window-gone':
        this.hideThing(false);
        break;
      case 'blanket':
        this.blanketImg.setVisible(true);
        this.tweens.add({ targets: this.blanketImg, alpha: e.on ? 1 : 0, y: this.blanketImg.y, duration: 300, onComplete: () => this.blanketImg.setVisible(e.on) });
        if (e.on) this.floatUp('heart', this.bx, this.by - 60);
        break;
      case 'day-finished':
        this.sleep();
        break;
      default:
        break;
    }
  }

  private busy(ms: number) {
    this.busyUntil = this.time.now + ms;
    this.time.delayedCall(ms + 20, () => this.state && this.applyMood(this.moodFor(this.state)));
    this.mood = 'content';
  }

  private hatch() {
    this.tweens.add({
      targets: this.eggC,
      scale: 1.15,
      alpha: 0,
      duration: 350,
      ease: 'Back.in',
      onComplete: () => this.eggC.setVisible(false),
    });
    this.puffAt(this.bx, this.by + 40, 14);
    this.dragon.setVisible(true).setScale(0.3).setAlpha(0);
    this.tweens.add({ targets: this.dragon, scale: 1, alpha: 1, duration: 600, delay: 250, ease: 'Back.out' });
    this.time.delayedCall(900, () => this.sparkles(10));
  }

  private hop(times: number) {
    this.tweens.add({ targets: this.dragon, y: this.by - 34 * this.bs, duration: 180, yoyo: true, repeat: times - 1, ease: 'Quad.out' });
    this.tweens.add({ targets: [this.parts.wingL], angle: -25, duration: 120, yoyo: true, repeat: times * 2 - 1 });
    this.tweens.add({ targets: [this.parts.wingR], angle: 25, duration: 120, yoyo: true, repeat: times * 2 - 1 });
  }

  private sneeze() {
    this.tweens.add({
      targets: this.headC,
      angle: -10,
      duration: 350,
      yoyo: false,
      onComplete: () => {
        this.tweens.add({ targets: this.headC, angle: 8, duration: 90, yoyo: true, onComplete: () => this.headC.setAngle(0) });
        this.puffAt(this.bx, this.by - 10, 8, 0xd8d0c4);
      },
    });
  }

  private hiccup(n: number) {
    for (let i = 0; i < n; i++) {
      this.time.delayedCall(i * 420, () => {
        this.tweens.add({ targets: this.dragon, y: this.by - 14, duration: 90, yoyo: true });
        this.smokeRing(this.bx, this.by - 20);
      });
    }
  }

  private smokeRing(x: number, y: number) {
    const g = this.add.graphics({ x, y }).setDepth(DEPTH.fx);
    g.lineStyle(10, 0x8a8a8a, 0.8).strokeEllipse(0, 0, 40, 26);
    this.tweens.add({ targets: g, y: y - 170, scale: 2.4, alpha: 0, duration: 1400, ease: 'Sine.out', onComplete: () => g.destroy() });
  }

  private puffAt(x: number, y: number, count = 8, color = 0xb9b0a6) {
    for (let i = 0; i < count; i++) {
      const c = this.add.circle(x, y, Phaser.Math.Between(10, 20), color, 0.8).setDepth(DEPTH.fx);
      const a = (Math.PI * 2 * i) / count;
      this.tweens.add({
        targets: c,
        x: x + Math.cos(a) * Phaser.Math.Between(60, 110),
        y: y + Math.sin(a) * Phaser.Math.Between(40, 80),
        alpha: 0,
        scale: 1.6,
        duration: 700,
        ease: 'Quad.out',
        onComplete: () => c.destroy(),
      });
    }
  }

  private floatUp(key: string, x: number, y: number) {
    const im = this.add.image(x, y, key).setScale(HALF * 1.2).setDepth(DEPTH.fx);
    this.tweens.add({ targets: im, y: y - 90, x: x + Phaser.Math.Between(-20, 20), alpha: 0, duration: 1100, ease: 'Sine.out', onComplete: () => im.destroy() });
  }

  private sparkles(n: number) {
    this.sparklesAt(this.bx, this.by, n);
  }

  private sparklesAt(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      this.time.delayedCall(i * 60, () => this.floatUp('sparkle', x + Phaser.Math.Between(-150, 150), y + Phaser.Math.Between(-120, 60)));
    }
  }

  /** Flies a food from a screen point into the dragon's mouth. */
  flyFood(foodId: string, clientX: number, clientY: number) {
    const p = this.clientToWorld(clientX, clientY);
    const im = this.add.image(p.x, p.y, `food-${foodId}`).setScale(HALF * 0.9).setDepth(DEPTH.fx);
    this.tweens.add({
      targets: im,
      x: this.bx,
      y: this.by - 20,
      scale: HALF * 0.3,
      duration: 380,
      ease: 'Quad.in',
      onComplete: () => im.destroy(),
    });
  }

  // ---------- night ----------

  private buildNight() {
    const W = ROOM.win;
    this.overlay = this.add.graphics().setDepth(DEPTH.overlay).setVisible(false);
    this.nightWin = this.add.image(W.x + W.w / 2, W.y + W.h / 2, 'nightWindow').setScale(HALF).setDepth(DEPTH.window).setVisible(false);
    this.curtains = [0, 1].map((i) =>
      this.add
        .rectangle(i === 0 ? W.x - W.w / 2 : W.x + W.w * 1.5, W.y + W.h / 2, W.w / 2 + 6, W.h + 10, 0xf28c8c)
        .setStrokeStyle(4, 0xc25f5f)
        .setDepth(DEPTH.curtain)
        .setVisible(false),
    );
    this.glowImg = this.add
      .image(ROOM.lampX, ROOM.lampY - 110, 'lampGlow')
      .setScale(HALF * 1.6)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.glow)
      .setVisible(false);
    this.blanketImg = this.add.image(ROOM.nightX, ROOM.nightY + 52, 'blanket').setScale(HALF * 0.86).setDepth(DEPTH.blanket).setVisible(false);
    this.nestFrontImg = this.add.image(ROOM.nestX, ROOM.nestY + 30, 'nestFront').setScale(HALF * 0.95).setDepth(DEPTH.nestFront).setVisible(false);
  }

  /** Darkens the room except the window, with a pool of lamplight. */
  private drawOverlay(dim: boolean) {
    const W = ROOM.win;
    const a = dim ? 0.55 : 0.32;
    const g = this.overlay.clear().fillStyle(0x141b3c, a);
    g.fillRect(0, 0, ROOM.w, W.y);
    g.fillRect(0, W.y + W.h, ROOM.w, ROOM.h - W.y - W.h);
    g.fillRect(0, W.y, W.x, W.h);
    g.fillRect(W.x + W.w, W.y, ROOM.w - W.x - W.w, W.h);
    this.glowImg.setAlpha(dim ? 0.35 : 1).setScale(HALF * (dim ? 1.1 : 1.7));
  }

  private applyNight(s: GameState, immediate: boolean) {
    if (!this.night) {
      this.night = true;
      this.overlay.setVisible(true);
      this.nightWin.setVisible(true);
      this.glowImg.setVisible(true);
      this.nestFrontImg.setVisible(true);
      this.nestSock.setVisible(false);
      this.moveDragon(ROOM.nightX, ROOM.nightY, ROOM.nightScale, immediate);
    }
    if (this.lampDim !== s.evening.lampDim) {
      this.lampDim = s.evening.lampDim;
      this.drawOverlay(this.lampDim);
    }
    this.blanketImg.setVisible(s.evening.blanket).setAlpha(1);
    const w = s.evening.window;
    if (w && this.thing?.id !== w.id) this.showThing(w.id);
    if (!w && this.thing) this.hideThing(false);
    if (s.part === 'end' && !this.sleeping) this.sleep();
  }

  private moveDragon(x: number, y: number, scale: number, immediate: boolean) {
    this.bx = x;
    this.by = y;
    this.bs = scale;
    this.zone.setPosition(x, y + 20 * scale).setSize(230 * scale, 270 * scale);
    if (this.zone.input?.hitArea) (this.zone.input.hitArea as Phaser.Geom.Rectangle).setSize(230 * scale, 270 * scale);
    if (immediate) {
      this.dragon.setPosition(x, y).setScale(scale);
      return;
    }
    this.moving = true;
    this.tweens.add({ targets: this.dragon, x, y, scale, duration: 900, ease: 'Sine.inOut', onComplete: () => (this.moving = false) });
  }

  private thingPos(art: string) {
    const W = ROOM.win;
    const spots: Record<string, [number, number]> = {
      moth: [W.x + 80, W.y + 70],
      blink: [W.x + 250, W.y + 90],
      cat: [W.x + 250, W.y + 222],
      surveyor: [W.x + 90, W.y + 210],
    };
    return spots[art] ?? [W.x + W.w / 2, W.y + W.h / 2];
  }

  private showThing(id: string) {
    this.hideThing(false);
    const def = eveningFor(content, this.state?.day ?? 1).windowThings.find((t) => t.id === id);
    if (!def) return;
    const [x, y] = this.thingPos(def.art);
    const im = this.add.image(x, y + 20, `thing-${def.art}`).setScale(HALF * 0.9).setAlpha(0).setDepth(DEPTH.thing);
    im.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.cb.onWindowTap(id));
    this.tweens.add({ targets: im, alpha: 1, y, duration: 500, ease: 'Sine.out' });
    if (def.art === 'moth') this.tweens.add({ targets: im, x: x + 40, angle: 15, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    if (def.art === 'blink') this.tweens.add({ targets: im, y: y - 12, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: 500 });
    if (def.art === 'surveyor') this.tweens.add({ targets: im, x: x + 30, duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: 500 });
    this.thing = { id, img: im };
  }

  private hideThing(tapped: boolean) {
    if (!this.thing) return;
    const im = this.thing.img;
    this.thing = null;
    im.disableInteractive();
    this.tweens.killTweensOf(im);
    this.tweens.add({ targets: im, alpha: 0, scale: tapped ? HALF * 1.1 : HALF * 0.7, duration: 350, onComplete: () => im.destroy() });
  }

  private closeCurtains() {
    const W = ROOM.win;
    const [l, r] = this.curtains;
    l.setVisible(true);
    r.setVisible(true);
    this.tweens.add({ targets: l, x: W.x + W.w / 4, duration: 350, ease: 'Quad.out', yoyo: true, hold: 1800, onComplete: () => l.setVisible(false) });
    this.tweens.add({ targets: r, x: W.x + (W.w * 3) / 4, duration: 350, ease: 'Quad.out', yoyo: true, hold: 1800, onComplete: () => r.setVisible(false) });
  }

  private sleep() {
    this.sleeping = true;
    this.tweens.killTweensOf(this.eyesC);
    this.eyesC.setScale(1, 0.08);
    this.showMouth('mouthSmile');
    this.shiver = 0;
    this.setTailSpeed(2400, 0.04);
    this.time.addEvent({ delay: 1400, loop: true, callback: () => this.floatUp('zzz', this.bx + 40, this.by - 70) });
  }

  // ---------- coordinates & capture ----------

  private clientToWorld(cx: number, cy: number) {
    const r = this.game.canvas.getBoundingClientRect();
    return { x: ((cx - r.left) / r.width) * ROOM.w, y: ((cy - r.top) / r.height) * ROOM.h };
  }

  worldToClient(x: number, y: number) {
    const r = this.game.canvas.getBoundingClientRect();
    return { x: r.left + (x / ROOM.w) * r.width, y: r.top + (y / ROOM.h) * r.height };
  }

  /** The dragon's on-screen box, for drag-and-drop and placing the thought bubble. */
  dragonClientRect() {
    const a = this.worldToClient(this.bx - 125 * this.bs, this.by - 150 * this.bs);
    const b = this.worldToClient(this.bx + 125 * this.bs, this.by + 140 * this.bs);
    return { left: a.x, top: a.y, right: b.x, bottom: b.y, width: b.x - a.x, height: b.y - a.y };
  }

  snapshot(): Promise<string> {
    const w = 520;
    const h = 400;
    const x = Phaser.Math.Clamp(this.bx - w / 2, 0, ROOM.w - w);
    const y = Phaser.Math.Clamp(this.by - h / 2 - 20, 0, ROOM.h - h);
    return new Promise((resolve) => {
      this.game.renderer.snapshotArea(x, y, w, h, (im) => {
        resolve(im instanceof HTMLImageElement ? im.src : '');
      });
    });
  }
}
