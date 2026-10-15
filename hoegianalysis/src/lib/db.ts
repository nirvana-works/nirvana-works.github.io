import { createClient, type Client } from '@libsql/client';
import path from 'path';

let client: Client | null = null;

// 배포 환경: TURSO_DATABASE_URL / TURSO_AUTH_TOKEN 으로 Turso에 연결
// 로컬 개발: 환경변수가 없으면 프로젝트 폴더의 hoesik.db 파일 사용
export function getDb(): Client {
  if (client) return client;

  const tursoUrl = process.env.TURSO_DATABASE_URL;
  if (tursoUrl) {
    client = createClient({ url: tursoUrl, authToken: process.env.TURSO_AUTH_TOKEN });
  } else {
    const dbPath = path.join(process.cwd(), 'hoesik.db');
    client = createClient({ url: `file:${dbPath}` });
  }
  return client;
}

// 테이블 생성·마이그레이션은 서버 프로세스당 한 번만 (원격 DB 왕복을 줄이기 위해)
let initPromise: Promise<void> | null = null;

export function initDb(): Promise<void> {
  initPromise ??= runInit().catch((err) => {
    initPromise = null; // 실패하면 다음 요청에서 재시도
    throw err;
  });
  return initPromise;
}

async function runInit(): Promise<void> {
  const db = getDb();
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      admin_password TEXT NOT NULL,
      current_round_number INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rounds (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      round_number INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      total_amount INTEGER DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS checkins (
      id TEXT PRIMARY KEY,
      round_id TEXT NOT NULL,
      name TEXT NOT NULL,
      checked_in_at TEXT NOT NULL,
      UNIQUE(round_id, name),
      FOREIGN KEY (round_id) REFERENCES rounds(id)
    );
  `);

  // 기존 DB에 엔빵 계좌 컬럼이 없으면 추가
  const columns = await db.execute('PRAGMA table_info(sessions)');
  const names = new Set(columns.rows.map((r) => (r as unknown as { name: string }).name));
  if (!names.has('account_number')) {
    await db.execute('ALTER TABLE sessions ADD COLUMN account_number TEXT');
  }
  if (!names.has('account_holder')) {
    await db.execute('ALTER TABLE sessions ADD COLUMN account_holder TEXT');
  }

  // 사람별 조정 금액 (기본 0, 양수면 더 내고 음수면 덜 냄)
  const checkinColumns = await db.execute('PRAGMA table_info(checkins)');
  const checkinNames = new Set(checkinColumns.rows.map((r) => (r as unknown as { name: string }).name));
  if (!checkinNames.has('adjustment')) {
    await db.execute('ALTER TABLE checkins ADD COLUMN adjustment INTEGER NOT NULL DEFAULT 0');
  }
}

export default getDb;
