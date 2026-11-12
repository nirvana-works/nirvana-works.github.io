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

    -- 회기분석 수강신청: 행사 하나에 이름 하나. 같은 이름은 한 번만
    CREATE TABLE IF NOT EXISTS event_enrollments (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      name TEXT NOT NULL,
      device_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_event_enrollments_event ON event_enrollments(event_id, created_at);

    -- 공지 대자보: 글 모양(제목·본문·일시·장소) 또는 올린 포스터 이미지. 일정에서 올린 공지는 event_id로 이어진다
    CREATE TABLE IF NOT EXISTS notices (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      kicker TEXT,
      body TEXT,
      when_text TEXT,
      place TEXT,
      urgent INTEGER NOT NULL DEFAULT 0,
      event_id TEXT,
      image TEXT,
      image_mime TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_notices_created ON notices(created_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_notices_event ON notices(event_id) WHERE event_id IS NOT NULL;

    -- 마피아 게임: 방, 참가자, 밤 행동·낮 투표
    CREATE TABLE IF NOT EXISTS mafia_games (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      host_token TEXT NOT NULL,
      host_player_id TEXT,
      mode TEXT NOT NULL,
      phase TEXT NOT NULL,
      phase_ends_at INTEGER,
      day_no INTEGER NOT NULL DEFAULT 0,
      night_secs INTEGER NOT NULL,
      talk_secs INTEGER NOT NULL,
      vote_secs INTEGER NOT NULL,
      reveal_roles INTEGER NOT NULL DEFAULT 1,
      winner TEXT,
      last_event TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_mafia_games_code ON mafia_games(code, created_at);

    CREATE TABLE IF NOT EXISTS mafia_players (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      name TEXT NOT NULL,
      token TEXT NOT NULL,
      role TEXT,
      alive INTEGER NOT NULL DEFAULT 1,
      joined_at INTEGER NOT NULL,
      UNIQUE(game_id, name)
    );

    CREATE TABLE IF NOT EXISTS mafia_actions (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      day_no INTEGER NOT NULL,
      kind TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      UNIQUE(game_id, day_no, kind, actor_id)
    );

    -- 인디언 포커: 방 하나에 대결 하나. 게임 상태는 JSON 한 덩어리로 두고 version으로 동시 변경을 막는다
    CREATE TABLE IF NOT EXISTS poker_games (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      mode TEXT NOT NULL,
      p1_name TEXT NOT NULL,
      p1_token TEXT NOT NULL,
      p2_name TEXT,
      p2_token TEXT,
      turn_secs INTEGER NOT NULL,
      state TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_poker_games_code ON poker_games(code);

    -- 넙죽이 배구: 두 사람이 직접 연결(WebRTC)하도록 연결 정보만 주고받는 방
    CREATE TABLE IF NOT EXISTS volley_rooms (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      host_name TEXT NOT NULL,
      host_token TEXT NOT NULL,
      guest_name TEXT,
      guest_token TEXT,
      target INTEGER NOT NULL,
      offer TEXT,
      answer TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_volley_rooms_code ON volley_rooms(code);

    -- 렉시오: 방 하나에 한 판. 자리(seats)와 게임 상태는 JSON으로 두고 version으로 동시 변경을 막는다
    CREATE TABLE IF NOT EXISTS lexio_games (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      mode TEXT NOT NULL,
      max_players INTEGER NOT NULL,
      turn_secs INTEGER NOT NULL,
      seats TEXT NOT NULL,
      state TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_lexio_games_code ON lexio_games(code);

    -- 넙죽이 블록 점수판: 한 판마다 한 줄. 1~10등만 보여 준다
    CREATE TABLE IF NOT EXISTS blocks_scores (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      score INTEGER NOT NULL,
      lines INTEGER NOT NULL,
      level INTEGER NOT NULL,
      device_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_blocks_scores_score ON blocks_scores(score DESC);

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

  // 낙서를 누른 자리에 붙이기 위한 위치(가로 %, 세로 px)와 낙서장 번호. 예전 낙서는 비어 있다
  const wallColumns = await db.execute('PRAGMA table_info(wall_posts)');
  const wallNames = new Set(wallColumns.rows.map((r) => (r as unknown as { name: string }).name));
  for (const [col, type] of [['pos_x', 'REAL'], ['pos_y', 'REAL'], ['sheet', 'INTEGER']] as const) {
    if (!wallNames.has(col)) await db.execute(`ALTER TABLE wall_posts ADD COLUMN ${col} ${type}`);
  }

  // 공지 분류(학교공지·회기분석·학생회)와 도장 여부. 예전 공지는 학교공지·도장 있음
  const noticeColumns = await db.execute('PRAGMA table_info(notices)');
  const noticeNames = new Set(noticeColumns.rows.map((r) => (r as unknown as { name: string }).name));
  if (!noticeNames.has('category')) await db.execute("ALTER TABLE notices ADD COLUMN category TEXT NOT NULL DEFAULT 'school'");
  if (!noticeNames.has('stamp')) await db.execute('ALTER TABLE notices ADD COLUMN stamp INTEGER NOT NULL DEFAULT 1');

  // 인디언 포커 시작 칩 (방을 만들 때 정한다). 예전 방은 20개
  const pokerColumns = await db.execute('PRAGMA table_info(poker_games)');
  const pokerNames = new Set(pokerColumns.rows.map((r) => (r as unknown as { name: string }).name));
  if (!pokerNames.has('start_chips')) {
    await db.execute('ALTER TABLE poker_games ADD COLUMN start_chips INTEGER NOT NULL DEFAULT 20');
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
