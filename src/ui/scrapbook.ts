/**
 * The scrapbook: each day's photo of the sleeping dragon, kept on this device only
 * (docs/FUN-PLAN.md). Photos are shrunk to small JPEGs so the whole week fits easily
 * in browser storage; if storage is full or unavailable, the game carries on without it.
 */
const KEY = 'dragon-keeper:scrapbook';

export interface ScrapPage {
  day: number;
  title: string;
  name: string;
  img: string;
}

export function loadScrapbook(): ScrapPage[] {
  try {
    const raw = localStorage.getItem(KEY);
    const pages = raw ? (JSON.parse(raw) as ScrapPage[]) : [];
    return Array.isArray(pages) ? pages.filter((p) => p && typeof p.img === 'string' && p.img.startsWith('data:image/')) : [];
  } catch {
    return [];
  }
}

function save(pages: ScrapPage[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(pages));
  } catch {
    /* storage full or blocked: the scrapbook is a nice extra, never required */
  }
}

export function clearScrapbook() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Shrinks a photo to a small JPEG (about 15 KB). */
function shrink(src: string, width = 312): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const h = Math.round((img.height / img.width) * width);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve('');
      ctx.drawImage(img, 0, 0, width, h);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => resolve('');
    img.src = src;
  });
}

/** Adds (or replaces) the page for a day. */
export async function addScrapPage(page: ScrapPage): Promise<void> {
  if (!page.img) return;
  const img = await shrink(page.img);
  if (!img) return;
  const pages = loadScrapbook().filter((p) => p.day !== page.day);
  pages.push({ ...page, img });
  pages.sort((a, b) => a.day - b.day);
  save(pages);
}
