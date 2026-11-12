import { PIECE_TYPES, type PieceType } from '@/lib/blocksEngine';

// 분필 낙서 그리기: 블록 한 칸을 손으로 그린 듯 삐뚤빼뚤한 선과 빗금으로 그려 둔다 (칸마다 같은 모양이 나오게 고정된 난수 사용)

export const CHALK: Record<PieceType, string> = {
  I: '#8fd9ff',
  O: '#ffe36e',
  T: '#d9a6ff',
  S: '#8fe39a',
  Z: '#ff9aa8',
  J: '#8fb2ff',
  L: '#ffb86b',
};

const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const cache = new Map<string, HTMLCanvasElement>();

// 손그림 이미지 (타일 7색×4가지, 얼굴 3가지). 다 불러오기 전에는 코드로 그린 모양을 쓴다.
const load = (src: string) => {
  if (typeof Image === 'undefined') return null;
  const im = new Image();
  im.src = src;
  return im;
};
const tilesImg = load('/hoegilab/blocks-tiles.webp');
const faceImgs = [0, 1, 2].map((i) => load(`/hoegilab/blocks-face-${i}.webp`));
const ready = (im: HTMLImageElement | null) => !!im && im.complete && im.naturalWidth > 0;
const artReady = () => ready(tilesImg) && faceImgs.every(ready);
const TILE = 160;

export function sprite(t: PieceType, face: boolean, v: number, cs: number, dpr: number): HTMLCanvasElement {
  const art = artReady();
  const key = `${art ? 'a' : 'p'}|${t}|${face ? 1 : 0}|${v}|${cs}|${dpr}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = Math.ceil(cs * dpr);
  const x = c.getContext('2d')!;
  x.scale(dpr, dpr);
  if (art) {
    const col = PIECE_TYPES.indexOf(t);
    const row = ((v % 4) + 4) % 4;
    x.drawImage(tilesImg!, col * TILE, row * TILE, TILE, TILE, 0, 0, cs, cs);
    if (face) {
      const f = faceImgs[((v % 3) + 3) % 3]!;
      const h = cs * 0.62;
      const w = (f.naturalWidth / f.naturalHeight) * h;
      const k = w > cs * 0.8 ? (cs * 0.8) / w : 1;
      x.drawImage(f, (cs - w * k) / 2, (cs - h * k) / 2, w * k, h * k);
    }
    cache.set(key, c);
    return c;
  }
  const rnd = mulberry32(PIECE_TYPES.indexOf(t) * 101 + v * 17 + (face ? 5 : 0) + 1);
  const col = CHALK[t];
  const pad = cs * 0.09;
  const j = () => (rnd() - 0.5) * cs * 0.08;
  const pts: [number, number][] = [
    [pad + j(), pad + j()],
    [cs - pad + j(), pad + j()],
    [cs - pad + j(), cs - pad + j()],
    [pad + j(), cs - pad + j()],
  ];
  const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const path = (off = 0) => {
    x.beginPath();
    const s = mid(pts[3], pts[0]);
    x.moveTo(s[0] + off, s[1] + off);
    for (let i = 0; i < 4; i++) {
      const p = pts[i];
      const m = mid(p, pts[(i + 1) % 4]);
      x.quadraticCurveTo(p[0] + off, p[1] + off, m[0] + off, m[1] + off);
    }
    x.closePath();
  };

  // 바탕을 옅게 칠하고
  path();
  x.fillStyle = rgba(col, 0.14);
  x.fill();
  // 비스듬한 빗금을 죽죽 긋고
  x.save();
  path();
  x.clip();
  x.strokeStyle = rgba(col, 0.5);
  x.lineWidth = Math.max(1.2, cs * 0.055);
  x.lineCap = 'round';
  const gap = cs * 0.22;
  for (let k = -cs; k < cs * 2; k += gap) {
    const jit = (rnd() - 0.5) * gap * 0.35;
    x.beginPath();
    x.moveTo(k + jit, cs);
    x.lineTo(k + cs + jit, 0);
    x.stroke();
  }
  x.restore();
  // 테두리는 분필로 두 번 덧그린다
  x.lineJoin = 'round';
  x.strokeStyle = rgba(col, 0.95);
  x.lineWidth = Math.max(2, cs * 0.09);
  path();
  x.stroke();
  x.strokeStyle = 'rgba(255,255,255,0.6)';
  x.lineWidth = Math.max(1, cs * 0.04);
  path(cs * 0.025);
  x.stroke();

  // 넙죽이 얼굴 낙서
  if (face) {
    x.fillStyle = 'rgba(255,255,255,0.95)';
    for (const ex of [0.34, 0.66]) {
      x.beginPath();
      x.arc(cs * ex, cs * 0.42, cs * 0.085, 0, Math.PI * 2);
      x.fill();
    }
    x.fillStyle = '#1c2b27';
    for (const ex of [0.34, 0.66]) {
      x.beginPath();
      x.arc(cs * ex + cs * 0.012, cs * 0.43, cs * 0.04, 0, Math.PI * 2);
      x.fill();
    }
    x.strokeStyle = 'rgba(255,255,255,0.95)';
    x.lineWidth = Math.max(1.4, cs * 0.05);
    x.lineCap = 'round';
    x.beginPath();
    x.arc(cs * 0.5, cs * 0.52, cs * 0.16, Math.PI * 0.18, Math.PI * 0.82);
    x.stroke();
  }
  cache.set(key, c);
  return c;
}
