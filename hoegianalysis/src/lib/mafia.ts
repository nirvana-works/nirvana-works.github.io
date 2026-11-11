import { randomInt, randomUUID } from 'crypto';
import { getDb } from './db';
import { initCommunityDb } from './communityDb';
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  NAME_LIMIT,
  RESULT_SECS,
  SETTING_LIMITS,
  mafiaCount,
  type ActionKind,
  type GameEvent,
  type GameMode,
  type MafiaView,
  type Phase,
  type Role,
  type Settings,
} from './mafiaTypes';

// 마피아 게임 엔진. 서버가 유일한 진실이고, 폰들은 주기적으로 상태를 받아간다.
// 단계 전환은 "누가 먼저 보든" 한 번만 적용되도록 (단계, 날짜)를 조건으로 거는 방식(CAS)으로 처리한다.

interface GameRow {
  id: string;
  code: string;
  host_token: string;
  host_player_id: string | null;
  mode: GameMode;
  phase: Phase;
  phase_ends_at: number | null;
  day_no: number;
  night_secs: number;
  talk_secs: number;
  vote_secs: number;
  reveal_roles: number;
  winner: 'mafia' | 'citizen' | null;
  last_event: string | null;
  created_at: number;
  updated_at: number;
}
interface PlayerRow {
  id: string;
  game_id: string;
  name: string;
  token: string;
  role: Role | null;
  alive: number;
  joined_at: number;
}
interface ActionRow {
  day_no: number;
  kind: ActionKind;
  actor_id: string;
  target_id: string;
}

export class MafiaError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

const GAME_TTL_MS = 1000 * 60 * 60 * 12; // 12시간 넘게 멈춘 방은 정리

const rows = <T>(r: { rows: unknown[] }) => r.rows as unknown as T[];

function validSettings(input: Partial<Settings>, base: Settings): Settings {
  const clamp = (v: unknown, [lo, hi]: readonly [number, number], fallback: number) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
  };
  return {
    nightSecs: clamp(input.nightSecs ?? base.nightSecs, SETTING_LIMITS.nightSecs, base.nightSecs),
    talkSecs: clamp(input.talkSecs ?? base.talkSecs, SETTING_LIMITS.talkSecs, base.talkSecs),
    voteSecs: clamp(input.voteSecs ?? base.voteSecs, SETTING_LIMITS.voteSecs, base.voteSecs),
    revealRoles: input.revealRoles ?? base.revealRoles,
  };
}

function cleanName(raw: unknown): string {
  const name = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
  if (!name) throw new MafiaError('이름을 입력하세요.');
  if ([...name].length > NAME_LIMIT) throw new MafiaError(`이름은 ${NAME_LIMIT}자까지 쓸 수 있어요.`);
  return name;
}

async function loadGame(code: string): Promise<GameRow> {
  await initCommunityDb();
  const r = await getDb().execute({
    sql: 'SELECT * FROM mafia_games WHERE code = ? ORDER BY created_at DESC LIMIT 1',
    args: [code],
  });
  const game = rows<GameRow>(r)[0];
  if (!game) throw new MafiaError('그 코드의 방을 찾지 못했어요.', 404);
  return game;
}

async function loadPlayers(gameId: string): Promise<PlayerRow[]> {
  const r = await getDb().execute({ sql: 'SELECT * FROM mafia_players WHERE game_id = ? ORDER BY joined_at, id', args: [gameId] });
  return rows<PlayerRow>(r).map((p) => ({ ...p, alive: Number(p.alive) }));
}

async function loadActions(gameId: string): Promise<ActionRow[]> {
  const r = await getDb().execute({
    sql: 'SELECT day_no, kind, actor_id, target_id FROM mafia_actions WHERE game_id = ?',
    args: [gameId],
  });
  return rows<ActionRow>(r).map((a) => ({ ...a, day_no: Number(a.day_no) }));
}

const touch = (gameId: string) =>
  getDb().execute({ sql: 'UPDATE mafia_games SET updated_at = ? WHERE id = ?', args: [Date.now(), gameId] });

