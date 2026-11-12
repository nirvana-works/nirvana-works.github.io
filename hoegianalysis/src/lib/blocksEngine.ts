// 넙죽이 블록: 떨어지는 네 칸 블록을 쌓아 줄을 지우는 게임의 규칙 엔진 (화면과 무관한 순수 로직)

export const COLS = 10;
export const ROWS = 20;

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export const PIECE_TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export interface Cell {
  t: PieceType;
  face: boolean; // 넙죽이 얼굴이 그려진 칸
  v: number; // 낙서 모양 변형 (0~2)
}

export interface Piece {
  t: PieceType;
  rot: number; // 0~3
  x: number;
  y: number;
  faceIdx: number; // 네 칸 중 얼굴이 있는 칸
  v: number;
}

export interface Game {
  grid: (Cell | null)[][];
  piece: Piece;
  next: PieceType[];
  hold: PieceType | null;
  canHold: boolean;
  score: number;
  lines: number;
  level: number;
  over: boolean;
  locks: number; // 놓은 블록 수 (검증용)
  bag: PieceType[];
  rng: () => number;
}

const BASE: Record<PieceType, number[][]> = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
};

const rotateCW = (m: number[][]) => m[0].map((_, x) => m.map((row) => row[x]).reverse());

// 모양마다 네 방향의 칸 좌표를 미리 계산해 둔다
const SHAPES: Record<PieceType, [number, number][][]> = {} as never;
for (const t of PIECE_TYPES) {
  let m = BASE[t];
  const rots: [number, number][][] = [];
  for (let r = 0; r < 4; r++) {
    const cells: [number, number][] = [];
    m.forEach((row, y) => row.forEach((v, x) => v && cells.push([x, y])));
    rots.push(cells);
    m = rotateCW(m);
  }
  SHAPES[t] = rots;
}

export const shapeOf = (t: PieceType, rot: number): [number, number][] => SHAPES[t][((rot % 4) + 4) % 4];
export const cellsOf = (p: Piece): [number, number][] => shapeOf(p.t, p.rot).map(([x, y]) => [p.x + x, p.y + y]);

function collides(grid: (Cell | null)[][], t: PieceType, rot: number, x: number, y: number): boolean {
  for (const [dx, dy] of shapeOf(t, rot)) {
    const cx = x + dx;
    const cy = y + dy;
    if (cx < 0 || cx >= COLS || cy >= ROWS) return true;
    if (cy >= 0 && grid[cy][cx]) return true;
  }
  return false;
}

function refillBag(g: Game): void {
  const bag = [...PIECE_TYPES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(g.rng() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  g.bag.push(...bag);
}

function takeNext(g: Game): PieceType {
  while (g.next.length < 5) {
    if (g.bag.length === 0) refillBag(g);
    g.next.push(g.bag.shift()!);
  }
  return g.next.shift()!;
}

function spawn(g: Game, t: PieceType): void {
  const size = BASE[t].length;
  g.piece = { t, rot: 0, x: Math.floor((COLS - size) / 2), y: t === 'I' ? -1 : 0, faceIdx: Math.floor(g.rng() * 4), v: Math.floor(g.rng() * 3) };
  if (collides(g.grid, t, 0, g.piece.x, g.piece.y)) g.over = true;
  takeNext(g); // 대기열을 항상 채워 둔다
  g.next.unshift(g.next.pop()!);
}

export const levelOf = (lines: number) => 1 + Math.floor(lines / 10);
// 한 칸 내려오는 데 걸리는 시간(ms): 레벨이 오를수록 빨라진다
export const dropInterval = (level: number) => Math.max(70, Math.round(800 * Math.pow(0.85, level - 1)));

export function createGame(rng: () => number = Math.random): Game {
  const g: Game = {
    grid: Array.from({ length: ROWS }, () => Array<Cell | null>(COLS).fill(null)),
    piece: { t: 'T', rot: 0, x: 3, y: 0, faceIdx: 0, v: 0 },
    next: [],
    hold: null,
    canHold: true,
    score: 0,
    lines: 0,
    level: 1,
    over: false,
    locks: 0,
    bag: [],
    rng,
  };
  const first = takeNext(g);
  spawn(g, first);
  return g;
}

export function move(g: Game, dx: number): boolean {
  if (g.over || collides(g.grid, g.piece.t, g.piece.rot, g.piece.x + dx, g.piece.y)) return false;
  g.piece.x += dx;
  return true;
}

// 벽이나 다른 블록에 걸려도 조금 밀어서 돌릴 수 있게 한다
const KICKS: [number, number][] = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0], [-1, -1], [1, -1]];
export function rotate(g: Game, dir: 1 | -1): boolean {
  if (g.over || g.piece.t === 'O') return false;
  const rot = (g.piece.rot + dir + 4) % 4;
  for (const [kx, ky] of KICKS) {
    if (!collides(g.grid, g.piece.t, rot, g.piece.x + kx, g.piece.y + ky)) {
      g.piece.rot = rot;
      g.piece.x += kx;
      g.piece.y += ky;
      return true;
    }
  }
  return false;
}

