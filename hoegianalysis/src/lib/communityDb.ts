import { getDb } from './db';
import { SEEDS } from './scheduleSeed';

// Hoegilab 커뮤니티용 테이블. 기존 출석·정산 테이블은 건드리지 않고 새 테이블만 추가한다
let initPromise: Promise<void> | null = null;

export function initCommunityDb(): Promise<void> {
  initPromise ??= runInit().catch((err) => {
    initPromise = null; // 실패하면 다음 요청에서 재시도
    throw err;
  });
  return initPromise;
}

async function runInit(): Promise<void> {
  const db = getDb();
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS school_events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      place TEXT,
      memo TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_school_events_start ON school_events(start_date);

    CREATE TABLE IF NOT EXISTS wall_posts (
      id TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      content TEXT NOT NULL,
      device_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      is_hidden INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_wall_posts_created ON wall_posts(created_at);
    CREATE INDEX IF NOT EXISTS idx_wall_posts_device ON wall_posts(device_id, created_at);

    -- 멤버 생일: 해마다 반복되니 연도 없이 월·일만
    CREATE TABLE IF NOT EXISTS member_birthdays (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      month INTEGER NOT NULL,
      day INTEGER NOT NULL,
      device_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_member_birthdays_md ON member_birthdays(month, day);

    -- 기본 데이터를 넣었는지 같은 한 번짜리 기록
    CREATE TABLE IF NOT EXISTS community_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // 학교 일정 분류(대외·기획·가치·TF·학사)와 누가 넣었는지(연속 추가 막기용) 컬럼
  const columns = await db.execute('PRAGMA table_info(school_events)');
  const names = new Set(columns.rows.map((r) => (r as unknown as { name: string }).name));
  if (!names.has('category')) {
    await db.execute('ALTER TABLE school_events ADD COLUMN category TEXT');
  }
  if (!names.has('device_id')) {
    await db.execute('ALTER TABLE school_events ADD COLUMN device_id TEXT');
  }

  for (const seed of SEEDS) await seedSchedule(seed.key, seed.events);
}

// 기본 일정 묶음을 한 번만 넣는다. 나중에 누가 지워도 다시 생기지 않도록 기록을 남긴다
async function seedSchedule(key: string, events: (typeof SEEDS)[number]['events']): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  // 서버 여러 대가 동시에 켜져도 한 곳만 넣도록, 기록을 먼저 차지한 쪽만 진행한다
  const claim = await db.execute({
    sql: 'INSERT OR IGNORE INTO community_meta (key, value) VALUES (?, ?)',
    args: [key, now],
  });
  if (claim.rowsAffected === 0) return;

  try {
    await db.batch(
      events.map((e) => ({
        sql: `INSERT INTO school_events (id, title, start_date, end_date, place, memo, category, created_at)
              VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)`,
        args: [crypto.randomUUID(), e.title, e.start, e.end ?? e.start, e.category, now],
      })),
      'write',
    );
  } catch (err) {
    await db.execute({ sql: 'DELETE FROM community_meta WHERE key = ?', args: [key] }); // 다음에 다시 시도
    throw err;
  }
}
