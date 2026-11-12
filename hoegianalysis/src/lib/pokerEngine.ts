import { randomInt } from 'crypto';

// 인디언 포커 규칙 엔진 (DB와 무관한 순수 로직).
// 칩 20개로 시작, 매 라운드 기본 베팅 1칩. 상대 카드만 보이고 내 카드는 모른다.
// 칩 보존: chips[0] + chips[1] + bets[0] + bets[1] + carry === 시작 칩 × 2 (항상)

export const START_CHIPS = 20; // 권장 시작 칩
export const CHIP_CHOICES = [10, 20, 30, 50] as const;
export const REVEAL_MS = 1500; // 결과 공개 시간
export const TEN_PENALTY = 10;

export type Seat = 0 | 1;
export type ActionType = 'call' | 'raise' | 'fold' | 'allin';

export interface RoundResult {
  round: number;
  cards: [number, number];
  kind: 'showdown' | 'tie' | 'fold';
  winner: Seat | null; // 무승부(이월)는 null
  folder: Seat | null;
  pot: number; // 이번에 걸린 판돈 (이월분 포함)
  penalty: number; // 폴드로 추가로 옮겨진 칩
  penaltyReason: 'higher' | 'ten' | null;
  allIn: boolean; // 한쪽 칩이 바닥난 채로 카드를 비교한 판
}

// 화면에 상황 그림을 띄우기 위한 베팅 중 사건 (id는 계속 늘어난다)
export interface BetEvent {
  id: number;
  kind: 'allin' | 'tense';
  seat: Seat;
}

export interface PokerState {
  round: number;
  chips: [number, number]; // 아직 안 건 칩
  bets: [number, number]; // 이번 라운드에 건 칩 (기본 베팅 포함)
  carry: number; // 무승부로 넘어온 판돈
  cards: [number, number];
  deck: number[]; // 남은 카드 (뽑을 순서)
  used: number[]; // 이번 덱에서 이미 나온 카드 (공개된 정보)
  toAct: Seat;
  raised: boolean; // toAct가 레이즈를 받은 상태
  phase: 'betting' | 'reveal' | 'ended';
  turnEndsAt: number | null;
  revealEndsAt: number | null;
  botActAt: number | null;
  result: RoundResult | null;
  winner: Seat | null;
  eventSeq?: number;
  event?: BetEvent | null;
}

export interface Config {
  turnSecs: number;
  botSeat: Seat | null; // 봇이 앉은 자리 (없으면 null)
  startChips?: number; // 방을 만들 때 정한 시작 칩 (없으면 20)
}

export class RuleError extends Error {}

const other = (s: Seat): Seat => (s === 0 ? 1 : 0);
export const potOf = (s: PokerState) => s.carry + s.bets[0] + s.bets[1];
// 이번 라운드에 한 사람이 걸 수 있는 최대(상대가 맞출 수 있는 만큼)
export const capOf = (s: PokerState) => Math.min(s.bets[0] + s.chips[0], s.bets[1] + s.chips[1]);

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const FULL_DECK = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const newDeck = () => shuffle(FULL_DECK);

export function initState(now: number, cfg: Config): PokerState {
  const s: PokerState = {
    round: 0,
    chips: [cfg.startChips ?? START_CHIPS, cfg.startChips ?? START_CHIPS],
    bets: [0, 0],
    carry: 0,
    cards: [0, 0],
    deck: newDeck(),
    used: [],
    toAct: 0,
    raised: false,
    phase: 'betting',
    turnEndsAt: null,
    revealEndsAt: null,
    botActAt: null,
    result: null,
    winner: null,
    eventSeq: 0,
    event: null,
  };
  return startRound(s, now, cfg);
}

function schedule(s: PokerState, now: number, cfg: Config): PokerState {
  const botTurn = cfg.botSeat !== null && s.toAct === cfg.botSeat;
  return {
    ...s,
    turnEndsAt: now + cfg.turnSecs * 1000,
    botActAt: botTurn ? now + 900 + randomInt(0, 900) : null,
  };
}

