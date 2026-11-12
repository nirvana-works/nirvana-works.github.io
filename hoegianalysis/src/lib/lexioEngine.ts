import { randomInt } from 'crypto';
import {
  MAX_SEATS,
  MIN_SEATS,
  TILES_PER_PLAYER,
  allTiles,
  beats,
  evalCombo,
  makeRank,
  maxNumFor,
  penaltyOf,
  strength,
  tileNum,
  tileSuit,
  type Combo,
} from './lexioCore';

// 렉시오 진행 엔진 (DB와 무관한 순수 로직)

export interface Play {
  seat: number;
  tiles: number[];
  combo: Combo;
}

export interface LexioState {
  n: number;
  maxNum: number;
  round: number;
  hands: number[][];
  turn: number;
  table: Play | null; // 지금 이겨야 하는 패
  trick: Play[]; // 이번 판(트릭)에 나온 패들
  passed: boolean[]; // 이번 트릭에서 패스한 사람
  passCount: number;
  phase: 'playing' | 'ended';
  winner: number | null;
  delta: number[] | null; // 이번 라운드 점수 변화
  remaining: number[] | null; // 끝났을 때 남은 타일
  total: number[]; // 누적 점수
  turnEndsAt: number | null;
  botActAt: number | null;
  seq: number; // 행동마다 늘어나는 번호
  last: { seq: number; seat: number; kind: 'play' | 'pass'; label: string } | null;
}

export interface Config {
  turnSecs: number;
  bots: boolean[]; // 자리별 봇 여부
}

export class RuleError extends Error {}

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function initRound(n: number, now: number, cfg: Config, prev?: LexioState): LexioState {
  if (n < MIN_SEATS || n > MAX_SEATS) throw new RuleError('2~4명이 필요해요.');
  const maxNum = maxNumFor(n);
  const deck = shuffle(allTiles(maxNum));
  const rk = makeRank(maxNum);
  const hands = Array.from({ length: n }, (_, i) =>
    deck.slice(i * TILES_PER_PLAYER, (i + 1) * TILES_PER_PLAYER).sort((a, b) => strength(a, rk) - strength(b, rk)),
  );
  // 첫 라운드는 가장 약한 타일(구름 3)을 가진 사람부터, 이후엔 지난 판 승자부터
  const starter = prev?.winner ?? hands.findIndex((h) => h.includes(3));
  const s: LexioState = {
    n,
    maxNum,
    round: (prev?.round ?? 0) + 1,
    hands,
    turn: starter,
    table: null,
    trick: [],
    passed: Array(n).fill(false),
    passCount: 0,
    phase: 'playing',
    winner: null,
    delta: null,
    remaining: null,
    total: prev?.total ?? Array(n).fill(0),
    turnEndsAt: null,
    botActAt: null,
    seq: prev?.seq ?? 0,
    last: null,
  };
  return schedule(s, now, cfg);
}

function schedule(s: LexioState, now: number, cfg: Config): LexioState {
  if (s.phase !== 'playing') return { ...s, turnEndsAt: null, botActAt: null };
  return {
    ...s,
    turnEndsAt: now + cfg.turnSecs * 1000,
    botActAt: cfg.bots[s.turn] ? now + 1000 + randomInt(0, 900) : null,
  };
}

export function playTiles(prev: LexioState, seat: number, tiles: number[], now: number, cfg: Config): LexioState {
  if (prev.phase !== 'playing' || prev.turn !== seat) throw new RuleError('지금은 내 차례가 아니에요.');
  const hand = prev.hands[seat];
  if (tiles.some((t) => !hand.includes(t))) throw new RuleError('가지고 있지 않은 타일이에요.');
  const rk = makeRank(prev.maxNum);
  const combo = evalCombo(tiles, rk);
  if (!combo) throw new RuleError('낼 수 없는 조합이에요.');
  if (prev.table && !beats(combo, prev.table.combo)) throw new RuleError('앞 사람이 낸 패보다 세야 해요.');

  const hands = prev.hands.map((h, i) => (i === seat ? h.filter((t) => !tiles.includes(t)) : h));
  const play: Play = { seat, tiles: [...tiles].sort((a, b) => strength(a, rk) - strength(b, rk)), combo };
  const seq = prev.seq + 1;
  const s: LexioState = {
    ...prev,
    hands,
    table: play,
    trick: [...prev.trick, play],
    passCount: 0,
    passed: Array(prev.n).fill(false),
    seq,
    last: { seq, seat, kind: 'play', label: combo.label },
  };

  if (hands[seat].length === 0) {
    // 먼저 다 낸 사람이 이긴다. 나머지는 남은 타일로 벌점을 내고, 그만큼 승자가 가져간다
    const remaining = hands.map((h) => h.length);
    const loss = hands.map((h, i) => (i === seat ? 0 : penaltyOf(h)));
    const gain = loss.reduce((a, b) => a + b, 0);
    const delta = loss.map((l, i) => (i === seat ? gain : -l));
    return {
      ...s,
      phase: 'ended',
      winner: seat,
      delta,
      remaining,
      total: s.total.map((t, i) => t + delta[i]),
      turnEndsAt: null,
      botActAt: null,
    };
  }
  s.turn = (seat + 1) % prev.n;
  return schedule(s, now, cfg);
}

