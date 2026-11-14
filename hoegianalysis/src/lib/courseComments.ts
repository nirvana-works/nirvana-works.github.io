import { getDb } from './db';
import { initCommunityDb } from './communityDb';
import { VALID_COURSE_KEYS } from './courses/courseKey';
import { COURSE_COMMENT_COOLDOWN_SECONDS, COURSE_COMMENT_LIMITS, type CourseComment } from './courseCommentTypes';

// 개설과목 댓글. 누구나 별명으로 남기고, 본인 기기나 운영자가 지울 수 있다
export class CommentError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

const MAX_LIST = 200; // 한 과목에서 불러오는 최대 개수 (최근 것부터)

export async function courseCommentCounts(): Promise<Record<string, number>> {
  await initCommunityDb();
  const r = await getDb().execute('SELECT course_key, COUNT(*) AS n FROM course_comments GROUP BY course_key');
  const out: Record<string, number> = {};
  for (const row of r.rows) {
    const x = row as unknown as { course_key: string; n: number };
    out[x.course_key] = Number(x.n);
  }
  return out;
}

export async function listCourseComments(key: string, deviceId: string): Promise<CourseComment[]> {
  if (!VALID_COURSE_KEYS.has(key)) throw new CommentError('없는 과목이에요.', 404);
  await initCommunityDb();
  const r = await getDb().execute({
    sql: 'SELECT id, nickname, body, device_id, created_at FROM course_comments WHERE course_key = ? ORDER BY created_at DESC LIMIT ?',
    args: [key, MAX_LIST],
  });
  return r.rows.map((row) => {
    const x = row as unknown as { id: string; nickname: string; body: string; device_id: string; created_at: string };
    return { id: x.id, nickname: x.nickname, body: x.body, created_at: x.created_at, mine: !!deviceId && x.device_id === deviceId };
  });
}

export async function addCourseComment(rawKey: unknown, rawNickname: unknown, rawBody: unknown, rawDevice: unknown): Promise<CourseComment> {
  const key = typeof rawKey === 'string' ? rawKey : '';
  const nickname = typeof rawNickname === 'string' ? rawNickname.trim().replace(/\s+/g, ' ') : '';
  const body = typeof rawBody === 'string' ? rawBody.trim().replace(/\n{3,}/g, '\n\n') : '';
  const device = typeof rawDevice === 'string' ? rawDevice : '';

  if (!VALID_COURSE_KEYS.has(key)) throw new CommentError('없는 과목이에요.', 404);
  if (!nickname) throw new CommentError('별명을 입력하세요.');
  if ([...nickname].length > COURSE_COMMENT_LIMITS.nickname) throw new CommentError(`별명은 ${COURSE_COMMENT_LIMITS.nickname}자까지 쓸 수 있어요.`);
  if (!body) throw new CommentError('리뷰 내용을 입력하세요.');
  if ([...body].length > COURSE_COMMENT_LIMITS.body) throw new CommentError(`리뷰는 ${COURSE_COMMENT_LIMITS.body}자까지 쓸 수 있어요.`);
  if (!device || device.length > 64) throw new CommentError('기기 정보를 읽지 못했어요. 새로고침 후 다시 시도해 주세요.');

  await initCommunityDb();
  const db = getDb();

  // 같은 기기는 20초에 한 번 (도배 방지)
  const last = await db.execute({ sql: 'SELECT created_at FROM course_comments WHERE device_id = ? ORDER BY created_at DESC LIMIT 1', args: [device] });
  if (last.rows.length) {
    const elapsed = (Date.now() - Date.parse((last.rows[0] as unknown as { created_at: string }).created_at)) / 1000;
    const wait = Math.ceil(COURSE_COMMENT_COOLDOWN_SECONDS - elapsed);
    if (wait > 0) throw new CommentError(`방금 리뷰를 남겼어요. ${wait}초 뒤에 다시 남겨 주세요.`, 429);
  }

  const c: CourseComment = { id: crypto.randomUUID(), nickname, body, created_at: new Date().toISOString(), mine: true };
  await db.execute({
    sql: 'INSERT INTO course_comments (id, course_key, nickname, body, device_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    args: [c.id, key, nickname, body, device, c.created_at],
  });
  return c;
}

// 본인 기기(또는 운영자)만 삭제
export async function removeCourseComment(id: string, deviceId: string, admin: boolean): Promise<boolean> {
  await initCommunityDb();
  const db = getDb();
  const r = admin
    ? await db.execute({ sql: 'DELETE FROM course_comments WHERE id = ?', args: [id] })
    : await db.execute({ sql: 'DELETE FROM course_comments WHERE id = ? AND device_id = ?', args: [id, deviceId || '-'] });
  return r.rowsAffected > 0;
}
