import { ADJ, BY_ID, INDIAN_ZONE, MEXICAN_ZONE, RAILS, REGIONS, SIDE_NAME, TURN_LIMIT, type Side } from './data';

// 넙죽이 남북전쟁: 지도 위 턴제 규칙, 봇, 돌발 상황. 화면과 상관없는 순수 계산만 둔다.

export interface Units {
  i: number; // 보병
  c: number; // 기병
  k: number; // 대포
}
export const ZERO: Units = { i: 0, c: 0, k: 0 };
export const COST: Units = { i: 2, c: 4, k: 6 };
export const UNIT_NAME: Record<keyof Units, string> = { i: '보병', c: '기병', k: '대포' };

export interface RState {
  owner: Side | null;
  units: Units;
  ready: Units; // 이번 턴에 아직 움직일 수 있는 병력
  stuck: boolean; // 폭풍우로 고립 (한 턴 못 움직임)
  burned: boolean; // 폭탄 테러로 이번 턴 수입 없음
}

export type Level = 1 | 2 | 3;

export interface Game {
  turn: number;
  player: Side;
  level: Level;
  gold: Record<Side, number>;
  regions: Record<string, RState>;
  winner: Side | 'draw' | null;
  reason: string;
  log: string[];
  holds: { id: string; side: Side } | null; // 수도를 점령 중 (상대의 한 턴을 버티면 승리)
}

export const total = (u: Units): number => u.i + u.c + u.k;
export const power = (u: Units): number => u.i + u.c * 1.8 + u.k * 2.4;
export const add = (a: Units, b: Units): Units => ({ i: a.i + b.i, c: a.c + b.c, k: a.k + b.k });
export const sub = (a: Units, b: Units): Units => ({ i: Math.max(0, a.i - b.i), c: Math.max(0, a.c - b.c), k: Math.max(0, a.k - b.k) });
export const other = (s: Side): Side => (s === 'U' ? 'C' : 'U');
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export function newGame(player: Side, level: Level): Game {
  const start: Record<string, Units> = {
    DC: { i: 8, c: 3, k: 2 },
    PA: { i: 4, c: 1, k: 1 },
    NY: { i: 3, c: 0, k: 0 },
    IL: { i: 4, c: 1, k: 1 },
    OH: { i: 3, c: 1, k: 0 },
    MO: { i: 2, c: 1, k: 0 },
    VA: { i: 9, c: 4, k: 3 },
    GA: { i: 4, c: 1, k: 1 },
    TN: { i: 4, c: 2, k: 1 },
    LA: { i: 3, c: 0, k: 1 },
    TX: { i: 3, c: 1, k: 0 },
    NC: { i: 3, c: 1, k: 0 },
  };
  const regions: Record<string, RState> = {};
  for (const r of REGIONS) {
    const u = start[r.id] ?? { ...ZERO };
    regions[r.id] = { owner: r.start, units: { ...u }, ready: { ...u }, stuck: false, burned: false };
  }
  const g: Game = {
    turn: 1,
    player,
    level,
    gold: { U: 6, C: 6 },
    regions,
    winner: null,
    reason: '',
    log: [],
    holds: null,
  };
  return g;
}

export const owned = (g: Game, s: Side): string[] => REGIONS.filter((r) => g.regions[r.id].owner === s).map((r) => r.id);

export function incomeOf(g: Game, s: Side): number {
  let n = 0;
  for (const id of owned(g, s)) if (!g.regions[id].burned) n += BY_ID[id].income;
  n = Math.ceil(n / 2); // 지역 수입의 절반이 금화가 된다
  // 봇은 단계에 따라 보너스를 받는다
  if (s !== g.player) n += g.level - 1 > 0 ? g.level - 1 : 0;
  return n;
}

export function say(g: Game, text: string): void {
  g.log.unshift(text);
  g.log = g.log.slice(0, 40);
}

// ---------- 턴 시작 ----------
export function startTurn(g: Game, s: Side): void {
  // 수도를 점령한 채 상대의 한 턴을 버텼다면 전쟁이 끝난다
  if (g.holds && g.holds.side === s && g.regions[g.holds.id].owner === s) {
    g.winner = s;
    g.reason = `${SIDE_NAME[s]}이 ${BY_ID[g.holds.id].name}을(를) 끝까지 지켜 냈어요!`;
    return;
  }
  g.gold[s] += incomeOf(g, s);
  for (const id of owned(g, s)) {
    const st = g.regions[id];
    st.ready = st.stuck ? { ...ZERO } : { ...st.units };
    st.stuck = false;
  }
}