export function passTurn(prev: LexioState, seat: number, now: number, cfg: Config): LexioState {
  if (prev.phase !== 'playing' || prev.turn !== seat) throw new RuleError('지금은 내 차례가 아니에요.');
  if (!prev.table) throw new RuleError('먼저 내는 사람은 패스할 수 없어요.');
  const seq = prev.seq + 1;
  const s: LexioState = {
    ...prev,
    passed: prev.passed.map((p, i) => (i === seat ? true : p)),
    passCount: prev.passCount + 1,
    seq,
    last: { seq, seat, kind: 'pass', label: '패스' },
  };
  if (s.passCount >= prev.n - 1) {
    // 모두 패스하면 마지막으로 낸 사람이 새 판을 시작한다
    s.turn = prev.table.seat;
    s.table = null;
    s.trick = [];
    s.passed = Array(prev.n).fill(false);
    s.passCount = 0;
  } else {
    s.turn = (seat + 1) % prev.n;
    while (s.passed[s.turn]) s.turn = (s.turn + 1) % prev.n;
  }
  return schedule(s, now, cfg);
}

export function nextRound(prev: LexioState, now: number, cfg: Config): LexioState {
  if (prev.phase !== 'ended') throw new RuleError('아직 끝나지 않았어요.');
  return initRound(prev.n, now, cfg, prev);
}

// ---------- 봇 ----------

// 손에서 낼 수 있는 조합 후보 (봇이 고른다). 5장 조합은 약한 타일 위주로 만든다
export function candidates(hand: number[], rk: (n: number) => number): number[][] {
  const out: number[][] = [];
  const byNum = new Map<number, number[]>();
  for (const t of hand) byNum.set(tileNum(t), [...(byNum.get(tileNum(t)) ?? []), t]);
  const st = (t: number) => strength(t, rk);

  for (const t of hand) out.push([t]);
  for (const group of byNum.values()) {
    const g = [...group].sort((a, b) => st(a) - st(b));
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) out.push([g[i], g[j]]);
    for (let i = 0; i < g.length; i++)
      for (let j = i + 1; j < g.length; j++) for (let k = j + 1; k < g.length; k++) out.push([g[i], g[j], g[k]]);
  }

  // 스트레이트·스트레이트 플러시: 연속된 순서 번호 5개
  const byRank = new Map<number, number[]>();
  for (const t of hand) byRank.set(rk(tileNum(t)), [...(byRank.get(rk(tileNum(t))) ?? []), t]);
  const ranksHave = [...byRank.keys()].sort((a, b) => a - b);
  for (const r0 of ranksHave) {
    const seqRanks = [0, 1, 2, 3, 4].map((d) => r0 + d);
    if (!seqRanks.every((r) => byRank.has(r))) continue;
    const lows = seqRanks.map((r) => [...byRank.get(r)!].sort((a, b) => st(a) - st(b)));
    out.push(lows.map((l) => l[0])); // 가장 약한 무늬로
    out.push(lows.map((l, i) => (i === 4 ? l[l.length - 1] : l[0]))); // 맨 위만 센 무늬로
    for (let s = 0; s < 4; s++) {
      const same = lows.map((l) => l.find((t) => tileSuit(t) === s));
      if (same.every((x) => x !== undefined)) out.push(same as number[]);
    }
  }
  // 플러시: 같은 무늬 5장 (약한 5장, 센 5장)
  for (let s = 0; s < 4; s++) {
    const suited = hand.filter((t) => tileSuit(t) === s).sort((a, b) => st(a) - st(b));
    if (suited.length >= 5) {
      out.push(suited.slice(0, 5));
      out.push(suited.slice(-5));
    }
  }
  // 풀하우스·포카드
  const triples = [...byNum.entries()].filter(([, g]) => g.length >= 3);
  const pairs = [...byNum.entries()].filter(([, g]) => g.length >= 2);
  for (const [tn, tg] of triples) {
    for (const [pn, pg] of pairs) {
      if (pn === tn) continue;
      out.push([...tg.slice(0, 3), ...pg.slice(0, 2)]);
    }
  }
  for (const [qn, qg] of [...byNum.entries()].filter(([, g]) => g.length === 4)) {
    const kicker = hand.filter((t) => tileNum(t) !== qn).sort((a, b) => st(a) - st(b))[0];
    if (kicker !== undefined) out.push([...qg, kicker]);
  }
  return out;
}

