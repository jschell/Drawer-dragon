import Phaser from 'phaser';
import { bowl, dragonParts, egg, eggCracks, foodArt, heart, note, ROOM, sockArt, sparkle, bedroom, type Art } from '../art/svg';
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
  };
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
}

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
    this.tweens.add({ targets: this.floorSock, angle: { from: -6, to: 6 }, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

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

    this.dragon = this.add.container(ROOM.dragonX, ROOM.dragonY, [wingL, wingR, tail, body, glow, this.headC]);
    this.dragon.setVisible(false);

    this.tweens.add({ targets: [body, glow], scaleY: HALF * 1.025, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: this.headC, y: this.headC.y - 3, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.setTailSpeed(1000, 0.12);
  }

  private buildEgg() {
    const e = this.add.image(0, 0, 'egg').setScale(HALF);
    this.cracks = [0, 1, 2].map((i) => this.add.image(0, 0, `crack${i}`).setScale(HALF).setVisible(false));
    this.eggC = this.add.container(ROOM.dragonX, ROOM.dragonY + 6, [e, ...this.cracks]);
    this.tweens.add({ targets: this.eggC, angle: { from: -2, to: 2 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  private setupPetting() {
    const zone = this.add.zone(ROOM.dragonX, ROOM.dragonY + 20, 230, 270).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.state?.phase === 'egg') return this.cb.onEggTap();
      this.lastPetPoint = new Phaser.Math.Vector2(p.x, p.y);
      this.petDistance = 0;
      this.cb.onDragonTap();
    });
    zone.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown || !this.lastPetPoint || this.state?.phase !== 'care') return;
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
    this.nestSock.setVisible(s.sockInNest);
    this.floorSock.setVisible(s.fixIt !== null);
    const spark = s.dragon.spark;
    this.parts.glow.setAlpha(Phaser.Math.Clamp((spark - 10) / 70, 0, 1) * 0.9);
    this.applyMood(this.moodFor(s));
  }

  private moodFor(s: GameState): Mood {
    if (s.phase !== 'care' && s.phase !== 'done') return 'content';
    const d = s.dragon;
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
    if (!this.dragon.visible) return;
    this.tweens.add({ targets: this.eyesC, scaleY: 0.1, duration: 80, yoyo: true });
    if (Math.random() < 0.3) this.time.delayedCall(260, () => this.tweens.add({ targets: this.eyesC, scaleY: 0.1, duration: 80, yoyo: true }));
  }

  update(time: number) {
    if (!this.dragon.visible) return;
    this.dragon.x = ROOM.dragonX + (this.shiver ? Math.sin(time / 22) * this.shiver : 0);
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
        for (let i = 0; i < 4; i++) this.time.delayedCall(i * 350, () => this.floatUp('note', ROOM.dragonX - 120 + i * 60, ROOM.dragonY - 120));
        this.tweens.add({ targets: this.headC, angle: { from: -6, to: 6 }, duration: 500, yoyo: true, repeat: 1 });
        break;
      case 'sock':
        this.floatUp('heart', ROOM.nestX, ROOM.nestY - 60);
        this.hop(1);
        break;
      case 'startle':
        this.busy(1200);
        this.showMouth('mouthWorried');
        this.tweens.add({ targets: this.dragon, y: ROOM.dragonY - 26, duration: 120, yoyo: true, ease: 'Quad.out' });
        this.tweens.add({ targets: this.eyesC, scale: 1.2, duration: 120, yoyo: true, hold: 700 });
        this.cameras.main.shake(250, 0.004);
        break;
      case 'thought-solved':
        this.floatUp('sparkle', ROOM.dragonX, ROOM.dragonY - 150);
        break;
      case 'fixed':
        this.sparklesAt(ROOM.sockX, ROOM.sockY, 6);
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
    this.puffAt(ROOM.dragonX, ROOM.dragonY + 40, 14);
    this.dragon.setVisible(true).setScale(0.3).setAlpha(0);
    this.tweens.add({ targets: this.dragon, scale: 1, alpha: 1, duration: 600, delay: 250, ease: 'Back.out' });
    this.time.delayedCall(900, () => this.sparkles(10));
  }

  private hop(times: number) {
    this.tweens.add({ targets: this.dragon, y: ROOM.dragonY - 34, duration: 180, yoyo: true, repeat: times - 1, ease: 'Quad.out' });
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
        this.puffAt(ROOM.dragonX, ROOM.dragonY - 10, 8, 0xd8d0c4);
      },
    });
  }

  private hiccup(n: number) {
    for (let i = 0; i < n; i++) {
      this.time.delayedCall(i * 420, () => {
        this.tweens.add({ targets: this.dragon, y: ROOM.dragonY - 14, duration: 90, yoyo: true });
        this.smokeRing(ROOM.dragonX, ROOM.dragonY - 20);
      });
    }
  }

  private smokeRing(x: number, y: number) {
    const g = this.add.graphics({ x, y });
    g.lineStyle(10, 0x8a8a8a, 0.8).strokeEllipse(0, 0, 40, 26);
    this.tweens.add({ targets: g, y: y - 170, scale: 2.4, alpha: 0, duration: 1400, ease: 'Sine.out', onComplete: () => g.destroy() });
  }

  private puffAt(x: number, y: number, count = 8, color = 0xb9b0a6) {
    for (let i = 0; i < count; i++) {
      const c = this.add.circle(x, y, Phaser.Math.Between(10, 20), color, 0.8);
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
    const im = this.add.image(x, y, key).setScale(HALF * 1.2);
    this.tweens.add({ targets: im, y: y - 90, x: x + Phaser.Math.Between(-20, 20), alpha: 0, duration: 1100, ease: 'Sine.out', onComplete: () => im.destroy() });
  }

  private sparkles(n: number) {
    this.sparklesAt(ROOM.dragonX, ROOM.dragonY, n);
  }

  private sparklesAt(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      this.time.delayedCall(i * 60, () => this.floatUp('sparkle', x + Phaser.Math.Between(-150, 150), y + Phaser.Math.Between(-120, 60)));
    }
  }

  /** Flies a food from a screen point into the dragon's mouth. */
  flyFood(foodId: string, clientX: number, clientY: number) {
    const p = this.clientToWorld(clientX, clientY);
    const im = this.add.image(p.x, p.y, `food-${foodId}`).setScale(HALF * 0.9);
    this.tweens.add({
      targets: im,
      x: ROOM.dragonX,
      y: ROOM.dragonY - 20,
      scale: HALF * 0.3,
      duration: 380,
      ease: 'Quad.in',
      onComplete: () => im.destroy(),
    });
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
    const a = this.worldToClient(ROOM.dragonX - 125, ROOM.dragonY - 150);
    const b = this.worldToClient(ROOM.dragonX + 125, ROOM.dragonY + 140);
    return { left: a.x, top: a.y, right: b.x, bottom: b.y, width: b.x - a.x, height: b.y - a.y };
  }

  snapshot(): Promise<string> {
    return new Promise((resolve) => {
      this.game.renderer.snapshotArea(ROOM.dragonX - 260, ROOM.dragonY - 200, 520, 400, (im) => {
        resolve(im instanceof HTMLImageElement ? im.src : '');
      });
    });
  }
}
