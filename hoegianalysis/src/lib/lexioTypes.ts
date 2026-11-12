// 렉시오: 서버와 화면이 함께 쓰는 타입 (서버 전용 코드를 넣지 않는다)
export type LexioMode = 'bot' | 'pvp';
export const LEXIO_NAME_LIMIT = 8;
export const LEXIO_TURN_CHOICES = [20, 30, 45, 60] as const;

export interface LexioSeatView {
  name: string;
  bot: boolean;
  count: number; // 남은 타일 수 (패는 보이지 않는다)
  total: number; // 누적 점수
  passed: boolean;
  isTurn: boolean;
  isYou: boolean;
}

export interface LexioPlayView {
  seat: number;
  tiles: number[];
  label: string;
}

export interface LexioView {
  version: number;
  code: string;
  mode: LexioMode;
  now: number;
  turnSecs: number;
  status: 'lobby' | 'playing' | 'ended';
  maxPlayers: number;
  you: number;
  isHost: boolean;
  round: number;
  maxNum: number;
  seats: LexioSeatView[];
  myHand: number[];
  table: LexioPlayView | null;
  trick: LexioPlayView[];
  turn: number | null;
  myTurn: boolean;
  canPass: boolean;
  turnEndsAt: number | null;
  last: { seq: number; seat: number; kind: 'play' | 'pass'; label: string } | null;
  winner: number | null;
  delta: number[] | null;
  remaining: number[] | null;
}
