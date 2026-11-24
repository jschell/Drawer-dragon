/**
 * Background music, generated with Web Audio (no files to download, works offline).
 * Three gentle loops: a bright morning tune, a bouncy afternoon tune and a slow
 * lullaby for the evening. Quiet by default, with its own on/off button, and
 * silent whenever sound is off or the game is in the background.
 */
import { sfx } from './sfx';

export type Mood = 'morning' | 'afternoon' | 'night' | null;

interface Tune {
  bpm: number;
  root: number; // MIDI note of the scale's first step
  scale: number[]; // semitone offsets
  wave: OscillatorType;
  /** Scale steps per eighth note; null is a rest. */
  melody: (number | null)[];
  /** Bass steps, one per bar of 8 eighths. */
  bass: number[];
  vol: number;
}

const PENTA = [0, 2, 4, 7, 9];

const TUNES: Record<Exclude<Mood, null>, Tune> = {
  morning: {
    bpm: 100,
    root: 72,
    scale: PENTA,
    wave: 'triangle',
    melody: [0, null, 2, 4, 3, null, 2, null, 1, 2, 0, null, 1, null, null, null, 2, null, 4, 5, 4, null, 3, 2, 1, null, 2, 1, 0, null, null, null],
    bass: [0, 3, 1, 0],
    vol: 0.16,
  },
  afternoon: {
    bpm: 112,
    root: 67,
    scale: PENTA,
    wave: 'triangle',
    melody: [4, 3, 2, null, 4, 3, 2, null, 1, 2, 3, 2, 1, null, 0, null, 2, null, 2, 3, 4, null, 5, 4, 3, 2, 1, null, 0, null, null, null],
    bass: [0, 0, 3, 1],
    vol: 0.14,
  },
  night: {
    bpm: 66,
    root: 69,
    scale: [0, 3, 5, 7, 10],
    wave: 'sine',
    melody: [2, null, 1, null, 0, null, null, null, 1, null, 2, null, 3, null, null, null, 2, null, 1, null, 0, null, 1, null, 0, null, null, null, null, null, null, null],
    bass: [0, 2, 3, 0],
    vol: 0.12,
  },
};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

class Music {
  private mood: Mood = null;
  private on = true;
  private gain: GainNode | null = null;
  private timer = 0;
  private step = 0;
  private nextAt = 0;

  setEnabled(on: boolean) {
    this.on = on;
    this.refresh();
  }

  get enabled() {
    return this.on;
  }

  setMood(mood: Mood) {
    if (mood === this.mood) return this.refresh();
    this.mood = mood;
    this.step = 0;
    this.nextAt = 0;
    this.refresh();
  }

  /** Starts or stops the scheduler to match the settings. Safe to call often. */
  refresh() {
    const ctx = sfx.context;
    const playing = !!ctx && this.on && sfx.enabled && !!this.mood && !document.hidden;
    if (!playing) {
      window.clearInterval(this.timer);
      this.timer = 0;
      if (this.gain && ctx) this.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      return;
    }
    if (!this.gain) {
      this.gain = ctx!.createGain();
      this.gain.connect(ctx!.destination);
    }
    this.gain.gain.setTargetAtTime(1, ctx!.currentTime, 0.3);
    if (!this.timer) {
      this.nextAt = Math.max(this.nextAt, ctx!.currentTime + 0.1);
      this.timer = window.setInterval(() => this.schedule(), 60);
    }
  }

  /** Schedules the next few notes a little ahead, so timing stays smooth. */
  private schedule() {
    const ctx = sfx.context;
    if (!ctx || !this.mood || !this.gain) return;
    const t = TUNES[this.mood];
    const eighth = 60 / t.bpm / 2;
    if (this.nextAt < ctx.currentTime) this.nextAt = ctx.currentTime + 0.05;
    while (this.nextAt < ctx.currentTime + 0.3) {
      const i = this.step % t.melody.length;
      const m = t.melody[i];
      if (m !== null) this.note(t, t.root + this.pitch(t, m), this.nextAt, eighth * 1.8, t.vol);
      if (i % 8 === 0) this.note(t, t.root - 24 + this.pitch(t, t.bass[(i / 8) % t.bass.length]), this.nextAt, eighth * 7, t.vol * 0.8, 'sine');
      this.nextAt += eighth;
      this.step += 1;
    }
  }

  private pitch(t: Tune, step: number) {
    const n = t.scale.length;
    return Math.floor(step / n) * 12 + t.scale[((step % n) + n) % n];
  }

  private note(t: Tune, n: number, at: number, dur: number, vol: number, wave: OscillatorType = t.wave) {
    const ctx = sfx.context!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(midi(n), at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g).connect(this.gain!);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }
}

export const music = new Music();
document.addEventListener('visibilitychange', () => music.refresh());
