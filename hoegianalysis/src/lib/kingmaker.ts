import { randomUUID } from 'crypto';
import { getDb } from './db';
import { COMMENT_LIMIT, NAME_LIMIT, STANCES, type Meta, type Person, type Stance } from './kingmakerTypes';

// 킹메이커 데이터. 명단은 저장소(공개)에 넣지 않고 DB에만 둔다.
// 테이블은 이 파일에서 한 번만 만든다 (다른 화면의 스키마 버전과 무관)

let ready: Promise<void> | null = null;

function init(): Promise<void> {
  ready ??= (async () => {
    const db = getDb();
    await db.executeMultiple(`
      CREATE TABLE IF NOT EXISTS kingmaker_people (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '',
        stance TEXT,
        comment TEXT NOT NULL DEFAULT '',
        excluded INTEGER NOT NULL DEFAULT 0,
        sort INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS kingmaker_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  })().catch((err) => {
    ready = null; // 실패하면 다음 요청에서 다시
    throw err;
  });
  return ready;
}

export class KingError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

const parseTags = (s: unknown): string[] =>
  String(s ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

function toPerson(r: Record<string, unknown>): Person {
  const stance = STANCES.includes(r.stance as Stance) ? (r.stance as Stance) : null;
  return { id: String(r.id), name: String(r.name), tags: parseTags(r.tags), stance, comment: String(r.comment ?? ''), excluded: Number(r.excluded) === 1 };
}

export async function listPeople(): Promise<Person[]> {
  await init();
  const r = await getDb().execute('SELECT id, name, tags, stance, comment, excluded FROM kingmaker_people ORDER BY sort, name');
  return r.rows.map((row) => toPerson(row as unknown as Record<string, unknown>));
}

export async function getMeta(): Promise<Meta> {
  await init();
  const r = await getDb().execute('SELECT key, value FROM kingmaker_meta');
  const m: Record<string, string> = {};
  for (const row of r.rows) m[String(row.key)] = String(row.value);
  return { candidate: m.candidate ?? '최필성', opponent: m.opponent ?? '' };
}

export async function setMeta(input: { candidate?: unknown; opponent?: unknown }): Promise<Meta> {
  await init();
  const db = getDb();
  for (const key of ['candidate', 'opponent'] as const) {
    const v = input[key];
    if (typeof v !== 'string') continue;
    const value = v.trim().slice(0, NAME_LIMIT);
    await db.execute({ sql: 'INSERT INTO kingmaker_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', args: [key, value] });
  }
  return getMeta();
}

export async function updatePerson(id: string, patch: { stance?: unknown; comment?: unknown; excluded?: unknown }): Promise<void> {
  await init();
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  if ('stance' in patch) {
    const s = patch.stance;
    if (s !== null && !STANCES.includes(s as Stance)) throw new KingError('입장은 지지·중도·반대 중에 골라 주세요.');
    sets.push('stance = ?');
    args.push(s as string | null);
  }
  if (typeof patch.comment === 'string') {
    sets.push('comment = ?');
    args.push(patch.comment.trim().slice(0, COMMENT_LIMIT));
  }
  if (typeof patch.excluded === 'boolean') {
    sets.push('excluded = ?');
    args.push(patch.excluded ? 1 : 0);
  }
  if (!sets.length) return;
  sets.push('updated_at = ?');
  args.push(new Date().toISOString(), id);
  const r = await getDb().execute({ sql: `UPDATE kingmaker_people SET ${sets.join(', ')} WHERE id = ?`, args });
  if (r.rowsAffected !== 1) throw new KingError('그 사람을 찾지 못했어요.', 404);
}

export async function addPerson(nameRaw: unknown): Promise<void> {
  await init();
  const name = typeof nameRaw === 'string' ? nameRaw.trim().slice(0, NAME_LIMIT) : '';
  if (!name) throw new KingError('이름을 입력하세요.');
  const dup = await getDb().execute({ sql: 'SELECT 1 FROM kingmaker_people WHERE name = ?', args: [name] });
  if (dup.rows.length) throw new KingError('이미 있는 이름이에요.', 409);
  const max = await getDb().execute('SELECT COALESCE(MAX(sort), 0) AS m FROM kingmaker_people');
  await getDb().execute({
    sql: 'INSERT INTO kingmaker_people (id, name, tags, stance, comment, excluded, sort, updated_at) VALUES (?, ?, ?, NULL, ?, 0, ?, ?)',
    args: [randomUUID(), name, '', '', Number(max.rows[0].m) + 1, new Date().toISOString()],
  });
}

export async function removePerson(id: string): Promise<void> {
  await init();
  await getDb().execute({ sql: 'DELETE FROM kingmaker_people WHERE id = ?', args: [id] });
}

const STANCE_WORD: Record<string, Stance> = { 지지: 'for', 중도: 'neutral', 반대: 'against', for: 'for', neutral: 'neutral', against: 'against' };

// 붙여 넣은 명단(탭으로 구분): 이름 [태그(쉼표)] [입장] [코멘트] [제외(Y)]
// 이미 있는 이름은 건드리지 않고 새 이름만 추가한다
export async function importPeople(text: unknown): Promise<{ added: number; skipped: number }> {
  await init();
  if (typeof text !== 'string' || !text.trim()) throw new KingError('붙여 넣은 내용이 없어요.');
  const db = getDb();
  const existing = new Set((await db.execute('SELECT name FROM kingmaker_people')).rows.map((r) => String(r.name)));
  const max = await db.execute('SELECT COALESCE(MAX(sort), 0) AS m FROM kingmaker_people');
  let sort = Number(max.rows[0].m);
  const now = new Date().toISOString();
  const stmts: { sql: string; args: (string | number | null)[] }[] = [];
  let skipped = 0;
  for (const line of text.split(/\r?\n/)) {
    const cols = line.split('\t').map((c) => c.trim());
    const name = (cols[0] ?? '').slice(0, NAME_LIMIT);
    if (!name || name === '이름') continue;
    if (existing.has(name)) {
      skipped++;
      continue;
    }
    existing.add(name);
    const tags = parseTags(cols[1]).join(',');
    const stance = STANCE_WORD[cols[2] ?? ''] ?? null;
    const comment = (cols[3] ?? '').slice(0, COMMENT_LIMIT);
    const excluded = /^(y|yes|제외|1|true)$/i.test(cols[4] ?? '') ? 1 : 0;
    stmts.push({
      sql: 'INSERT INTO kingmaker_people (id, name, tags, stance, comment, excluded, sort, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [randomUUID(), name, tags, stance, comment, excluded, ++sort, now],
    });
  }
  if (stmts.length > 400) throw new KingError('한 번에 400명까지만 가져올 수 있어요.');
  if (stmts.length) await db.batch(stmts, 'write');
  return { added: stmts.length, skipped };
}
