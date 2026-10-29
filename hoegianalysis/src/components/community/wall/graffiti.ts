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

export const ROW_HEIGHT = 104; // 낙서 한 줄 높이(px)
export const TOP_PAD = 48; // 갓돌 아래부터
export const BOTTOM_ZONE = 360; // 넙죽이·스프레이 글씨·바닥 자리
export const MIN_WALL = 640;

export function wallHeight(count: number, cols: number): number {
  const rows = Math.ceil(count / cols);
  return Math.max(MIN_WALL, TOP_PAD + rows * ROW_HEIGHT + BOTTOM_ZONE);
}

export interface Placement {
  left: number; // %
  width: number; // %
  top: number; // px
  rotate: number; // deg
  color: string;
}

// 최신 글부터 위쪽 칸에. 칸 안에서만 조금씩 흔들어 겹치지 않게 한다
export function placeGraffiti(id: string, order: number, cols: number, height: number): Placement {
  const h = hash(id);
  const col = order % cols;
  const row = Math.floor(order / cols);
  const colWidth = 100 / cols;
  const jx = ((h % 100) / 100 - 0.5) * colWidth * 0.12;
  const jy = (((h >>> 8) % 100) / 100 - 0.5) * 22;
  const top = TOP_PAD + row * ROW_HEIGHT + jy;

  // 황토 칠 위에서는 흰 분필이 안 보여서 검정으로 바꾼다
  let color: string = INKS[(h >>> 16) % INKS.length];
  if (color === INKS[0] && (top / height) * 100 > OCHRE_FROM - 8) color = INKS[1];

  return {
    // 기울어져도 벽 밖으로 잘리지 않게 칸 양옆에 여백을 둔다
    left: col * colWidth + colWidth * 0.12 + jx,
    width: colWidth * 0.78,
    top,
    rotate: (((h >>> 4) % 100) / 100 - 0.5) * 12,
    color,
  };
}

// 흰 분필 글씨는 밝은 바탕(크게 보기 팝업)에서 그림자로 윤곽을 준다
export function inkShadow(color: string): string | undefined {
  return color === INKS[0] ? '0 1px 0 rgba(0,0,0,0.35)' : undefined;
}
