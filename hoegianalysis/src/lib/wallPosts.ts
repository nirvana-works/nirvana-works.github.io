import { getDb } from './db';
import { initCommunityDb } from './communityDb';

export interface WallPost {
  id: string;
  nickname: string;
  content: string;
  created_at: string; // ISO
}

export const WALL_LIMITS = { nickname: 12, content: 140 } as const;
export const WALL_COOLDOWN_SECONDS = 30;
// 벽에 한 번에 붙이는 최대 개수 (최신순)
export const WALL_PAGE_SIZE = 60;

// 입력 검증: 실패하면 화면에 그대로 보여줄 문구를 돌려준다
export function validateWallPost(
  body: unknown,
): { ok: true; value: { nickname: string; content: string; deviceId: string } } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const nickname = str(b.nickname);
  const content = str(b.content);
  const deviceId = str(b.deviceId);

  if (!nickname) return { ok: false, error: '별명을 입력하세요.' };
  if ([...nickname].length > WALL_LIMITS.nickname) return { ok: false, error: `별명은 ${WALL_LIMITS.nickname}자까지 쓸 수 있어요.` };
  if (!content) return { ok: false, error: '낙서할 내용을 입력하세요.' };
  if ([...content].length > WALL_LIMITS.content) return { ok: false, error: `낙서는 ${WALL_LIMITS.content}자까지 쓸 수 있어요.` };
  if (!deviceId || deviceId.length > 64) return { ok: false, error: '기기 정보를 읽지 못했어요. 새로고침 후 다시 써 주세요.' };

  return { ok: true, value: { nickname, content, deviceId } };
}

export async function listWallPosts(): Promise<WallPost[]> {
  await initCommunityDb();
  const result = await getDb().execute({
    sql: `SELECT id, nickname, content, created_at FROM wall_posts
          WHERE is_hidden = 0 ORDER BY created_at DESC LIMIT ?`,
    args: [WALL_PAGE_SIZE],
  });
  return result.rows as unknown as WallPost[];
}

// 같은 기기에서 마지막으로 쓴 뒤 몇 초 더 기다려야 하는지 (0이면 바로 써도 됨)
export async function cooldownLeft(deviceId: string): Promise<number> {
  await initCommunityDb();
  const result = await getDb().execute({
    sql: 'SELECT created_at FROM wall_posts WHERE device_id = ? ORDER BY created_at DESC LIMIT 1',
    args: [deviceId],
  });
  if (result.rows.length === 0) return 0;
  const last = Date.parse((result.rows[0] as unknown as { created_at: string }).created_at);
  const elapsed = (Date.now() - last) / 1000;
  return Math.max(0, Math.ceil(WALL_COOLDOWN_SECONDS - elapsed));
}

export async function createWallPost(input: { nickname: string; content: string; deviceId: string }): Promise<WallPost> {
  await initCommunityDb();
  const post: WallPost = {
    id: crypto.randomUUID(),
    nickname: input.nickname,
    content: input.content,
    created_at: new Date().toISOString(),
  };
  await getDb().execute({
    sql: 'INSERT INTO wall_posts (id, nickname, content, device_id, created_at) VALUES (?, ?, ?, ?, ?)',
    args: [post.id, post.nickname, post.content, input.deviceId, post.created_at],
  });
  return post;
}

// 운영자 삭제: 기록은 남기고 벽에서만 숨긴다
export async function hideWallPost(id: string): Promise<boolean> {
  await initCommunityDb();
  const result = await getDb().execute({ sql: 'UPDATE wall_posts SET is_hidden = 1 WHERE id = ? AND is_hidden = 0', args: [id] });
  return result.rowsAffected > 0;
}
