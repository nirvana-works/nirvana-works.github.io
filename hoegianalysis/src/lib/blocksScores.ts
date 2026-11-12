import { getDb } from './db';
import { initCommunityDb } from './communityDb';

// 넙죽이 블록 점수판. 로그인 없이 이름만 적고, 같은 기기는 20초에 한 번만 남길 수 있다
export interface BlockScore {
  id: string;
  name: string;
  score: number;
  lines: number;
  level: number;
  createdAt: number;
}

const MAX_SCORE = 5_000_000;
const COOLDOWN_MS = 20_000;

interface Row {
  id: string;
  name: string;
  score: number;
  lines: number;
  level: number;
  created_at: number;
}
const toScore = (r: Row): BlockScore => ({ id: r.id, name: r.name, score: Number(r.score), lines: Number(r.lines), level: Number(r.level), createdAt: Number(r.created_at) });

export async function topScores(limit = 10): Promise<BlockScore[]> {
  await initCommunityDb();
  const res = await getDb().execute({
    sql: 'SELECT id, name, score, lines, level, created_at FROM blocks_scores ORDER BY score DESC, created_at ASC LIMIT ?',
    args: [limit],
  });
  return res.rows.map((r) => toScore(r as unknown as Row));
}

export type ParsedScore = { ok: true; value: { name: string; score: number; lines: number; level: number; deviceId: string } } | { ok: false; error: string };

export function validateScore(body: unknown): ParsedScore {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === 'string' ? b.name.trim().replace(/\s+/g, ' ') : '';
  if (!name) return { ok: false, error: '이름을 적어 주세요.' };
  if (name.length > 10) return { ok: false, error: '이름은 10자까지예요.' };
  const num = (v: unknown, max: number) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max ? v : null);
  const score = num(b.score, MAX_SCORE);
  const lines = num(b.lines, 100000);
  const level = num(b.level, 1000);
  if (score === null || score < 1 || lines === null || level === null) return { ok: false, error: '점수가 올바르지 않아요.' };
  const deviceId = typeof b.deviceId === 'string' ? b.deviceId.slice(0, 80) : '';
  if (!deviceId) return { ok: false, error: '기기 정보가 없어요.' };
  return { ok: true, value: { name, score, lines, level, deviceId } };
}

export async function submitScore(v: { name: string; score: number; lines: number; level: number; deviceId: string }): Promise<{ error: string } | { id: string; rank: number }> {
  await initCommunityDb();
  const db = getDb();
  const last = await db.execute({ sql: 'SELECT MAX(created_at) AS t FROM blocks_scores WHERE device_id = ?', args: [v.deviceId] });
  const t = Number((last.rows[0] as unknown as { t: number | null })?.t ?? 0);
  if (Date.now() - t < COOLDOWN_MS) return { error: '방금 기록했어요. 잠시 뒤에 다시 남겨 주세요.' };
  const id = crypto.randomUUID();
  await db.execute({
    sql: 'INSERT INTO blocks_scores (id, name, score, lines, level, device_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [id, v.name, v.score, v.lines, v.level, v.deviceId, Date.now()],
  });
  const r = await db.execute({ sql: 'SELECT COUNT(*) AS c FROM blocks_scores WHERE score > ?', args: [v.score] });
  return { id, rank: Number((r.rows[0] as unknown as { c: number }).c) + 1 };
}
