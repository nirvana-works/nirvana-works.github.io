// 인디언 포커: 서버와 화면이 함께 쓰는 타입 (서버 전용 코드를 넣지 않는다)
export type PokerMode = 'bot' | 'pvp';
export const POKER_NAME_LIMIT = 8;
export const TURN_CHOICES = [15, 20, 30] as const;

export interface PokerResultView {
  round: number;
  cards: [number, number]; // [내 카드, 상대 카드]
  kind: 'showdown' | 'tie' | 'fold';
  winner: 'me' | 'opp' | null;
  folder: 'me' | 'opp' | null;
  pot: number;
  penalty: number;
  penaltyReason: 'higher' | 'ten' | null;
  allIn: boolean;
}

export interface PokerView {
  version: number;
  code: string;
  mode: PokerMode;
  now: number;
  turnSecs: number;
  names: { me: string; opp: string | null };
  status: 'waiting' | 'betting' | 'reveal' | 'ended';
  round: number;
  chips: { me: number; opp: number };
  bets: { me: number; opp: number };
  carry: number;
  pot: number;
  oppCard: number | null; // 상대 카드 (내 눈에만 보인다)
  myCard: number | null; // 내 카드는 공개될 때까지 null
  myTurn: boolean;
  raised: boolean; // 내가 레이즈를 받은 상태
  turnEndsAt: number | null;
  result: PokerResultView | null;
  winner: 'me' | 'opp' | null;
  legal: { call: boolean; callAmount: number; raise: boolean; raiseTo: number; allin: boolean; allinTo: number };
  deckLeft: number;
  // 베팅 중 사건(올인 선언, 판이 커짐). id가 새로 바뀔 때만 그림을 띄운다
  event: { id: number; kind: 'allin' | 'tense'; who: 'me' | 'opp' } | null;
}
