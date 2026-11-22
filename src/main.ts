import Phaser from 'phaser';
import { scaled } from './art/svg';
import { loadSave } from './core/save';
import { initialState } from './core/state';
import { BedroomScene, TEX_SCALE, textureList } from './scenes/BedroomScene';
import { Hud } from './ui/hud';
import './ui/style.css';

/** Rasterises every generated SVG once, before Phaser starts. */
async function rasterise(): Promise<Record<string, HTMLImageElement>> {
  const entries = await Promise.all(
    Object.entries(textureList()).map(async ([key, art]) => {
      const img = new Image();
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(scaled(art, TEX_SCALE))}`;
      await img.decode();
      return [key, img] as const;
    }),
  );
  return Object.fromEntries(entries);
}

async function boot() {
  const save = loadSave();
  const hud = new Hud(save ?? initialState((Date.now() >>> 0) ^ 0x9e3779b9));
  const images = await rasterise();

  const scene = new BedroomScene();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 1334,
    height: 750,
    backgroundColor: '#FBE6C8',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, preserveDrawingBuffer: true },
    banner: false,
    audio: { noAudio: true },
  });
  game.scene.add('bedroom', scene, true, {
    images,
    callbacks: {
      onEggTap: () => hud.onEggTap(),
      onDragonTap: () => hud.onDragonTap(),
      onPet: (n: number) => hud.onPet(n),
      onScorchedSockTap: () => hud.onScorchedSockTap(),
      onReady: () => hud.onReady(),
      onCreated: () => hud.onSceneCreated(scene, save !== null),
    },
  });
  (window as unknown as { __dk: unknown }).__dk = { hud, game };
}

void boot();
