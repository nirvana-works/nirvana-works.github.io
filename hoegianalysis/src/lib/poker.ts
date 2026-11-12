import { randomInt, randomUUID } from 'crypto';
import { getDb } from './db';
import { initCommunityDb } from './communityDb';
import { MafiaError } from './mafia';
import {
  RuleError,
  applyAction,
  capOf,
  initState,
  legalFor,
  potOf,
  tick,
  type ActionType,
  type Config,
  type PokerState,
  type Seat,
} from './pokerEngine';
import { POKER_NAME_LIMIT, TURN_CHOICES, type PokerMode, type PokerView } from './pokerTypes';

// 인디언 포커 방. 마피아와 같은 방식: 서버가 진실이고 폰은 주기적으로 상태를 받아간다.

interface Row {
  id: string;
  code: string;
  mode: PokerMode;
  p1_name: string;
  p1_token: string;
  p2_name: string | null;
  p2_token: string | null;
  turn_secs: number;
  state: string | null;
  version: number;
  created_at: number;
  updated_at: number;
}

const TTL_MS = 1000 * 60 * 60 * 6;
const BOT_NAME = '마피아 넙죽이';

function cleanName(raw: unknown): string {
  const name = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
  if (!name) throw new MafiaError('이름을 입력하세요.');
  if ([...name].length > POKER_NAME_LIMIT) throw new MafiaError(`이름은 ${POKER_NAME_LIMIT}자까지 쓸 수 있어요.`);
  return name;
}

async function load(code: string): Promise<Row> {
  await initCommunityDb();
  const r = await getDb().execute({ sql: 'SELECT * FROM poker_games WHERE code = ? ORDER BY created_at DESC LIMIT 1', args: [code] });
  const row = r.rows[0] as unknown as Row | undefined;
  if (!row) throw new MafiaError('그 코드의 방을 찾지 못했어요.', 404);
  return { ...row, version: Number(row.version), turn_secs: Number(row.turn_secs) };
}

const cfgOf = (row: Row): Config => ({ turnSecs: row.turn_secs, botSeat: row.mode === 'bot' ? 1 : null });
const stateOf = (row: Row): PokerState | null => (row.state ? (JSON.parse(row.state) as PokerState) : null);

// 읽은 버전 그대로일 때만 저장한다 (동시에 두 요청이 와도 하나만 적용)
async function save(row: Row, state: PokerState | null, extra: Partial<Pick<Row, 'p2_name' | 'p2_token'>> = {}): Promise<boolean> {
  const r = await getDb().execute({
    sql: `UPDATE poker_games SET state = ?, p2_name = ?, p2_token = ?, version = version + 1, updated_at = ?
          WHERE id = ? AND version = ?`,
    args: [state ? JSON.stringify(state) : null, extra.p2_name ?? row.p2_name, extra.p2_token ?? row.p2_token, Date.now(), row.id, row.version],
  });
  return r.rowsAffected === 1;
}

