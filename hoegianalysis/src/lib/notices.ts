import { getDb } from './db';
import { initCommunityDb } from './communityDb';

import { HOEGI } from './eventCategories';
import { NOTICE_LIMITS, isNoticeCategory, type LinkableEvent, type Notice, type NoticeCategory } from './noticeTypes';

export type { Notice, LinkableEvent };
export { NOTICE_LIMITS };

export class NoticeError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

const IMAGE_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

export interface NoticeInput {
  title: string;
  kicker: string | null;
  body: string | null;
  when_text: string | null;
  place: string | null;
  urgent: boolean;
  event_id: string | null;
  category: NoticeCategory;
  stamp: boolean;
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
  const category: NoticeCategory = isNoticeCategory(b.category) ? b.category : 'school';

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
      event_id: str(b.event_id) || null,
      category,
      stamp: b.stamp !== false,
      image,
      image_mime,
    },
  };
}

export async function listNotices(): Promise<Notice[]> {
  await initCommunityDb();
  const result = await getDb().execute(
    `SELECT id, title, kicker, body, when_text, place, urgent, event_id, (image IS NOT NULL) AS has_image, category, stamp, created_at
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
      category: isNoticeCategory(row.category) ? row.category : 'school',
      stamp: Number(row.stamp) !== 0,
      created_at: String(row.created_at),
      issue_no: `${year}-${n}`,
    } satisfies Notice;
  });
  return rows.reverse(); // 새 공지가 먼저
}

export async function createNotice(input: NoticeInput): Promise<string> {
  await initCommunityDb();
  const db = getDb();
  if (input.event_id) {
    const ev = await db.execute({ sql: 'SELECT category FROM school_events WHERE id = ?', args: [input.event_id] });
    if (!ev.rows.length) throw new NoticeError('연결하려는 수업을 찾지 못했어요.', 404);
    if ((ev.rows[0] as unknown as { category: string | null }).category !== HOEGI) throw new NoticeError('회기분석 수업만 연결할 수 있어요.', 409);
    const used = await db.execute({ sql: 'SELECT 1 FROM notices WHERE event_id = ?', args: [input.event_id] });
    if (used.rows.length) throw new NoticeError('이 수업에는 이미 공지가 붙어 있어요.', 409);
  }
  const id = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO notices (id, title, kicker, body, when_text, place, urgent, event_id, image, image_mime, category, stamp, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, input.title, input.kicker, input.body, input.when_text, input.place, input.urgent ? 1 : 0, input.event_id, input.image, input.image_mime, input.category, input.stamp ? 1 : 0, new Date().toISOString()],
  });
  return id;
}

// 공지에 연결할 수 있는 회기분석 수업 (아직 공지가 안 붙은 것, 최근 순)
export async function listLinkableEvents(): Promise<LinkableEvent[]> {
  await initCommunityDb();
  const r = await getDb().execute({
    sql: `SELECT id, title, start_date FROM school_events
          WHERE category = ? AND id NOT IN (SELECT event_id FROM notices WHERE event_id IS NOT NULL)
          ORDER BY start_date DESC LIMIT 30`,
    args: [HOEGI],
  });
  return r.rows as unknown as LinkableEvent[];
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
