import { randomInt, randomUUID } from 'crypto';
import { getDb } from './db';
import { initCommunityDb } from './communityDb';
import { MafiaError } from './mafia';
import { MAX_SEATS, MIN_SEATS } from './lexioCore';
import { RuleError, initRound, nextRound, passTurn, playTiles, tick, type Config, type LexioState } from './lexioEngine';
import { LEXIO_NAME_LIMIT, LEXIO_TURN_CHOICES, type LexioMode, type LexioView } from './lexioTypes';

// 렉시오 방. 인디언 포커와 같은 방식: 서버가 진실이고 폰은 주기적으로 상태를 받아간다.

interface Seat {
  name: string;
  token: string | null; // 봇은 null
  bot: boolean;
}

interface Row {
  id: string;
  code: string;
  mode: LexioMode;
  max_players: number;
  turn_secs: number;
  seats: string;
  state: string | null;
  version: number;
}

const TTL_MS = 1000 * 60 * 60 * 6;
const BOT_NAMES = ['봇 철수', '봇 영희', '봇 민수', '봇 지민'];

function cleanName(raw: unknown): string {
  const name = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
  if (!name) throw new MafiaError('이름을 입력하세요.');
  if ([...name].length > LEXIO_NAME_LIMIT) throw new MafiaError(`이름은 ${LEXIO_NAME_LIMIT}자까지 쓸 수 있어요.`);
  return name;
}

async function load(code: string): Promise<Row> {
  await initCommunityDb();
  const r = await getDb().execute({ sql: 'SELECT * FROM lexio_games WHERE code = ? ORDER BY created_at DESC LIMIT 1', args: [code] });
  const row = r.rows[0] as unknown as Row | undefined;
  if (!row) throw new MafiaError('그 코드의 방을 찾지 못했어요.', 404);
  return { ...row, version: Number(row.version), turn_secs: Number(row.turn_secs), max_players: Number(row.max_players) };
}

const seatsOf = (row: Row): Seat[] => JSON.parse(row.seats) as Seat[];
const stateOf = (row: Row): LexioState | null => (row.state ? (JSON.parse(row.state) as LexioState) : null);
const cfgOf = (row: Row): Config => ({ turnSecs: row.turn_secs, bots: seatsOf(row).map((s) => s.bot) });

async function save(row: Row, seats: Seat[], state: LexioState | null): Promise<boolean> {
  const r = await getDb().execute({
    sql: 'UPDATE lexio_games SET seats = ?, state = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?',
    args: [JSON.stringify(seats), state ? JSON.stringify(state) : null, Date.now(), row.id, row.version],
  });
  return r.rowsAffected === 1;
}

