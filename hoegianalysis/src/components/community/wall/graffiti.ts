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
export const PER_SHEET = 10;

// 낙서장 높이는 장마다 같다 (가득 찼을 때 기준)
export function sheetHeight(cols: number): number {
  return Math.max(MIN_WALL, TOP_PAD + Math.ceil(PER_SHEET / cols) * ROW_HEIGHT + BOTTOM_ZONE);
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
export function placeGraffiti(id: string, order: number, cols: number, height: number): Placement {
  const h = hash(id);
  const col = order % cols;
  const row = Math.floor(order / cols);
  const colWidth = 100 / cols;
  const rx = ((h >>> 3) % 100) / 100; // 0~1
  const ry = ((h >>> 9) % 100) / 100;
  const stagger = row % 2 === 1 ? colWidth * 0.08 : 0;
  const top = TOP_PAD + row * ROW_HEIGHT + (ry - 0.5) * 30;

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

// 흰 분필 글씨는 밝은 바탕(크게 보기 팝업)에서 그림자로 윤곽을 준다
export function inkShadow(color: string): string | undefined {
  return color === INKS[0] ? '0 1px 0 rgba(0,0,0,0.35)' : undefined;
}
