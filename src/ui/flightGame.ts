/**
 * The backyard flight game (docs/FUN-PLAN.md): tap to flap and fly the dragon through
 * the rings. There is no crashing and no game over: the dragon skims the grass or
 * bumps gently under the clouds, and each try ends when it lands. The number of rings
 * flown through sets how far the try went (see `flightPower` in core/chapters.ts).
 */
import { dataUri, dragonWhole } from '../art/svg';
import { sfx } from '../audio/sfx';

export interface FlightResult {
  rings: number;
  total: number;
}

const W = 640;
const H = 300;
const DRAGON_X = 130;
const TOP = 34;
const GROUND = H - 46;

let dragonImg: HTMLImageElement | null = null;
function dragonPicture() {
  if (!dragonImg) {
    dragonImg = new Image();
    dragonImg.src = dataUri(dragonWhole(), 1);
  }
  return dragonImg;
}

/** A small seeded random, so every try has a fair, varied course. */
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), t | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function mountFlightGame(
  host: HTMLElement,
  opts: { night: boolean; seed: number; total?: number; onLand: (r: FlightResult) => void; onStop?: () => void },
): () => void {
  const total = opts.total ?? 6;
  const canvas = document.createElement('canvas');
  canvas.className = 'flight-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'The backyard. Tap to flap and fly through the rings.');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // ?speed=4 speeds the game up for playtesting and browser tests, like the game clock.
  const speedUp = Math.min(20, Math.max(1, Number(new URLSearchParams(location.search).get('speed')) || 1));
  const scroll = (reduce ? 160 : 210) * speedUp; // px per second
  const gravity = 900 * speedUp * speedUp;
  const flapV = 330 * speedUp;
  const rand = rng(opts.seed);
  const gap = 260;
  const rings = Array.from({ length: total }, (_, i) => ({ x: W + 80 + i * gap, y: 80 + rand() * (GROUND - 130), passed: false, hit: false }));

  let y = H / 2;
  let vy = 0;
  let started = false;
  let landing = 0; // seconds since the last ring went by
  let done = false;
  let last = performance.now();
  let flapAnim = 0;
  let raf = 0;

  const flap = () => {
    if (done) return;
    started = true;
    vy = -flapV;
    flapAnim = 1;
    sfx.play('tap');
  };
  const onPointer = (e: PointerEvent) => {
    e.preventDefault();
    flap();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      flap();
    }
  };
  canvas.addEventListener('pointerdown', onPointer);
  window.addEventListener('keydown', onKey);

  const draw = () => {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, opts.night ? '#3b3f7a' : '#ffd9a8');
    sky.addColorStop(1, opts.night ? '#f2a86b' : '#bfe3f7');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    // Hills (or Larkspur Hill at dusk) and the hedge that hides the dragon from the street.
    ctx.fillStyle = opts.night ? '#4f6d5a' : '#9cd08a';
    ctx.beginPath();
    ctx.moveTo(0, GROUND - 40);
    ctx.quadraticCurveTo(160, GROUND - 110, 330, GROUND - 50);
    ctx.quadraticCurveTo(480, GROUND - 10, W, GROUND - 70);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fill();
    ctx.fillStyle = opts.night ? '#3e5a48' : '#6fb25c';
    ctx.fillRect(0, GROUND, W, H - GROUND);
    if (!opts.night) {
      ctx.fillStyle = '#4e8f45';
      for (let x = 0; x < W; x += 34) {
        ctx.beginPath();
        ctx.arc(x + 17, GROUND + 4, 22, Math.PI, 0);
        ctx.fill();
      }
    }
    // Rings.
    for (const r of rings) {
      if (r.x < -40 || r.x > W + 40) continue;
      ctx.lineWidth = 7;
      ctx.strokeStyle = r.hit ? '#2f9c82' : '#e0a92b';
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, 16, 40, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (r.hit) {
        ctx.fillStyle = '#2f9c82';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('✓', r.x - 7, r.y - 48);
      }
    }
    // The dragon tilts with its speed and squashes a little on each flap.
    const img = dragonPicture();
    const tilt = Math.max(-0.5, Math.min(0.6, vy / 700));
    const size = 92;
    ctx.save();
    ctx.translate(DRAGON_X, y);
    ctx.rotate(tilt);
    ctx.scale(1, 1 - flapAnim * 0.12);
    if (img.complete) ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
    // Score and hint.
    const got = rings.filter((r) => r.hit).length;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(W - 150, 10, 140, 34);
    ctx.fillStyle = '#2b2340';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`Rings: ${got} / ${total}`, W - 140, 34);
    if (!started) {
      ctx.fillStyle = 'rgba(43,35,64,0.75)';
      ctx.fillRect(W / 2 - 150, H / 2 - 30, 300, 56);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Tap to flap! 🪽', W / 2, H / 2 + 6);
      ctx.textAlign = 'left';
    }
  };

  const tick = (now: number) => {
    if (!canvas.isConnected) return stop();
    // Up to 0.1 s per frame, so a slow device runs the game at the right pace (ring
    // passing is checked by crossing, so bigger steps can't skip a ring).
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    flapAnim = Math.max(0, flapAnim - dt * 5);
    if (started && !done) {
      vy += gravity * dt;
      y += vy * dt;
      // Gentle edges: no crashing, the dragon just skims the grass or the clouds.
      if (y > GROUND - 30) {
        y = GROUND - 30;
        vy = 0;
      }
      if (y < TOP) {
        y = TOP;
        vy = Math.max(0, vy);
      }
      for (const r of rings) {
        r.x -= scroll * dt;
        if (!r.passed && r.x < DRAGON_X) {
          r.passed = true;
          r.hit = Math.abs(y - r.y) < 36;
          if (r.hit) sfx.play('sparkle');
        }
      }
      if (rings.every((r) => r.passed)) {
        landing += dt * speedUp;
        if (landing > 0.8) {
          done = true;
          draw();
          opts.onLand({ rings: rings.filter((r) => r.hit).length, total });
          return stop();
        }
      }
    } else if (!started) {
      y = H / 2 + Math.sin(now / 300) * 8; // hovering, waiting for the first tap
    }
    draw();
    raf = requestAnimationFrame(tick);
  };

  let stopped = false;
  function stop() {
    if (stopped) return;
    stopped = true;
    opts.onStop?.();
    cancelAnimationFrame(raf);
    canvas.removeEventListener('pointerdown', onPointer);
    window.removeEventListener('keydown', onKey);
  }

  draw();
  raf = requestAnimationFrame(tick);
  return stop;
}