// ---------- 방 만들기·입장 ----------

export async function createGame(input: {
  mode: GameMode;
  hostName?: unknown;
  settings: Partial<Settings>;
}): Promise<{ code: string; token: string }> {
  await initCommunityDb();
  const db = getDb();
  if (input.mode !== 'host_plays' && input.mode !== 'host_moderates') throw new MafiaError('진행 방식을 골라 주세요.');
  const hostName = input.mode === 'host_plays' ? cleanName(input.hostName) : null;
  const settings = validSettings(input.settings, { nightSecs: 40, talkSecs: 180, voteSecs: 40, revealRoles: true });

  const now = Date.now();
  // 오래 멈춘 방 정리
  const stale = await db.execute({ sql: 'SELECT id FROM mafia_games WHERE updated_at < ?', args: [now - GAME_TTL_MS] });
  for (const g of rows<{ id: string }>(stale)) {
    await db.batch(
      [
        { sql: 'DELETE FROM mafia_actions WHERE game_id = ?', args: [g.id] },
        { sql: 'DELETE FROM mafia_players WHERE game_id = ?', args: [g.id] },
        { sql: 'DELETE FROM mafia_games WHERE id = ?', args: [g.id] },
      ],
      'write',
    );
  }

  // 지금 쓰고 있는 방과 겹치지 않는 4자리 코드
  let code = '';
  for (let i = 0; i < 20; i++) {
    const c = String(randomInt(1000, 10000));
    const used = await db.execute({ sql: 'SELECT 1 FROM mafia_games WHERE code = ?', args: [c] });
    if (used.rows.length === 0) {
      code = c;
      break;
    }
  }
  if (!code) throw new MafiaError('방을 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.', 503);

  const id = randomUUID();
  const token = randomUUID();
  const hostPlayerId = hostName ? randomUUID() : null;
  await db.batch(
    [
      {
        sql: `INSERT INTO mafia_games (id, code, host_token, host_player_id, mode, phase, day_no, night_secs, talk_secs, vote_secs, reveal_roles, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, 'lobby', 0, ?, ?, ?, ?, ?, ?)`,
        args: [id, code, token, hostPlayerId, input.mode, settings.nightSecs, settings.talkSecs, settings.voteSecs, settings.revealRoles ? 1 : 0, now, now],
      },
      ...(hostName && hostPlayerId
        ? [{ sql: 'INSERT INTO mafia_players (id, game_id, name, token, joined_at) VALUES (?, ?, ?, ?, ?)', args: [hostPlayerId, id, hostName, token, now] }]
        : []),
    ],
    'write',
  );
  return { code, token };
}

export async function joinGame(code: string, rawName: unknown): Promise<{ token: string }> {
  const game = await loadGame(code);
  if (game.phase !== 'lobby') throw new MafiaError('이미 시작된 게임이에요.', 409);
  const name = cleanName(rawName);
  const players = await loadPlayers(game.id);
  if (players.length >= MAX_PLAYERS) throw new MafiaError(`최대 ${MAX_PLAYERS}명까지 들어올 수 있어요.`, 409);
  if (players.some((p) => p.name.toLowerCase() === name.toLowerCase())) throw new MafiaError('같은 이름이 이미 있어요. 다른 이름을 써 주세요.', 409);

  const token = randomUUID();
  await getDb().execute({
    sql: 'INSERT INTO mafia_players (id, game_id, name, token, joined_at) VALUES (?, ?, ?, ?, ?)',
    args: [randomUUID(), game.id, name, token, Date.now()],
  });
  await touch(game.id);
  return { token };
}

// ---------- 누구인지 확인 ----------

type Who = { kind: 'moderator' } | { kind: 'player'; player: PlayerRow; isHost: boolean } | { kind: 'none' };

function whoIs(game: GameRow, players: PlayerRow[], token: string | null): Who {
  if (!token) return { kind: 'none' };
  if (token === game.host_token && !game.host_player_id) return { kind: 'moderator' };
  const player = players.find((p) => p.token === token);
  if (!player) return { kind: 'none' };
  return { kind: 'player', player, isHost: player.id === game.host_player_id };
}