function startRound(prev: PokerState, now: number, cfg: Config): PokerState {
  const s: PokerState = { ...prev, chips: [...prev.chips], bets: [0, 0], cards: [0, 0], deck: [...prev.deck], used: [...prev.used] };
  if (s.deck.length < 2) {
    s.deck = newDeck();
    s.used = [];
  }
  s.round += 1;
  s.cards = [s.deck.pop()!, s.deck.pop()!];
  // 기본 베팅 1칩씩 (칩이 없으면 못 낸다)
  for (const i of [0, 1] as const) {
    const ante = Math.min(1, s.chips[i]);
    s.chips[i] -= ante;
    s.bets[i] = ante;
  }
  s.toAct = s.round % 2 === 1 ? 0 : 1; // 먼저 행동하는 사람은 번갈아
  s.raised = false;
  s.phase = 'betting';
  s.revealEndsAt = null;
  // 더 걸 칩이 없으면 바로 카드를 비교한다
  if (capOf(s) <= Math.max(s.bets[0], s.bets[1])) return showdown(s, now, cfg);
  return schedule(s, now, cfg);
}

function finishRound(s: PokerState, result: RoundResult, now: number): PokerState {
  const next: PokerState = {
    ...s,
    bets: [0, 0],
    result,
    used: [...s.used, ...s.cards],
    raised: false,
    turnEndsAt: null,
    botActAt: null,
  };
  if (next.carry === 0 && (next.chips[0] === 0 || next.chips[1] === 0)) {
    next.phase = 'ended';
    next.winner = next.chips[0] > 0 ? 0 : 1;
    next.revealEndsAt = null;
  } else {
    next.phase = 'reveal';
    next.revealEndsAt = now + REVEAL_MS;
  }
  return next;
}

function showdown(s: PokerState, now: number, _cfg: Config): PokerState {
  const pot = potOf(s);
  const [a, b] = s.cards;
  const chips: [number, number] = [...s.chips];
  let carry = 0;
  let winner: Seat | null = null;
  if (a === b) {
    carry = pot; // 같은 숫자면 판돈을 다음 라운드로 이월
  } else {
    winner = a > b ? 0 : 1;
    chips[winner] += pot;
  }
  return finishRound(
    { ...s, chips, carry },
    {
      round: s.round,
      cards: [a, b],
      kind: winner === null ? 'tie' : 'showdown',
      winner,
      folder: null,
      pot,
      penalty: 0,
      penaltyReason: null,
      allIn: s.chips[0] === 0 || s.chips[1] === 0,
    },
    now,
  );
}

function fold(s: PokerState, seat: Seat, now: number): PokerState {
  const op = other(seat);
  const pot = potOf(s);
  const myCard = s.cards[seat];
  // 내 카드가 더 높은데 폴드하면 이번에 건 칩만큼, 10을 들고 폴드하면 10칩. 둘 중 큰 하나만 적용
  const higher = myCard > s.cards[op] ? s.bets[seat] : 0;
  const ten = myCard === 10 ? TEN_PENALTY : 0;
  const wanted = Math.max(higher, ten);
  const penalty = Math.min(wanted, s.chips[seat]); // 칩이 모자라면 남은 만큼만
  const chips: [number, number] = [...s.chips];
  chips[seat] -= penalty;
  chips[op] += pot + penalty;
  return finishRound(
    { ...s, chips, carry: 0 },
    {
      round: s.round,
      cards: [...s.cards] as [number, number],
      kind: 'fold',
      winner: op,
      folder: seat,
      pot,
      penalty,
      penaltyReason: penalty === 0 ? null : higher >= ten ? 'higher' : 'ten',
      allIn: false,
    },
    now,
  );
}

export interface Legal {
  call: boolean;
  callAmount: number; // 콜에 더 내야 하는 칩
  raise: boolean;
  raiseTo: number; // 레이즈하면 내 총 베팅
  allin: boolean;
  allinTo: number; // 올인하면 내 총 베팅
}

export function legalFor(s: PokerState, seat: Seat): Legal {
  const mine = s.bets[seat];
  const high = Math.max(s.bets[0], s.bets[1]);
  const cap = capOf(s);
  const active = s.phase === 'betting' && s.toAct === seat;
  return {
    call: active,
    callAmount: Math.max(0, high - mine),
    raise: active && high + 1 <= cap,
    raiseTo: high + 1,
    allin: active && cap > mine,
    allinTo: cap,
  };
}