export async function createGame(input: { mode: PokerMode; name: unknown; turnSecs: unknown }): Promise<{ code: string; token: string }> {
  await initCommunityDb();
  const db = getDb();
  if (input.mode !== 'bot' && input.mode !== 'pvp') throw new MafiaError('대결 방식을 골라 주세요.');
  const name = cleanName(input.name);
  const turnSecs = TURN_CHOICES.find((t) => t === Number(input.turnSecs)) ?? 20;
  const now = Date.now();

  await db.execute({ sql: 'DELETE FROM poker_games WHERE updated_at < ?', args: [now - TTL_MS] });
  let code = '';
  for (let i = 0; i < 20; i++) {
    const c = String(randomInt(1000, 10000));
    const used = await db.execute({ sql: 'SELECT 1 FROM poker_games WHERE code = ?', args: [c] });
    if (used.rows.length === 0) {
      code = c;
      break;
    }
  }
  if (!code) throw new MafiaError('방을 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.', 503);

  const token = randomUUID();
  const bot = input.mode === 'bot';
  const state = bot ? initState(now, { turnSecs, botSeat: 1 }) : null;
  await db.execute({
    sql: `INSERT INTO poker_games (id, code, mode, p1_name, p1_token, p2_name, p2_token, turn_secs, state, version, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    args: [randomUUID(), code, input.mode, name, token, bot ? BOT_NAME : null, null, turnSecs, state ? JSON.stringify(state) : null, now, now],
  });
  return { code, token };
}

export async function joinGame(code: string, rawName: unknown): Promise<{ token: string }> {
  const row = await load(code);
  if (row.mode !== 'pvp') throw new MafiaError('봇과 하는 방이에요.', 409);
  if (row.p2_token) throw new MafiaError('이미 두 명이 모였어요.', 409);
  const name = cleanName(rawName);
  if (name.toLowerCase() === row.p1_name.toLowerCase()) throw new MafiaError('방장과 같은 이름이에요. 다른 이름을 써 주세요.', 409);
  const token = randomUUID();
  const ok = await save(row, initState(Date.now(), cfgOf(row)), { p2_name: name, p2_token: token });
  if (!ok) throw new MafiaError('방금 다른 사람이 들어왔어요.', 409);
  return { token };
}

function seatOf(row: Row, token: string | null): Seat | null {
  if (!token) return null;
  if (token === row.p1_token) return 0;
  if (row.p2_token && token === row.p2_token) return 1;
  return null;
}

// 시간이 지났거나 봇 차례면 상태를 앞으로 보내 저장한다
async function advance(row: Row): Promise<Row> {
  const state = stateOf(row);
  if (!state) return row;
  const next = tick(state, Date.now(), cfgOf(row));
  if (next === state) return row;
  if (await save(row, next)) return load(row.code);
  return load(row.code); // 다른 요청이 먼저 저장했다. 그 결과를 쓴다
}

export async function getState(code: string, token: string | null, since: number): Promise<{ unchanged: true; now: number } | { unchanged: false; view: PokerView }> {
  let row = await advance(await load(code));
  const seat = seatOf(row, token);
  if (seat === null) throw new MafiaError(token ? '이 방의 참가자가 아니에요.' : '먼저 입장하세요.', 401);
  if (since && since === row.version) return { unchanged: true, now: Date.now() };
  row = row;
  return { unchanged: false, view: buildView(row, seat) };
}

export async function act(code: string, token: string | null, action: ActionType): Promise<void> {
  for (let i = 0; i < 4; i++) {
    const row = await advance(await load(code));
    const seat = seatOf(row, token);
    if (seat === null) throw new MafiaError('이 방의 참가자가 아니에요.', 401);
    const state = stateOf(row);
    if (!state) throw new MafiaError('상대를 기다리는 중이에요.', 409);
    let next: PokerState;
    try {
      next = applyAction(state, seat, action, Date.now(), cfgOf(row));
    } catch (e) {
      if (e instanceof RuleError) throw new MafiaError(e.message, 409);
      throw e;
    }
    if (await save(row, next)) return;
  }
  throw new MafiaError('잠시 뒤 다시 시도해 주세요.', 409);
}

export async function rematch(code: string, token: string | null): Promise<void> {
  const row = await load(code);
  if (seatOf(row, token) === null) throw new MafiaError('이 방의 참가자가 아니에요.', 401);
  const state = stateOf(row);
  if (!state || state.phase !== 'ended') throw new MafiaError('아직 끝나지 않았어요.', 409);
  await save(row, initState(Date.now(), cfgOf(row)));
}

function buildView(row: Row, seat: Seat): PokerView {
  const s = stateOf(row);
  const me = seat;
  const op: Seat = seat === 0 ? 1 : 0;
  const names = [row.p1_name, row.p2_name] as const;
  const side = (w: Seat | null) => (w === null ? null : w === me ? ('me' as const) : ('opp' as const));
  const base = { version: row.version, code: row.code, mode: row.mode, now: Date.now(), turnSecs: row.turn_secs, names: { me: names[me] ?? '', opp: names[op] } };

  if (!s) {
    return {
      ...base,
      status: 'waiting',
      round: 0,
      chips: { me: 20, opp: 20 },
      bets: { me: 0, opp: 0 },
      carry: 0,
      pot: 0,
      oppCard: null,
      myCard: null,
      myTurn: false,
      raised: false,
      turnEndsAt: null,
      result: null,
      winner: null,
      legal: { call: false, callAmount: 0, raise: false, raiseTo: 0, allin: false, allinTo: 0 },
      deckLeft: 20,
      event: null,
    };
  }
  const showMine = s.phase !== 'betting'; // 라운드가 끝나야 내 카드가 공개된다
  const legal = legalFor(s, me);
  return {
    ...base,
    status: s.phase,
    round: s.round,
    chips: { me: s.chips[me], opp: s.chips[op] },
    bets: { me: s.bets[me], opp: s.bets[op] },
    carry: s.carry,
    pot: potOf(s),
    // 라운드가 끝난 뒤(결과 공개 중)에는 직전 라운드 카드를 보여준다
    oppCard: s.cards[op] || null,
    myCard: showMine ? s.cards[me] || null : null,
    myTurn: s.phase === 'betting' && s.toAct === me,
    raised: s.phase === 'betting' && s.toAct === me && s.raised,
    turnEndsAt: s.phase === 'betting' ? s.turnEndsAt : null,
    result: s.result
      ? {
          round: s.result.round,
          cards: [s.result.cards[me], s.result.cards[op]],
          kind: s.result.kind,
          winner: side(s.result.winner),
          folder: side(s.result.folder),
          pot: s.result.pot,
          penalty: s.result.penalty,
          penaltyReason: s.result.penaltyReason,
          allIn: Boolean(s.result.allIn),
        }
      : null,
    winner: side(s.winner),
    legal,
    deckLeft: s.deck.length,
    event: s.event ? { id: s.event.id, kind: s.event.kind, who: side(s.event.seat)! } : null,
  };
}

void capOf;