export function botMove(s: LexioState, seat: number, rnd: () => number = Math.random): { type: 'pass' } | { type: 'play'; tiles: number[] } {
  const rk = makeRank(s.maxNum);
  const hand = s.hands[seat];
  const valid = candidates(hand, rk)
    .map((tiles) => ({ tiles, combo: evalCombo(tiles, rk)! }))
    .filter((c) => c.combo && (!s.table || beats(c.combo, s.table.combo)));
  const minOpp = Math.min(...s.hands.map((h, i) => (i === seat ? 99 : h.length)));
  const top = (t: number[]) => Math.max(...t.map((x) => strength(x, rk)));

  if (valid.length === 0) return { type: 'pass' };

  // 큰 조합(5장>3장>2장>1장)을 먼저 털어 내는 게 좋고, 그중 약한 것부터 낸다
  const rankOf = (c: (typeof valid)[number]) => c.combo.size * 1000 - top(c.tiles);
  if (!s.table) {
    const sorted = [...valid].sort((a, b) => rankOf(b) - rankOf(a));
    // 가끔 변화를 주려고 앞쪽 몇 개 중에서 고른다
    return { type: 'play', tiles: sorted[Math.min(sorted.length - 1, Math.floor(rnd() * 2))].tiles };
  }
  // 남이 곧 끝나려 하면 가장 센 걸로 막는다
  if (minOpp <= 3) {
    const best = [...valid].sort((a, b) => (b.combo.cat - a.combo.cat) || b.combo.key - a.combo.key)[0];
    return { type: 'play', tiles: best.tiles };
  }
  const cheapest = [...valid].sort((a, b) => a.combo.key - b.combo.key || a.combo.cat - b.combo.cat)[0];
  const strongTile = top(cheapest.tiles) >= (s.maxNum - 1) * 4; // 1·2 같은 아주 센 타일을 쓰게 되는 경우
  if (strongTile && hand.length > 6 && rnd() < 0.7) return { type: 'pass' };
  if (rnd() < 0.08) return { type: 'pass' };
  return { type: 'play', tiles: cheapest.tiles };
}

// 시간이 지났거나 봇 차례면 앞으로 보낸다. 바뀐 게 없으면 같은 객체를 돌려준다
export function tick(prev: LexioState, now: number, cfg: Config): LexioState {
  let s = prev;
  for (let i = 0; i < 8; i++) {
    if (s.phase !== 'playing') break;
    if (cfg.bots[s.turn] && s.botActAt !== null && now >= s.botActAt) {
      const m = botMove(s, s.turn);
      s = m.type === 'pass' ? passTurn(s, s.turn, now, cfg) : playTiles(s, s.turn, m.tiles, now, cfg);
      continue;
    }
    if (s.turnEndsAt !== null && now >= s.turnEndsAt) {
      // 시간 초과: 이어 받는 중이면 자동 패스, 먼저 낼 차례면 가장 약한 타일 하나를 낸다
      if (s.table) s = passTurn(s, s.turn, now, cfg);
      else {
        const rk = makeRank(s.maxNum);
        const lowest = [...s.hands[s.turn]].sort((a, b) => strength(a, rk) - strength(b, rk))[0];
        s = playTiles(s, s.turn, [lowest], now, cfg);
      }
      continue;
    }
    break;
  }
  return s;
}