export function endRound(g: Game): void {
  for (const r of REGIONS) g.regions[r.id].burned = false;
  g.turn += 1;
  if (g.turn > TURN_LIMIT) finishByScore(g);
}

function score(g: Game, s: Side): number {
  return owned(g, s).reduce((n, id) => n + BY_ID[id].income * 2 + 1 + total(g.regions[id].units) * 0.2, 0);
}

function finishByScore(g: Game): void {
  const a = score(g, 'U');
  const b = score(g, 'C');
  if (Math.abs(a - b) < 2) {
    g.winner = 'draw';
    g.reason = '1865년 봄, 승패를 가르지 못한 채 전쟁이 끝났어요.';
  } else {
    g.winner = a > b ? 'U' : 'C';
    g.reason = `1865년 봄, 더 많은 땅을 지킨 ${SIDE_NAME[g.winner]}이 이겼어요.`;
  }
}

// ---------- 이동·전투 ----------
export interface Encounter {
  attacker: Side;
  from: string;
  to: string;
  att: Units;
  def: Units;
  fort: boolean;
}

// 병력을 보낸다. 빈 땅이면 바로 차지하고, 적이 있으면 전투 정보(Encounter)를 돌려준다
export function sendTroops(g: Game, from: string, to: string, part: 'all' | 'half'): Encounter | null {
  const src = g.regions[from];
  const side = src.owner as Side;
  const amount: Units =
    part === 'all' ? { ...src.ready } : { i: Math.ceil(src.ready.i / 2), c: Math.floor(src.ready.c / 2), k: Math.floor(src.ready.k / 2) };
  if (total(amount) === 0) return null;
  src.units = sub(src.units, amount);
  src.ready = sub(src.ready, amount);

  const dst = g.regions[to];
  if (dst.owner === side) {
    dst.units = add(dst.units, amount);
    return null;
  }
  if (total(dst.units) === 0) {
    capture(g, to, side, amount);
    return null;
  }
  return { attacker: side, from, to, att: amount, def: { ...dst.units }, fort: !!BY_ID[to].fort };
}

function capture(g: Game, id: string, side: Side, units: Units): void {
  const dst = g.regions[id];
  const prev = dst.owner;
  dst.owner = side;
  dst.units = { ...units };
  dst.ready = { ...ZERO };
  dst.stuck = false;
  say(g, `${SIDE_NAME[side]}이 ${BY_ID[id].name}을(를) 차지했어요${prev ? '' : ' (중립 지역)'}.`);
  const cap = BY_ID[id].capital;
  if (g.holds && g.holds.id === id && g.holds.side !== side) {
    g.holds = null;
    say(g, `${SIDE_NAME[side]}이 ${BY_ID[id].name}을(를) 되찾았어요!`);
  }
  if (cap && cap !== side) {
    g.holds = { id, side };
    say(g, `${SIDE_NAME[side]}이 수도 ${BY_ID[id].name}을(를) 점령했어요! 한 턴을 버티면 전쟁에 이겨요.`);
  }
}

export interface BattleResult {
  attWon: boolean;
  attSurv: Units;
  defSurv: Units;
}

export function applyBattle(g: Game, enc: Encounter, res: BattleResult): void {
  const dst = g.regions[enc.to];
  if (res.attWon) {
    say(g, `${SIDE_NAME[enc.attacker]}이 ${BY_ID[enc.to].name} 전투에서 이겼어요.`);
    capture(g, enc.to, enc.attacker, res.attSurv);
  } else {
    say(g, `${SIDE_NAME[other(enc.attacker)]}이 ${BY_ID[enc.to].name}을(를) 지켜 냈어요.`);
    dst.units = { ...res.defSurv };
    dst.ready = { ...ZERO };
    // 진 쪽 살아남은 병력은 출발한 곳으로 물러난다
    const origin = g.regions[enc.from];
    if (origin.owner === enc.attacker) origin.units = add(origin.units, res.attSurv);
  }
}