// 이 블록이 그 자리에 놓일 수 있는지 (검증·봇용)
export const fits = (g: Game, p: Piece) => !collides(g.grid, p.t, p.rot, p.x, p.y);

export const isGrounded = (g: Game) => collides(g.grid, g.piece.t, g.piece.rot, g.piece.x, g.piece.y + 1);

// 한 칸 아래로. 못 내려가면 false
export function stepDown(g: Game): boolean {
  if (g.over || isGrounded(g)) return false;
  g.piece.y += 1;
  return true;
}

export function ghostY(g: Game): number {
  let y = g.piece.y;
  while (!collides(g.grid, g.piece.t, g.piece.rot, g.piece.x, y + 1)) y++;
  return y;
}

export interface LockResult {
  cleared: number[]; // 지워진 줄 번호(지우기 전 기준)
  gameOver: boolean;
}

// 지금 블록을 그 자리에 굳히고 줄을 지운 뒤 다음 블록을 내보낸다
export function lock(g: Game): LockResult {
  const p = g.piece;
  let lockOut = false; // 칸 위쪽 밖에서 굳으면 게임 끝
  cellsOf(p).forEach(([x, y], i) => {
    if (y >= 0) g.grid[y][x] = { t: p.t, face: i === p.faceIdx, v: p.v };
    else lockOut = true;
  });
  g.locks += 1;
  const cleared: number[] = [];
  for (let y = 0; y < ROWS; y++) if (g.grid[y].every(Boolean)) cleared.push(y);
  if (cleared.length) {
    g.grid = g.grid.filter((_, y) => !cleared.includes(y));
    while (g.grid.length < ROWS) g.grid.unshift(Array<Cell | null>(COLS).fill(null));
    g.score += [0, 100, 300, 500, 800][cleared.length] * g.level;
    g.lines += cleared.length;
    g.level = levelOf(g.lines);
  }
  g.canHold = true;
  if (lockOut) g.over = true;
  else spawn(g, takeNext(g));
  return { cleared, gameOver: g.over };
}

export function hardDrop(g: Game): LockResult | null {
  if (g.over) return null;
  const y = ghostY(g);
  g.score += (y - g.piece.y) * 2;
  g.piece.y = y;
  return lock(g);
}

export function softDrop(g: Game): boolean {
  if (!stepDown(g)) return false;
  g.score += 1;
  return true;
}

export function holdPiece(g: Game): boolean {
  if (g.over || !g.canHold) return false;
  const cur = g.piece.t;
  if (g.hold) {
    const swap = g.hold;
    g.hold = cur;
    spawn(g, swap);
  } else {
    g.hold = cur;
    spawn(g, takeNext(g));
  }
  g.canHold = false;
  return true;
}

export const stackHeight = (g: Game): number => {
  const top = g.grid.findIndex((row) => row.some(Boolean));
  return top < 0 ? 0 : ROWS - top;
};
