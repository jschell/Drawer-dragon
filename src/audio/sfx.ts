/** Generated sound effects with Web Audio: no audio files to download. */

type Sound =
  | 'chirp'
  | 'trill'
  | 'munch'
  | 'sniff'
  | 'pour'
  | 'purr'
  | 'sneeze'
  | 'hiccup'
  | 'startle'
  | 'crack'
  | 'hatch'
  | 'sparkle'
  | 'scrub'
  | 'tap'
  | 'vacuum'
  | 'doorbell'
  | 'dog'
  | 'knock'
  | 'steps';

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = true;

  /** Must be called from a user gesture (iOS only allows audio after a tap). */
  unlock() {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private tone(freq: number, dur: number, opts: { type?: OscillatorType; to?: number; vol?: number; delay?: number } = {}) {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.vol ?? 0.3, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master!);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, opts: { freq?: number; q?: number; vol?: number; delay?: number; type?: BiquadFilterType } = {}) {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? 'bandpass';
    f.frequency.value = opts.freq ?? 1200;
    f.Q.value = opts.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(opts.vol ?? 0.3, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.master!);
    src.start(t0);
  }

  play(s: Sound) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    switch (s) {
      case 'chirp':
        this.tone(900, 0.12, { to: 1600, vol: 0.2 });
        this.tone(1100, 0.1, { to: 1900, vol: 0.15, delay: 0.13 });
        break;
      case 'trill':
        for (let i = 0; i < 6; i++) this.tone(i % 2 ? 1400 : 1100, 0.07, { vol: 0.15, delay: i * 0.06 });
        break;
      case 'munch':
        for (let i = 0; i < 3; i++) this.noise(0.06, { freq: 700, q: 2, vol: 0.4, delay: i * 0.14 });
        break;
      case 'sniff':
        this.noise(0.12, { freq: 3000, q: 1, vol: 0.15 });
        this.noise(0.12, { freq: 3200, q: 1, vol: 0.15, delay: 0.18 });
        break;
      case 'pour':
        this.noise(0.35, { freq: 5000, q: 0.5, vol: 0.12, type: 'highpass' });
        break;
      case 'purr':
        this.tone(70, 0.8, { type: 'sawtooth', vol: 0.06 });
        this.tone(140, 0.8, { type: 'triangle', vol: 0.08 });
        break;
      case 'sneeze':
        this.tone(500, 0.25, { to: 900, vol: 0.1 });
        this.noise(0.25, { freq: 2500, q: 0.6, vol: 0.4, delay: 0.25 });
        break;
      case 'hiccup':
        this.tone(600, 0.08, { to: 1200, type: 'square', vol: 0.08 });
        this.noise(0.3, { freq: 400, q: 0.5, vol: 0.2, delay: 0.08, type: 'lowpass' });
        break;
      case 'startle':
        this.tone(1300, 0.18, { to: 700, type: 'triangle', vol: 0.2 });
        break;
      case 'crack':
        this.noise(0.08, { freq: 2500, q: 3, vol: 0.5 });
        break;
      case 'hatch':
        this.noise(0.2, { freq: 1800, q: 1, vol: 0.4 });
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', vol: 0.2, delay: 0.15 + i * 0.1 }));
        break;
      case 'sparkle':
        [1568, 2093, 2637].forEach((f, i) => this.tone(f, 0.25, { vol: 0.1, delay: i * 0.07 }));
        break;
      case 'scrub':
        this.noise(0.1, { freq: 1800, q: 0.8, vol: 0.12 });
        break;
      case 'tap':
        this.tone(660, 0.06, { type: 'triangle', vol: 0.12 });
        break;
      case 'vacuum':
        this.tone(110, 1.6, { type: 'sawtooth', to: 130, vol: 0.07 });
        this.noise(1.6, { freq: 900, q: 0.4, vol: 0.12 });
        break;
      case 'doorbell':
        this.tone(659, 0.5, { type: 'triangle', vol: 0.2 });
        this.tone(523, 0.7, { type: 'triangle', vol: 0.2, delay: 0.45 });
        break;
      case 'knock':
        for (let i = 0; i < 3; i++) {
          this.tone(110, 0.12, { to: 70, type: 'sine', vol: 0.5, delay: i * 0.22 });
          this.noise(0.06, { freq: 300, q: 1, vol: 0.4, delay: i * 0.22 });
        }
        break;
      case 'steps':
        for (let i = 0; i < 4; i++) this.noise(0.07, { freq: 220, q: 1.2, vol: 0.18, delay: i * 0.45, type: 'lowpass' });
        break;
      case 'dog':
        for (let i = 0; i < 2; i++) {
          this.tone(320, 0.12, { to: 200, type: 'sawtooth', vol: 0.12, delay: i * 0.3 });
          this.noise(0.1, { freq: 600, q: 1, vol: 0.2, delay: i * 0.3 });
        }
        break;
    }
  }

  /** A short lullaby for the Hum button. */
  hum() {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    [392, 440, 392, 330, 349, 392].forEach((f, i) => this.tone(f, 0.45, { type: 'triangle', vol: 0.14, delay: i * 0.32 }));
  }
}

export const sfx = new Sfx();