export async function createGame(input: { mode: LexioMode; name: unknown; players: unknown; turnSecs: unknown }): Promise<{ code: string; token: string }> {
  await initCommunityDb();
  const db = getDb();
  if (input.mode !== 'bot' && input.mode !== 'pvp') throw new MafiaError('대결 방식을 골라 주세요.');
  const name = cleanName(input.name);
  const players = Math.min(MAX_SEATS, Math.max(MIN_SEATS, Math.round(Number(input.players)) || 4));
  const turnSecs = LEXIO_TURN_CHOICES.find((t) => t === Number(input.turnSecs)) ?? 30;
  const now = Date.now();

  await db.execute({ sql: 'DELETE FROM lexio_games WHERE updated_at < ?', args: [now - TTL_MS] });
  let code = '';
  for (let i = 0; i < 20; i++) {
    const c = String(randomInt(1000, 10000));
    const used = await db.execute({ sql: 'SELECT 1 FROM lexio_games WHERE code = ?', args: [c] });
    if (used.rows.length === 0) {
      code = c;
      break;
    }
  }
  if (!code) throw new MafiaError('방을 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.', 503);

  const token = randomUUID();
  const seats: Seat[] = [{ name, token, bot: false }];
  let state: LexioState | null = null;
  if (input.mode === 'bot') {
    for (let i = 0; i < players - 1; i++) seats.push({ name: BOT_NAMES[i], token: null, bot: true });
    state = initRound(players, now, { turnSecs, bots: seats.map((s) => s.bot) });
  }
  await db.execute({
    sql: `INSERT INTO lexio_games (id, code, mode, max_players, turn_secs, seats, state, version, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    args: [randomUUID(), code, input.mode, players, turnSecs, JSON.stringify(seats), state ? JSON.stringify(state) : null, now, now],
  });
  return { code, token };
}

function seatIndex(seats: Seat[], token: string | null): number {
  return token ? seats.findIndex((s) => s.token === token) : -1;
}

export async function joinGame(code: string, rawName: unknown): Promise<{ token: string }> {
  const row = await load(code);
  if (row.mode !== 'pvp') throw new MafiaError('봇과 하는 방이에요.', 409);
  if (row.state) throw new MafiaError('이미 시작된 게임이에요.', 409);
  const seats = seatsOf(row);
  if (seats.length >= row.max_players) throw new MafiaError('자리가 다 찼어요.', 409);
  const name = cleanName(rawName);
  if (seats.some((s) => s.name.toLowerCase() === name.toLowerCase())) throw new MafiaError('같은 이름이 이미 있어요. 다른 이름을 써 주세요.', 409);
  const token = randomUUID();
  if (!(await save(row, [...seats, { name, token, bot: false }], null))) throw new MafiaError('방금 다른 사람이 들어왔어요. 다시 시도해 주세요.', 409);
  return { token };
}

// 대기실 조작(방장만): 봇 추가, 자리 비우기
export async function lobbyAction(code: string, token: string | null, op: 'addbot' | 'remove', index?: number): Promise<void> {
  const row = await load(code);
  const seats = seatsOf(row);
  if (seatIndex(seats, token) !== 0) throw new MafiaError('방을 만든 사람만 할 수 있어요.', 403);
  if (row.state) throw new MafiaError('이미 시작됐어요.', 409);
  let next = seats;
  if (op === 'addbot') {
    if (seats.length >= row.max_players) throw new MafiaError('자리가 다 찼어요.', 409);
    const used = new Set(seats.map((s) => s.name));
    const name = BOT_NAMES.find((n) => !used.has(n)) ?? `봇 ${seats.length}`;
    next = [...seats, { name, token: null, bot: true }];
  } else {
    if (!index || index < 1 || index >= seats.length) throw new MafiaError('내보낼 수 없는 자리예요.');
    next = seats.filter((_, i) => i !== index);
  }
  if (!(await save(row, next, null))) throw new MafiaError('잠시 뒤 다시 시도해 주세요.', 409);
}

export async function startGame(code: string, token: string | null): Promise<void> {
  const row = await load(code);
  const seats = seatsOf(row);
  if (seatIndex(seats, token) !== 0) throw new MafiaError('방을 만든 사람만 시작할 수 있어요.', 403);
  if (row.state) throw new MafiaError('이미 시작됐어요.', 409);
  if (seats.length < MIN_SEATS) throw new MafiaError(`${MIN_SEATS}명 이상 모여야 시작할 수 있어요. 봇을 추가해도 돼요.`);
  const state = initRound(seats.length, Date.now(), { turnSecs: row.turn_secs, bots: seats.map((s) => s.bot) });
  if (!(await save(row, seats, state))) throw new MafiaError('잠시 뒤 다시 시도해 주세요.', 409);
}

async function advance(row: Row): Promise<Row> {
  const state = stateOf(row);
  if (!state) return row;
  const next = tick(state, Date.now(), cfgOf(row));
  if (next === state) return row;
  await save(row, seatsOf(row), next);
  return load(row.code);
}

export async function getState(code: string, token: string | null, since: number): Promise<{ unchanged: true; now: number } | { unchanged: false; view: LexioView }> {
  const row = await advance(await load(code));
  const seats = seatsOf(row);
  const me = seatIndex(seats, token);
  if (me < 0) throw new MafiaError(token ? '이 방의 참가자가 아니에요.' : '먼저 입장하세요.', 401);
  if (since && since === row.version) return { unchanged: true, now: Date.now() };
  return { unchanged: false, view: buildView(row, seats, me) };
}

export async function act(code: string, token: string | null, action: { type: 'play'; tiles: number[] } | { type: 'pass' } | { type: 'next' }): Promise<void> {
  for (let i = 0; i < 4; i++) {
    const row = await advance(await load(code));
    const seats = seatsOf(row);
    const me = seatIndex(seats, token);
    if (me < 0) throw new MafiaError('이 방의 참가자가 아니에요.', 401);
    const state = stateOf(row);
    if (!state) throw new MafiaError('아직 시작하지 않았어요.', 409);
    let next: LexioState;
    try {
      const cfg = cfgOf(row);
      next =
        action.type === 'play'
          ? playTiles(state, me, action.tiles, Date.now(), cfg)
          : action.type === 'pass'
            ? passTurn(state, me, Date.now(), cfg)
            : nextRound(state, Date.now(), cfg);
    } catch (e) {
      if (e instanceof RuleError) throw new MafiaError(e.message, 409);
      throw e;
    }
    if (await save(row, seats, next)) return;
  }
  throw new MafiaError('잠시 뒤 다시 시도해 주세요.', 409);
}

function buildView(row: Row, seats: Seat[], me: number): LexioView {
  const s = stateOf(row);
  const label = (p: { seat: number; tiles: number[]; combo: { label: string } }) => ({ seat: p.seat, tiles: p.tiles, label: p.combo.label });
  const base = {
    version: row.version,
    code: row.code,
    mode: row.mode,
    now: Date.now(),
    turnSecs: row.turn_secs,
    maxPlayers: row.max_players,
    you: me,
    isHost: me === 0,
  };
  if (!s) {
    return {
      ...base,
      status: 'lobby',
      round: 0,
      maxNum: 0,
      seats: seats.map((x, i) => ({ name: x.name, bot: x.bot, count: 0, total: 0, passed: false, isTurn: false, isYou: i === me })),
      myHand: [],
      table: null,
      trick: [],
      turn: null,
      myTurn: false,
      canPass: false,
      turnEndsAt: null,
      last: null,
      winner: null,
      delta: null,
      remaining: null,
    };
  }
  return {
    ...base,
    status: s.phase === 'ended' ? 'ended' : 'playing',
    round: s.round,
    maxNum: s.maxNum,
    seats: seats.map((x, i) => ({
      name: x.name,
      bot: x.bot,
      count: s.hands[i].length,
      total: s.total[i],
      passed: s.passed[i],
      isTurn: s.phase === 'playing' && s.turn === i,
      isYou: i === me,
    })),
    myHand: s.hands[me],
    table: s.table ? label(s.table) : null,
    trick: s.trick.map(label),
    turn: s.phase === 'playing' ? s.turn : null,
    myTurn: s.phase === 'playing' && s.turn === me,
    canPass: s.phase === 'playing' && s.turn === me && s.table !== null,
    turnEndsAt: s.phase === 'playing' ? s.turnEndsAt : null,
    last: s.last,
    winner: s.winner,
    delta: s.delta,
    remaining: s.remaining,
  };
}