function requireHost(game: GameRow, players: PlayerRow[], token: string | null) {
  const who = whoIs(game, players, token);
  if (who.kind === 'moderator' || (who.kind === 'player' && who.isHost)) return;
  throw new MafiaError('방을 만든 사람만 할 수 있어요.', 403);
}

// ---------- 시작 ----------

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildRoles(n: number): Role[] {
  const mafia = mafiaCount(n);
  const roles: Role[] = [...Array<Role>(mafia).fill('mafia'), 'police', 'doctor'];
  while (roles.length < n) roles.push('citizen');
  return shuffle(roles);
}

export async function startGame(code: string, token: string | null): Promise<void> {
  const game = await loadGame(code);
  const players = await loadPlayers(game.id);
  requireHost(game, players, token);
  if (game.phase !== 'lobby') throw new MafiaError('이미 시작됐어요.', 409);
  if (players.length < MIN_PLAYERS) throw new MafiaError(`${MIN_PLAYERS}명 이상 모여야 시작할 수 있어요.`);

  const roles = buildRoles(players.length);
  const now = Date.now();
  await getDb().batch(
    [
      ...players.map((p, i) => ({ sql: 'UPDATE mafia_players SET role = ?, alive = 1 WHERE id = ?', args: [roles[i], p.id] })),
      {
        sql: `UPDATE mafia_games SET phase = 'night', day_no = 1, phase_ends_at = ?, last_event = NULL, winner = NULL, updated_at = ?
              WHERE id = ? AND phase = 'lobby'`,
        args: [now + game.night_secs * 1000, now, game.id],
      },
    ],
    'write',
  );
}

export async function kickPlayer(code: string, token: string | null, playerId: string): Promise<void> {
  const game = await loadGame(code);
  const players = await loadPlayers(game.id);
  requireHost(game, players, token);
  if (game.phase !== 'lobby') throw new MafiaError('시작한 뒤에는 내보낼 수 없어요.', 409);
  if (playerId === game.host_player_id) throw new MafiaError('방장은 내보낼 수 없어요.');
  await getDb().execute({ sql: 'DELETE FROM mafia_players WHERE id = ? AND game_id = ?', args: [playerId, game.id] });
  await touch(game.id);
}

// ---------- 밤 행동·투표 ----------

export async function submitAction(code: string, token: string | null, kind: ActionKind, targetId: string): Promise<void> {
  const game = await loadGame(code);
  const players = await loadPlayers(game.id);
  const who = whoIs(game, players, token);
  if (who.kind !== 'player') throw new MafiaError('참가자만 할 수 있어요.', 403);
  const me = who.player;
  if (!me.alive) throw new MafiaError('죽은 사람은 할 수 없어요.', 403);

  const wantPhase: Phase = kind === 'vote' ? 'day_vote' : 'night';
  if (game.phase !== wantPhase) throw new MafiaError('지금은 할 수 없어요.', 409);
  if (kind !== 'vote' && me.role !== kind) throw new MafiaError('그 역할이 아니에요.', 403);

  const target = players.find((p) => p.id === targetId);
  if (!target || !target.alive) throw new MafiaError('살아 있는 사람을 골라 주세요.');
  if (kind === 'mafia' && target.role === 'mafia') throw new MafiaError('마피아 동료는 고를 수 없어요.');
  if ((kind === 'police' || kind === 'vote') && target.id === me.id) throw new MafiaError('자기 자신은 고를 수 없어요.');

  await getDb().execute({
    sql: `INSERT INTO mafia_actions (id, game_id, day_no, kind, actor_id, target_id) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(game_id, day_no, kind, actor_id) DO UPDATE SET target_id = excluded.target_id`,
    args: [randomUUID(), game.id, game.day_no, kind, me.id, target.id],
  });
  await touch(game.id);
  await advance(game.id, { early: true });
}

// ---------- 방장 조작 ----------

