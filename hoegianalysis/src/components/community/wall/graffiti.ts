import { OCHRE_FROM } from './WallBackdrop';

// 낙서 펜 색: 분필 흰색, 검은 매직, 큐브 파랑, 빨간 스프레이
const INKS = ['#FFFFFF', '#111111', '#1F3CB8', '#B8261E'] as const;

// 글 id로 정해지는 고정 난수 (새로고침해도 같은 자리·각도·색)
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const ROW_HEIGHT = 120; // 낙서 한 줄 높이(px)
export const TOP_PAD = 48; // 갓돌 아래부터
export const BOTTOM_ZONE = 360; // 넙죽이·스프레이 글씨·바닥 자리
export const MIN_WALL = 640;

// 낙서장 한 장에 붙는 낙서 수. 가득 차면 새 장이 생긴다
export const PER_SHEET = 20;
// 장 높이는 예전(10개) 기준 그대로 둔다. 20개는 같은 높이에 더 촘촘히 붙는다
const HEIGHT_BASIS = 10;

// 낙서장 높이는 장마다 같다 (가득 찼을 때 기준)
export function sheetHeight(cols: number): number {
  return Math.max(MIN_WALL, TOP_PAD + Math.ceil(HEIGHT_BASIS / cols) * ROW_HEIGHT + BOTTOM_ZONE);
}

// 기울기: 대부분 살짝, 가끔 확 기울인다 (-16° ~ 16°)
function tilt(h: number): number {
  const t = ((h >>> 4) % 100) / 100 - 0.5; // -0.5 ~ 0.5
  return Math.sign(t) * Math.pow(Math.abs(t) * 2, 1.3) * 16;
}

export interface Placement {
  left: number; // %
  width: number; // %
  top: number; // px
  rotate: number; // deg
  color: string;
}

// 낙서장 안에서 먼저 쓴 글부터 위쪽 칸에 대략 배치하되, 칸 안에서 위치·기울기를 크게 흩뜨려
// 반듯하게 줄 선 느낌이 나지 않게 한다. 홀수 줄은 옆으로 살짝 밀어 어긋나게 한다
export function placeGraffiti(
  id: string,
  order: number,
  cols: number,
  height: number,
  at?: { x: number; y: number } | null,
): Placement {
  const h = hash(id);
  if (at) return placeAt(h, at, cols, height);
  const col = order % cols;
  const row = Math.floor(order / cols);
  const colWidth = 100 / cols;
  const rx = ((h >>> 3) % 100) / 100; // 0~1
  const ry = ((h >>> 9) % 100) / 100;
  const stagger = row % 2 === 1 ? colWidth * 0.08 : 0;
  const top = TOP_PAD + row * ROW_HEIGHT * (HEIGHT_BASIS / PER_SHEET) + (ry - 0.5) * 30;

  // 황토 칠 위에서는 흰 분필이 안 보여서 검정으로 바꾼다
  let color: string = INKS[(h >>> 16) % INKS.length];
  if (color === INKS[0] && (top / height) * 100 > OCHRE_FROM - 8) color = INKS[1];

  return {
    // 기울어져도 벽 밖으로 잘리지 않게 칸 양옆에 여백을 둔다
    left: Math.min(col * colWidth + colWidth * 0.05 + rx * colWidth * 0.2 + stagger, 100 - colWidth * 0.7 - 2),
    width: colWidth * 0.7,
    top,
    rotate: tilt(h),
    color,
  };
}

// 누른 자리를 중심으로 붙인다. 벽 밖으로 잘리지 않게만 당겨 놓는다
function placeAt(h: number, at: { x: number; y: number }, cols: number, height: number): Placement {
  const width = cols === 2 ? 56 : 36; // % 낙서 한 장 너비
  const top = Math.min(Math.max(at.y - 22, 8), height - 90);
  let color: string = INKS[(h >>> 16) % INKS.length];
  if (color === INKS[0] && (top / height) * 100 > OCHRE_FROM - 8) color = INKS[1];
  return {
    left: Math.min(Math.max(at.x - width / 2, 3), 97 - width),
    width,
    top,
    rotate: tilt(h),
    color,
  };
}