// 전투를 직접 하지 않고 계산으로 끝낸다
export function autoBattle(enc: Encounter): BattleResult {
  const noise = () => 0.85 + Math.random() * 0.3;
  const a = power(enc.att) * noise();
  const d = power(enc.def) * (enc.fort ? 1.3 : 1) * noise();
  const attWon = a > d;
  const frac = (loser: number, winner: number) => Math.min(0.9, (loser / Math.max(winner, 0.1)) * 0.8);
  const keep = (u: Units, f: number): Units => ({ i: Math.max(0, Math.floor(u.i * (1 - f))), c: Math.floor(u.c * (1 - f)), k: Math.floor(u.k * (1 - f)) });
  if (attWon) {
    const surv = keep(enc.att, frac(d, a));
    return { attWon: true, attSurv: total(surv) ? surv : { i: 1, c: 0, k: 0 }, defSurv: { ...ZERO } };
  }
  const surv = keep(enc.def, frac(a, d));
  return { attWon: false, attSurv: keep(enc.att, 0.7), defSurv: total(surv) ? surv : { i: 1, c: 0, k: 0 } };
}

// 요새 습격(액션)이 끝난 뒤 수비 병력을 깎는다
export function weakenDefenders(enc: Encounter, success: boolean): Encounter {
  if (success) {
    const f = 1 / 3;
    return { ...enc, def: { i: Math.ceil(enc.def.i * (1 - f)), c: Math.ceil(enc.def.c * (1 - f)), k: Math.floor(enc.def.k * 0.5) }, fort: false };
  }
  return { ...enc, att: { i: Math.max(1, Math.ceil(enc.att.i * 0.75)), c: enc.att.c, k: enc.att.k } };
}

// ---------- 모집 ----------
export function recruit(g: Game, side: Side, id: string, kind: keyof Units): boolean {
  const st = g.regions[id];
  if (st.owner !== side || g.gold[side] < COST[kind]) return false;
  g.gold[side] -= COST[kind];
  st.units[kind] += 1;
  return true;
}

// ---------- 봇 ----------
const dist = (g: Game, from: string, ok: (id: string) => boolean): number => {
  const seen = new Set([from]);
  let frontier = [from];
  let d = 0;
  while (frontier.length) {
    const next: string[] = [];
    for (const id of frontier) {
      if (ok(id)) return d;
      for (const n of ADJ[id]) if (!seen.has(n)) (seen.add(n), next.push(n));
    }
    frontier = next;
    d += 1;
  }
  return 99;
};

export function botRecruit(g: Game, side: Side): void {
  const foe = other(side);
  // 적과 맞닿은 지역, 없으면 수도부터
  const front = owned(g, side).filter((id) => ADJ[id].some((n) => g.regions[n].owner === foe));
  const spots = front.length ? front : owned(g, side);
  if (!spots.length) return;
  let guard = 0;
  while (g.gold[side] >= COST.i && guard++ < 30) {
    const id = spots.reduce((best, cur) => (power(g.regions[cur].units) < power(g.regions[best].units) ? cur : best), spots[0]);
    const u = g.regions[id].units;
    const kind: keyof Units = g.gold[side] >= COST.k && u.k < Math.ceil(u.i / 4) ? 'k' : g.gold[side] >= COST.c && u.c < Math.ceil(u.i / 2.5) ? 'c' : 'i';
    if (!recruit(g, side, id, kind)) break;
  }
}

export interface Move {
  from: string;
  to: string;
  part: 'all' | 'half';
}

// 봇이 다음에 할 이동 하나. 더 할 게 없으면 null
export function nextBotMove(g: Game, side: Side): Move | null {
  const foe = other(side);
  const aggression = g.level === 1 ? 1.5 : g.level === 2 ? 1.15 : 0.95; // 낮을수록 공격적
  let best: { move: Move; value: number } | null = null;

  for (const id of owned(g, side)) {
    const st = g.regions[id];
    if (total(st.ready) === 0) continue;
    const myP = power(st.ready);
    const threatened = ADJ[id].some((n) => g.regions[n].owner === foe && power(g.regions[n].units) > 0);
    const enemyNear = ADJ[id].reduce((n, x) => (g.regions[x].owner === foe ? n + power(g.regions[x].units) : n), 0);
    // 수도·요새는 위협이 있을 땐 병력을 남겨 둔다
    const keep = BY_ID[id].capital === side || BY_ID[id].fort ? Math.min(enemyNear * 0.8, power(st.units) * 0.5) : threatened ? enemyNear * 0.5 : 0;

    for (const n of ADJ[id]) {
      const t = g.regions[n];
      const def = BY_ID[n];
      let value = -1;
      if (t.owner === side) {
        // 후방 병력은 전선으로
        if (!threatened) {
          const dHere = dist(g, id, (x) => g.regions[x].owner === foe);
          const dThere = dist(g, n, (x) => g.regions[x].owner === foe);
          if (dThere < dHere && total(st.ready) > 0) value = 1 + (dHere - dThere);
        }
      } else if (total(t.units) === 0) {
        value = 4 + def.income * 1.2 + (def.fort ? 2 : 0) + (def.capital ? 12 : 0) + (t.owner === foe ? 2 : 0);
      } else {
        const ratio = myP / Math.max(power(t.units) * (def.fort ? 1.3 : 1), 0.1);
        if (ratio >= aggression) value = 3 + def.income + ratio * 2 + (def.capital ? 10 : 0);
      }
      if (value < 0) continue;
      // 지켜야 할 병력을 빼고도 보낼 수 있어야 한다 (빈 땅 점령은 소수만으로도)
      const sendable = Math.max(0, myP - keep);
      if (t.owner !== side && total(t.units) > 0 && sendable < power(t.units)) continue;
      if (sendable <= 0.5 && t.owner === side) continue;
      if (!best || value > best.value) best = { move: { from: id, to: n, part: threatened && keep > 0 ? 'half' : 'all' }, value };
    }
  }
  return best?.move ?? null;
}