export async function control(
  code: string,
  token: string | null,
  op: { type: 'skip' } | { type: 'extend'; secs: number } | { type: 'settings'; settings: Partial<Settings> },
): Promise<void> {
  const game = await loadGame(code);
  const players = await loadPlayers(game.id);
  requireHost(game, players, token);
  const db = getDb();

  if (op.type === 'settings') {
    const s = validSettings(op.settings, {
      nightSecs: game.night_secs,
      talkSecs: game.talk_secs,
      voteSecs: game.vote_secs,
      revealRoles: Boolean(game.reveal_roles),
    });
    await db.execute({
      sql: 'UPDATE mafia_games SET night_secs = ?, talk_secs = ?, vote_secs = ?, reveal_roles = ?, updated_at = ? WHERE id = ?',
      args: [s.nightSecs, s.talkSecs, s.voteSecs, s.revealRoles ? 1 : 0, Date.now(), game.id],
    });
    return;
  }
  if (game.phase === 'lobby' || game.phase === 'ended') throw new MafiaError('지금은 할 수 없어요.', 409);
  if (op.type === 'extend') {
    const add = Math.min(300, Math.max(-60, Math.round(op.secs))) * 1000;
    await db.execute({
      sql: 'UPDATE mafia_games SET phase_ends_at = MAX(?, COALESCE(phase_ends_at, 0) + ?), updated_at = ? WHERE id = ? AND phase = ?',
      args: [Date.now() + 3000, add, Date.now(), game.id, game.phase],
    });
    return;
  }
  await advance(game.id, { force: true });
}

// ---------- 단계 전환 ----------

function winnerOf(players: PlayerRow[]): 'mafia' | 'citizen' | null {
  const alive = players.filter((p) => p.alive);
  const mafia = alive.filter((p) => p.role === 'mafia').length;
  if (mafia === 0) return 'citizen';
  if (mafia >= alive.length - mafia) return 'mafia';
  return null;
}

// 가장 많이 나온 대상. 동률이면 tied 목록을 함께 돌려준다
function tally(targets: string[]): { top: string[]; counts: Record<string, number> } {
  const counts: Record<string, number> = {};
  for (const t of targets) counts[t] = (counts[t] ?? 0) + 1;
  const max = Math.max(0, ...Object.values(counts));
  return { top: Object.keys(counts).filter((k) => counts[k] === max && max > 0), counts };
}

function nightDone(game: GameRow, players: PlayerRow[], actions: ActionRow[]): boolean {
  const today = actions.filter((a) => a.day_no === game.day_no);
  const need = (role: Role) => players.filter((p) => p.alive && p.role === role);
  const done = (kind: ActionKind, ids: string[]) => ids.every((id) => today.some((a) => a.kind === kind && a.actor_id === id));
  return (
    done('mafia', need('mafia').map((p) => p.id)) &&
    done('police', need('police').map((p) => p.id)) &&
    done('doctor', need('doctor').map((p) => p.id))
  );
}

function voteDone(game: GameRow, players: PlayerRow[], actions: ActionRow[]): boolean {
  const today = actions.filter((a) => a.day_no === game.day_no && a.kind === 'vote');
  return players.filter((p) => p.alive).every((p) => today.some((a) => a.actor_id === p.id));
}