// 흰 분필 글씨는 밝은 바탕(크게 보기 팝업)에서 그림자로 윤곽을 준다
export function inkShadow(color: string): string | undefined {
  return color === INKS[0] ? '0 1px 0 rgba(0,0,0,0.35)' : undefined;
}

// ---------- 낙서끼리 겹치지 않게 자리 찾기 ----------
export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

// 한 글자가 차지하는 대략적인 폭(px). 낙서 글꼴(25px)·별명 글꼴(17px) 기준
function textWidth(text: string, hangul: number, other: number): number {
  let w = 0;
  for (const ch of text) w += ch === ' ' ? other * 0.6 : /[ㄱ-힣]/.test(ch) ? hangul : other;
  return w;
}

// 낙서가 실제로 글씨로 덮는 사각형(회전 여유 포함)
export function inkRect(p: Placement, content: string, nickname: string, sheetW: number): Rect {
  const boxW = (p.width / 100) * sheetW;
  const tw = textWidth(content.replace(/\s+/g, ' '), 22, 11) * 1.05;
  const lines = Math.min(3, Math.max(1, Math.ceil(tw / Math.max(boxW - 4, 40))));
  const nickW = textWidth(`- ${nickname}`, 15, 8);
  const inkW = Math.min(boxW, Math.max(lines > 1 ? boxW : tw, nickW));
  const h = lines * 27 + 22;
  const x0 = (p.left / 100) * sheetW;
  const margin = 12;
  return { x0: x0 - margin, y0: p.top - margin, x1: x0 + inkW + margin, y1: p.top + h + margin };
}

function overlapArea(a: Rect, b: Rect): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return w > 0 && h > 0 ? w * h : 0;
}

// 누른 자리에 이미 낙서가 있으면, 가장 가까운 빈 자리로 옮긴다. (글씨는 누른 자리가 중심)
// 빈 자리가 없으면 가장 덜 겹치는 자리를 쓴다
export function resolveFreeSpot(args: {
  spot: { pos_x: number; pos_y: number };
  content: string;
  nickname: string;
  rects: Rect[];
  sheetW: number;
  height: number;
  cols: number;
}): { pos_x: number; pos_y: number } {
  const { spot, content, nickname, rects, sheetW, height, cols } = args;
  const widthPct = cols === 2 ? 56 : 36; // placeAt 과 같은 값
  const rectAt = (cx: number, cy: number): Rect => {
    const left = Math.min(Math.max(cx - widthPct / 2, 3), 97 - widthPct);
    const top = Math.min(Math.max(cy - 22, 8), height - 110);
    return inkRect({ left, width: widthPct, top, rotate: 0, color: '' }, content, nickname, sheetW);
  };
  const cost = (cx: number, cy: number): number => {
    const r = rectAt(cx, cy);
    return rects.reduce((sum, o) => sum + overlapArea(r, o), 0);
  };

  if (cost(spot.pos_x, spot.pos_y) === 0) return spot;

  const R = 420;
  const step = 14;
  const cands: { dx: number; dy: number; d: number }[] = [];
  for (let dy = -R; dy <= R; dy += step) for (let dx = -R; dx <= R; dx += step) cands.push({ dx, dy, d: dx * dx + dy * dy });
  cands.sort((a, b) => a.d - b.d);

  let best = { pos_x: spot.pos_x, pos_y: spot.pos_y, c: Infinity };
  for (const { dx, dy } of cands) {
    const cx = spot.pos_x + (dx / sheetW) * 100;
    const cy = spot.pos_y + dy;
    if (cx < 8 || cx > 92 || cy < 56 || cy > height - 120) continue; // 벽 안쪽만
    const c = cost(cx, cy);
    if (c === 0) return { pos_x: cx, pos_y: cy };
    if (c < best.c) best = { pos_x: cx, pos_y: cy, c };
  }
  return { pos_x: best.pos_x, pos_y: best.pos_y };
}