// ---------- 열차 ----------
export interface TrainChance {
  a: string;
  b: string;
  near: string; // 습격에 나설 우리 병력이 있는 지역
}

// 이번 턴에 적 열차가 지나가는 곳이 있으면 알려 준다 (우리 병력이 가까이 있을 때만)
export function findTrain(g: Game, side: Side): TrainChance | null {
  const foe = other(side);
  const options: TrainChance[] = [];
  for (const [a, b] of RAILS) {
    if (g.regions[a].owner !== foe || g.regions[b].owner !== foe) continue;
    for (const id of owned(g, side)) {
      if (total(g.regions[id].units) === 0) continue;
      if (ADJ[id].includes(a) || ADJ[id].includes(b)) options.push({ a, b, near: id });
    }
  }
  if (!options.length || Math.random() > 0.55) return null;
  return options[Math.floor(Math.random() * options.length)];
}

// 봇의 열차 습격은 계산으로 끝낸다
export function botTrainRaid(g: Game, side: Side): void {
  const t = findTrain(g, side);
  if (!t || Math.random() > 0.5) return;
  const foe = other(side);
  const stolen = Math.min(g.gold[foe], 3 + Math.floor(Math.random() * 3));
  g.gold[foe] -= stolen;
  g.gold[side] += stolen;
  if (stolen > 0) say(g, `${SIDE_NAME[side]}이 ${BY_ID[t.a].name}–${BY_ID[t.b].name} 열차를 털었어요! 금화 ${stolen}`);
}

// ---------- 돌발 상황 ----------
export function rollEvents(g: Game): string[] {
  const out: string[] = [];
  const hurt = (id: string, text: string) => {
    const st = g.regions[id];
    if (total(st.units) > 0) {
      st.units = { i: Math.floor(st.units.i / 2), c: Math.floor(st.units.c / 2), k: Math.floor(st.units.k / 2) };
      st.ready = { ...st.units };
      out.push(text);
    }
  };

  if (Math.random() < 0.18) {
    const armies = REGIONS.filter((r) => total(g.regions[r.id].units) > 0 && g.regions[r.id].owner);
    if (armies.length) {
      const r = armies[Math.floor(Math.random() * armies.length)];
      g.regions[r.id].stuck = true;
      out.push(`폭풍우! ${r.name}의 ${SIDE_NAME[g.regions[r.id].owner as Side]}이 고립돼서 다음 턴엔 못 움직여요.`);
    }
  }
  if (g.turn >= 3 && Math.random() < 0.18) {
    const id = INDIAN_ZONE[Math.floor(Math.random() * INDIAN_ZONE.length)];
    hurt(id, `인디언이 ${BY_ID[id].name}을(를) 습격해서 병력이 절반으로 줄었어요!`);
  }
  if (g.turn >= 4 && Math.random() < 0.12) {
    const id = MEXICAN_ZONE[Math.floor(Math.random() * MEXICAN_ZONE.length)];
    hurt(id, `멕시코군이 ${BY_ID[id].name}을(를) 습격해서 병력이 절반으로 줄었어요!`);
  }
  if (g.turn >= 2 && Math.random() < 0.1) {
    const cand = REGIONS.filter((r) => g.regions[r.id].owner);
    const r = cand[Math.floor(Math.random() * cand.length)];
    g.regions[r.id].burned = true;
    out.push(`멕시코인의 폭탄 테러! ${r.name}의 이번 턴 수입이 사라졌어요.`);
  }
  for (const t of out) say(g, t);
  return out;
}

export const copyGame = clone;