// 한 번 전환을 시도한다. 이미 다른 요청이 옮겼으면 false
async function transition(game: GameRow, players: PlayerRow[], actions: ActionRow[]): Promise<boolean> {
  const now = Date.now();
  const db = getDb();
  const casGame = (phase: Phase, endsAt: number | null, dayNo: number, winner: string | null, event: GameEvent | null) => ({
    sql: `UPDATE mafia_games SET phase = ?, phase_ends_at = ?, day_no = ?, winner = ?, last_event = ?, updated_at = ?
          WHERE id = ? AND phase = ? AND day_no = ?`,
    args: [phase, endsAt, dayNo, winner, event ? JSON.stringify(event) : null, now, game.id, game.phase, game.day_no],
  });
  const kill = (id: string) => ({
    sql: `UPDATE mafia_players SET alive = 0 WHERE id = ? AND EXISTS (SELECT 1 FROM mafia_games WHERE id = ? AND phase = ? AND day_no = ?)`,
    args: [id, game.id, game.phase, game.day_no],
  });
  const today = actions.filter((a) => a.day_no === game.day_no);
  const alive = players.filter((p) => p.alive);

  let result;
  if (game.phase === 'night') {
    // 마피아 표 다수결(동률이면 무작위), 의사가 같은 사람을 지키면 아무도 죽지 않는다
    const votes = today.filter((a) => a.kind === 'mafia' && alive.some((p) => p.id === a.actor_id)).map((a) => a.target_id);
    const { top } = tally(votes);
    const attackedId = top.length ? top[randomInt(0, top.length)] : null;
    const saved = today.find((a) => a.kind === 'doctor' && alive.some((p) => p.id === a.actor_id))?.target_id ?? null;
    const killedId = attackedId && attackedId !== saved ? attackedId : null;
    const after = players.map((p) => (p.id === killedId ? { ...p, alive: 0 } : p));
    const winner = winnerOf(after);
    const event: GameEvent = { type: 'night', attacked: Boolean(attackedId), killedId };
    result = await db.batch(
      [...(killedId ? [kill(killedId)] : []), casGame(winner ? 'ended' : 'day_talk', winner ? null : now + game.talk_secs * 1000, game.day_no, winner, event)],
      'write',
    );
  } else if (game.phase === 'day_talk') {
    result = await db.batch([casGame('day_vote', now + game.vote_secs * 1000, game.day_no, null, null)], 'write');
  } else if (game.phase === 'day_vote') {
    const votes = today.filter((a) => a.kind === 'vote' && alive.some((p) => p.id === a.actor_id)).map((a) => a.target_id);
    const { top } = tally(votes);
    const executedId = top.length === 1 ? top[0] : null;
    const after = players.map((p) => (p.id === executedId ? { ...p, alive: 0 } : p));
    const winner = winnerOf(after);
    const event: GameEvent = { type: 'vote', executedId, tie: top.length > 1 };
    result = await db.batch(
      [...(executedId ? [kill(executedId)] : []), casGame(winner ? 'ended' : 'vote_result', winner ? null : now + RESULT_SECS * 1000, game.day_no, winner, event)],
      'write',
    );
  } else if (game.phase === 'vote_result') {
    result = await db.batch([casGame('night', now + game.night_secs * 1000, game.day_no + 1, null, null)], 'write');
  } else {
    return false;
  }
  return result[result.length - 1].rowsAffected === 1;
}

// 시간이 지났거나(또는 모두 행동했거나 방장이 넘기면) 다음 단계로. 여러 단계를 한 번에 따라잡을 수 있다
async function advance(gameId: string, opts: { early?: boolean; force?: boolean } = {}): Promise<void> {
  for (let i = 0; i < 6; i++) {
    const r = await getDb().execute({ sql: 'SELECT * FROM mafia_games WHERE id = ?', args: [gameId] });
    const game = rows<GameRow>(r)[0];
    if (!game || game.phase === 'lobby' || game.phase === 'ended') return;

    const due = game.phase_ends_at != null && game.phase_ends_at <= Date.now();
    let go = due || (opts.force && i === 0);
    let players: PlayerRow[] | null = null;
    let actions: ActionRow[] | null = null;
    if (!go && opts.early && (game.phase === 'night' || game.phase === 'day_vote')) {
      players = await loadPlayers(game.id);
      actions = await loadActions(game.id);
      go = game.phase === 'night' ? nightDone(game, players, actions) : voteDone(game, players, actions);
    }
    if (!go) return;

    players ??= await loadPlayers(game.id);
    actions ??= await loadActions(game.id);
    const moved = await transition(game, players, actions);
    if (!moved) return; // 다른 요청이 먼저 옮겼다. 그 결과를 다음 조회에서 읽는다
    opts = { ...opts, force: false }; // 강제는 한 단계만
  }
}