export function applyAction(prev: PokerState, seat: Seat, action: ActionType, now: number, cfg: Config): PokerState {
  if (prev.phase !== 'betting' || prev.toAct !== seat) throw new RuleError('지금은 내 차례가 아니에요.');
  const s: PokerState = { ...prev, chips: [...prev.chips], bets: [...prev.bets] as [number, number] };
  const op = other(seat);
  const cap = capOf(s);
  const high = Math.max(s.bets[0], s.bets[1]);

  const putTo = (total: number) => {
    s.chips[seat] -= total - s.bets[seat];
    s.bets[seat] = total;
  };

  if (action === 'fold') return fold(s, seat, now);
  if (action === 'call') {
    putTo(high);
    return showdown(s, now, cfg);
  }
  if (action === 'raise') {
    if (high + 1 > cap) throw new RuleError('더 올릴 수 없어요. 올인이나 콜을 하세요.');
    putTo(high + 1);
  } else {
    if (cap <= s.bets[seat]) throw new RuleError('올인할 칩이 없어요.');
    putTo(cap);
    if (s.bets[seat] === s.bets[op]) return showdown(s, now, cfg); // 상대 베팅을 그대로 맞춘 올인
  }
  s.toAct = op;
  s.raised = true;
  // 올인 선언이나 판이 커진 재레이즈는 화면에 상황 그림으로 알린다
  const id = (s.eventSeq ?? 0) + 1;
  if (action === 'allin') {
    s.eventSeq = id;
    s.event = { id, kind: 'allin', seat };
  } else if (action === 'raise' && s.bets[seat] >= 3) {
    s.eventSeq = id;
    s.event = { id, kind: 'tense', seat };
  }
  return schedule(s, now, cfg);
}

// ---------- 봇 ----------

// 봇은 상대 카드만 보고 자기 카드를 추리한다 (이미 나온 카드는 공개 정보)
export function botDecide(s: PokerState, seat: Seat, rnd: () => number = Math.random): ActionType {
  const op = other(seat);
  const oppCard = s.cards[op];
  const pool = [...FULL_DECK];
  for (const c of [...s.used, oppCard]) {
    const i = pool.indexOf(c);
    if (i >= 0) pool.splice(i, 1);
  }
  const n = Math.max(1, pool.length);
  const win = pool.filter((c) => c > oppCard).length / n;
  const lose = pool.filter((c) => c < oppCard).length / n;
  const p10 = pool.filter((c) => c === 10).length / n;
  const edge = win - lose + (rnd() - 0.5) * 0.3; // 약간의 변덕
  const legal = legalFor(s, seat);
  const bet = s.bets[seat];

  if (s.raised) {
    const oppBet = s.bets[op];
    const evCall = (win - lose) * oppBet;
    const lossIfFold = bet + Math.max(win * bet, p10 * TEN_PENALTY);
    if (legal.allin && win > 0.85 && rnd() < 0.3) return 'allin';
    if (legal.raise && edge > 0.45 && rnd() < 0.5) return 'raise';
    return evCall + (rnd() - 0.5) * 1.5 >= -lossIfFold ? 'call' : 'fold';
  }
  if (legal.allin && win > 0.9 && rnd() < 0.25) return 'allin';
  if (legal.raise && (edge > 0.2 || rnd() < 0.08)) return 'raise';
  return 'call';
}

// ---------- 시간·봇 진행 ----------

// 시간이 지났거나 봇 차례가 됐으면 상태를 앞으로 보낸다. 바뀐 게 없으면 같은 객체를 돌려준다
export function tick(prev: PokerState, now: number, cfg: Config): PokerState {
  let s = prev;
  for (let i = 0; i < 6; i++) {
    if (s.phase === 'reveal' && s.revealEndsAt !== null && now >= s.revealEndsAt) {
      s = startRound(s, now, cfg);
      continue;
    }
    if (s.phase === 'betting') {
      if (cfg.botSeat !== null && s.toAct === cfg.botSeat && s.botActAt !== null && now >= s.botActAt) {
        s = applyAction(s, s.toAct, botDecide(s, s.toAct), now, cfg);
        continue;
      }
      if (s.turnEndsAt !== null && now >= s.turnEndsAt) {
        // 레이즈가 없으면 자동 콜, 레이즈를 받았으면 자동 폴드
        s = applyAction(s, s.toAct, s.raised ? 'fold' : 'call', now, cfg);
        continue;
      }
    }
    break;
  }
  return s;
}
