import { getDb } from './db';
import { initCommunityDb } from './communityDb';

// 목록에는 이미지 본문을 싣지 않는다 (has_image만). 이미지는 /api/notice/[id]/image로 따로 받는다
export interface Notice {
  id: string;
  title: string;
  kicker: string | null; // 제목 위 작은 빨간 글씨 (분류 등)
  body: string | null;
  when_text: string | null;
  place: string | null;
  urgent: boolean;
  event_id: string | null;
  has_image: boolean;
  created_at: string;
  issue_no: string; // 공고 제2026-N호 (그해 올린 순서)
}

export const NOTICE_LIMITS = { title: 40, kicker: 12, body: 300, when: 40, place: 40, imageBytes: 1_800_000 } as const;
const IMAGE_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

export interface NoticeInput {
  title: string;
  kicker: string | null;
  body: string | null;
  when_text: string | null;
  place: string | null;
  urgent: boolean;
  event_id: string | null;
  image: string | null; // base64 (data: 접두어 없이)
  image_mime: string | null;
}

export function validateNotice(body: unknown): { ok: true; value: NoticeInput } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const title = str(b.title);
  const kicker = str(b.kicker);
  const text = str(b.body);
  const when = str(b.when_text);
  const place = str(b.place);
  const imageUrl = str(b.image);

  if (!title) return { ok: false, error: '공지 제목을 입력하세요.' };
  if ([...title].length > NOTICE_LIMITS.title) return { ok: false, error: `제목은 ${NOTICE_LIMITS.title}자까지 쓸 수 있어요.` };
  if ([...kicker].length > NOTICE_LIMITS.kicker) return { ok: false, error: `제목 위 글씨는 ${NOTICE_LIMITS.kicker}자까지예요.` };
  if ([...text].length > NOTICE_LIMITS.body) return { ok: false, error: `본문은 ${NOTICE_LIMITS.body}자까지 쓸 수 있어요.` };
  if ([...when].length > NOTICE_LIMITS.when) return { ok: false, error: `일시는 ${NOTICE_LIMITS.when}자까지 쓸 수 있어요.` };
  if ([...place].length > NOTICE_LIMITS.place) return { ok: false, error: `장소는 ${NOTICE_LIMITS.place}자까지 쓸 수 있어요.` };

  let image: string | null = null;
  let image_mime: string | null = null;
  if (imageUrl) {
    const m = IMAGE_RE.exec(imageUrl);
    if (!m) return { ok: false, error: '이미지는 JPG, PNG, WebP만 올릴 수 있어요.' };
    if (m[2].length > NOTICE_LIMITS.imageBytes) return { ok: false, error: '이미지가 너무 커요. 더 작은 사진으로 올려 주세요.' };
    image_mime = m[1];
    image = m[2];
  }

  return {
    ok: true,
    value: {
      title,
      kicker: kicker || null,
      body: text || null,
      when_text: when || null,
      place: place || null,
      urgent: b.urgent === true,
      event_id: null,
      image,
      image_mime,
    },
  };
}

export async function listNotices(): Promise<Notice[]> {
  await initCommunityDb();
  const result = await getDb().execute(
    `SELECT id, title, kicker, body, when_text, place, urgent, event_id, (image IS NOT NULL) AS has_image, created_at
     FROM notices ORDER BY created_at ASC`,
  );
  const perYear = new Map<string, number>();
  const rows = result.rows.map((r) => {
    const row = r as unknown as Record<string, unknown>;
    const year = String(row.created_at).slice(0, 4);
    const n = (perYear.get(year) ?? 0) + 1;
    perYear.set(year, n);
    return {
      id: String(row.id),
      title: String(row.title),
      kicker: (row.kicker as string | null) ?? null,
      body: (row.body as string | null) ?? null,
      when_text: (row.when_text as string | null) ?? null,
      place: (row.place as string | null) ?? null,
      urgent: Number(row.urgent) === 1,
      event_id: (row.event_id as string | null) ?? null,
      has_image: Number(row.has_image) === 1,
      created_at: String(row.created_at),
      issue_no: `${year}-${n}`,
    } satisfies Notice;
  });
  return rows.reverse(); // 새 공지가 먼저
}

export async function createNotice(input: NoticeInput): Promise<string> {
  await initCommunityDb();
  const id = crypto.randomUUID();
  await getDb().execute({
    sql: `INSERT INTO notices (id, title, kicker, body, when_text, place, urgent, event_id, image, image_mime, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, input.title, input.kicker, input.body, input.when_text, input.place, input.urgent ? 1 : 0, input.event_id, input.image, input.image_mime, new Date().toISOString()],
  });
  return id;
}

export async function deleteNotice(id: string): Promise<boolean> {
  await initCommunityDb();
  const result = await getDb().execute({ sql: 'DELETE FROM notices WHERE id = ?', args: [id] });
  return result.rowsAffected > 0;
}

export async function getNoticeImage(id: string): Promise<{ mime: string; data: Buffer } | null> {
  await initCommunityDb();
  const result = await getDb().execute({ sql: 'SELECT image, image_mime FROM notices WHERE id = ?', args: [id] });
  const row = result.rows[0] as unknown as { image: string | null; image_mime: string | null } | undefined;
  if (!row?.image || !row.image_mime) return null;
  return { mime: row.image_mime, data: Buffer.from(row.image, 'base64') };
}