// ---------- 화면에 보낼 상태 ----------

export type StateResult = { unchanged: true; now: number } | { unchanged: false; view: MafiaView };

export async function getState(code: string, token: string | null, since: number): Promise<StateResult> {
  let game = await loadGame(code);
  if (game.phase_ends_at != null && game.phase_ends_at <= Date.now()) {
    await advance(game.id);
    game = await loadGame(code);
  }
  if (since && since === game.updated_at) return { unchanged: true, now: Date.now() };

  const [players, actions] = await Promise.all([loadPlayers(game.id), loadActions(game.id)]);
  const who = whoIs(game, players, token);
  if (who.kind === 'none') {
    if (game.phase !== 'lobby') throw new MafiaError('이미 시작된 게임이에요.', 409);
    throw new MafiaError('먼저 이름을 넣고 입장하세요.', 401);
  }

  const started = game.phase !== 'lobby';
  const moderator = who.kind === 'moderator';
  const me = who.kind === 'player' ? who.player : null;
  const myRole = me?.role ?? null;
  const ended = game.phase === 'ended';
  const reveal = Boolean(game.reveal_roles);
  const today = actions.filter((a) => a.day_no === game.day_no);
  const toMap = (kind: ActionKind) =>
    Object.fromEntries(today.filter((a) => a.kind === kind).map((a) => [a.actor_id, a.target_id]));

  const roleCounts = started
    ? (players.reduce((acc, p) => ({ ...acc, [p.role as Role]: (acc[p.role as Role] ?? 0) + 1 }), {} as Record<Role, number>))
    : null;

  const viewPlayers = players.map((p) => {
    const show =
      moderator || ended || p.id === me?.id || (!p.alive && reveal) || (myRole === 'mafia' && p.role === 'mafia');
    return { id: p.id, name: p.name, alive: Boolean(p.alive), role: started && show ? p.role : null, isYou: p.id === me?.id };
  });

  const nightPhase = game.phase === 'night';
  const myKind: ActionKind | null =
    game.phase === 'day_vote' ? 'vote' : nightPhase && myRole && myRole !== 'citizen' ? myRole : null;
  const myTargetId = myKind && me ? (today.find((a) => a.kind === myKind && a.actor_id === me.id)?.target_id ?? null) : null;

  const view: MafiaView = {
    version: game.updated_at,
    code: game.code,
    mode: game.mode,
    phase: game.phase,
    phaseEndsAt: game.phase_ends_at,
    now: Date.now(),
    dayNo: game.day_no,
    settings: { nightSecs: game.night_secs, talkSecs: game.talk_secs, voteSecs: game.vote_secs, revealRoles: reveal },
    winner: game.winner,
    event: game.last_event ? (JSON.parse(game.last_event) as GameEvent) : null,
    viewer: moderator ? 'moderator' : 'player',
    isHost: moderator || (who.kind === 'player' && who.isHost),
    you: me ? { id: me.id, name: me.name, alive: Boolean(me.alive), role: me.role } : null,
    players: viewPlayers,
    roleCounts,
    myTargetId,
    mafiaVotes: nightPhase && (moderator || (myRole === 'mafia' && me?.alive)) ? toMap('mafia') : null,
    policeResults:
      started && (moderator || myRole === 'police')
        ? actions
            .filter((a) => a.kind === 'police' && (moderator || a.actor_id === me?.id))
            .map((a) => ({ dayNo: a.day_no, targetId: a.target_id, isMafia: players.find((p) => p.id === a.target_id)?.role === 'mafia' }))
            .sort((a, b) => a.dayNo - b.dayNo)
        : null,
    nightActions:
      moderator && nightPhase
        ? {
            police: today.find((a) => a.kind === 'police')?.target_id ?? null,
            doctor: today.find((a) => a.kind === 'doctor')?.target_id ?? null,
          }
        : null,
    votes: game.phase === 'day_vote' || game.phase === 'vote_result' ? toMap('vote') : null,
  };
  return { unchanged: false, view };
}
