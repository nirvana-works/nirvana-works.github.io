import { randomInt, randomUUID } from 'crypto';
import { getDb } from './db';
import { initCommunityDb } from './communityDb';
import { MafiaError } from './mafia';
import { VOLLEY_NAME_LIMIT, VOLLEY_TARGETS, type RoomInfo } from './volleyTypes';

// 넙죽이 배구 방: 두 사람이 폰/컴퓨터끼리 바로 연결(WebRTC)하도록 연결 정보(offer/answer)만 주고받게 해 준다.
// 게임 자체는 이 서버를 거치지 않는다.

const TTL_MS = 1000 * 60 * 60 * 2;
const SDP_MAX = 20000;

interface Row {
  id: string;
  code: string;
  host_name: string;
  host_token: string;
  guest_name: string | null;
  guest_token: string | null;
  target: number;
  offer: string | null;
  answer: string | null;
  created_at: number;
  updated_at: number;
}

function cleanName(raw: unknown): string {
  const name = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
  if (!name) throw new MafiaError('이름을 입력하세요.');
  if ([...name].length > VOLLEY_NAME_LIMIT) throw new MafiaError(`이름은 ${VOLLEY_NAME_LIMIT}자까지 쓸 수 있어요.`);
  return name;
}

async function load(code: string): Promise<Row> {
  await initCommunityDb();
  const r = await getDb().execute({ sql: 'SELECT * FROM volley_rooms WHERE code = ? ORDER BY created_at DESC LIMIT 1', args: [code] });
  const row = r.rows[0] as unknown as Row | undefined;
  if (!row) throw new MafiaError('그 코드의 방을 찾지 못했어요.', 404);
  return row;
}

export async function createRoom(input: { name: unknown; target: unknown }): Promise<{ code: string; token: string }> {
  await initCommunityDb();
  const db = getDb();
  const name = cleanName(input.name);
  const target = VOLLEY_TARGETS.find((t) => t === Number(input.target)) ?? 11;
  const now = Date.now();
  await db.execute({ sql: 'DELETE FROM volley_rooms WHERE updated_at < ?', args: [now - TTL_MS] });
  let code = '';
  for (let i = 0; i < 20; i++) {
    const c = String(randomInt(1000, 10000));
    const used = await db.execute({ sql: 'SELECT 1 FROM volley_rooms WHERE code = ?', args: [c] });
    if (used.rows.length === 0) {
      code = c;
      break;
    }
  }
  if (!code) throw new MafiaError('방을 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.', 503);
  const token = randomUUID();
  await db.execute({
    sql: `INSERT INTO volley_rooms (id, code, host_name, host_token, guest_name, guest_token, target, offer, answer, created_at, updated_at)
          VALUES (?, ?, ?, ?, NULL, NULL, ?, NULL, NULL, ?, ?)`,
    args: [randomUUID(), code, name, token, target, now, now],
  });
  return { code, token };
}

export async function joinRoom(code: string, rawName: unknown): Promise<{ token: string }> {
  const row = await load(code);
  if (row.guest_token) throw new MafiaError('이미 두 명이 모였어요.', 409);
  const name = cleanName(rawName);
  if (name.toLowerCase() === row.host_name.toLowerCase()) throw new MafiaError('방장과 같은 이름이에요. 다른 이름을 써 주세요.', 409);
  const token = randomUUID();
  const r = await getDb().execute({
    sql: 'UPDATE volley_rooms SET guest_name = ?, guest_token = ?, updated_at = ? WHERE id = ? AND guest_token IS NULL',
    args: [name, token, Date.now(), row.id],
  });
  if (r.rowsAffected !== 1) throw new MafiaError('방금 다른 사람이 들어왔어요.', 409);
  return { token };
}


// want로 요청한 연결 정보(offer/answer)만 함께 돌려준다. 매 초 받는 상태 확인은 가볍게 유지
export async function getRoom(code: string, token: string | null, want: string | null): Promise<RoomInfo> {
  const row = await load(code);
  const seat: 0 | 1 | null = token && token === row.host_token ? 0 : token && row.guest_token && token === row.guest_token ? 1 : null;
  const info: RoomInfo = {
    seat,
    host_name: row.host_name,
    guest_name: row.guest_name,
    target: Number(row.target),
    hasOffer: !!row.offer,
    hasAnswer: !!row.answer,
  };
  if (seat === 1 && want === 'offer' && row.offer) info.offer = row.offer;
  if (seat === 0 && want === 'answer' && row.answer) info.answer = row.answer;
  return info;
}

export async function postSignal(code: string, token: string | null, kind: unknown, sdp: unknown): Promise<void> {
  const row = await load(code);
  if (typeof sdp !== 'string' || !sdp || sdp.length > SDP_MAX) throw new MafiaError('연결 정보가 올바르지 않아요.');
  const db = getDb();
  if (kind === 'offer') {
    if (token !== row.host_token) throw new MafiaError('방장만 보낼 수 있어요.', 403);
    // 새 offer가 오면 이전 answer는 무효
    await db.execute({ sql: 'UPDATE volley_rooms SET offer = ?, answer = NULL, updated_at = ? WHERE id = ?', args: [sdp, Date.now(), row.id] });
  } else if (kind === 'answer') {
    if (!token || token !== row.guest_token) throw new MafiaError('참가자만 보낼 수 있어요.', 403);
    if (!row.offer) throw new MafiaError('방장이 아직 준비 중이에요.', 409);
    await db.execute({ sql: 'UPDATE volley_rooms SET answer = ?, updated_at = ? WHERE id = ?', args: [sdp, Date.now(), row.id] });
  } else {
    throw new MafiaError('알 수 없는 요청이에요.');
  }
}
