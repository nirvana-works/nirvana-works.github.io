import { getDb } from './db';
import { initCommunityDb } from './communityDb';

export interface WallPost {
  id: string;
  nickname: string;
  content: string;
  created_at: string; // ISO
  // 누른 자리. 예전 낙서는 null (자동으로 줄 맞춰 붙인다)
  pos_x: number | null; // 가로 %
  pos_y: number | null; // 세로 px (낙서장 위에서부터)
  sheet: number | null; // 낙서장 번호
}

export const WALL_LIMITS = { nickname: 12, content: 140 } as const;
export const WALL_COOLDOWN_SECONDS = 30;
// 불러오는 최대 개수 (최근 것부터, 낙서장 50장 분량)
export const WALL_PAGE_SIZE = 500;

// 입력 검증: 실패하면 화면에 그대로 보여줄 문구를 돌려준다
export interface WallInput {
  nickname: string;
  content: string;
  deviceId: string;
  pos_x: number | null;
  pos_y: number | null;
  sheet: number | null;
}

export function validateWallPost(
  body: unknown,
): { ok: true; value: WallInput } | { ok: false; error: string } {
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

  // 누른 자리 (없으면 자동 배치). 셋이 함께 와야 한다
  const px = Number(b.pos_x);
  const py = Number(b.pos_y);
  const sh = Number(b.sheet);
  const hasPos = b.pos_x != null && b.pos_y != null && b.sheet != null;
  if (hasPos && !(Number.isFinite(px) && Number.isFinite(py) && Number.isInteger(sh) && sh >= 0 && sh <= 100000)) {
    return { ok: false, error: '낙서 위치를 읽지 못했어요. 새로고침 후 다시 써 주세요.' };
  }
  const pos = hasPos
    ? { pos_x: Math.min(100, Math.max(0, px)), pos_y: Math.min(5000, Math.max(0, py)), sheet: sh }
    : { pos_x: null, pos_y: null, sheet: null };

  return { ok: true, value: { nickname, content, deviceId, ...pos } };
}

export async function listWallPosts(): Promise<WallPost[]> {
  await initCommunityDb();
  const result = await getDb().execute({
    sql: `SELECT id, nickname, content, created_at, pos_x, pos_y, sheet FROM wall_posts
          WHERE is_hidden = 0 ORDER BY created_at DESC LIMIT ?`,
    args: [WALL_PAGE_SIZE],
  });
  // 낙서장은 오래된 장부터 채우므로 오래된 순으로 돌려준다
  return (result.rows as unknown as WallPost[]).reverse().map((r) => ({
    id: r.id,
    nickname: r.nickname,
    content: r.content,
    created_at: r.created_at,
    pos_x: r.pos_x == null ? null : Number(r.pos_x),
    pos_y: r.pos_y == null ? null : Number(r.pos_y),
    sheet: r.sheet == null ? null : Number(r.sheet),
  }));
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

export async function createWallPost(input: WallInput): Promise<WallPost> {
  await initCommunityDb();
  const post: WallPost = {
    id: crypto.randomUUID(),
    nickname: input.nickname,
    content: input.content,
    created_at: new Date().toISOString(),
    pos_x: input.pos_x,
    pos_y: input.pos_y,
    sheet: input.sheet,
  };
  await getDb().execute({
    sql: 'INSERT INTO wall_posts (id, nickname, content, device_id, created_at, pos_x, pos_y, sheet) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    args: [post.id, post.nickname, post.content, input.deviceId, post.created_at, post.pos_x, post.pos_y, post.sheet],
  });
  return post;
}

// 운영자 삭제: 기록은 남기고 벽에서만 숨긴다
export async function hideWallPost(id: string): Promise<boolean> {
  await initCommunityDb();
  const result = await getDb().execute({ sql: 'UPDATE wall_posts SET is_hidden = 1 WHERE id = ? AND is_hidden = 0', args: [id] });
  return result.rowsAffected > 0;
}
