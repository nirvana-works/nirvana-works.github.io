import { getDb } from './db';
import { initCommunityDb } from './communityDb';
import { isEventCategory } from './eventCategories';

export interface SchoolEvent {
  id: string;
  title: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // 하루짜리 행사는 start_date와 같음
  place: string | null;
  memo: string | null;
  category: string | null; // eventCategories 키 (대외·기획·가치·TF·학사), 없으면 null
}

export const EVENT_LIMITS = { title: 40, place: 40, memo: 200 } as const;
// 누구나 추가할 수 있으니 같은 기기에서 연달아 올리는 것만 막는다
export const EVENT_COOLDOWN_SECONDS = 20;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

// 서버는 UTC로 돌기 때문에 "오늘"과 "이번 달"은 한국 시간 기준으로 계산
export function todayKST(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function isValidMonth(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}$/.test(value) && isValidDate(`${value}-01`));
}

export type EventInput = Omit<SchoolEvent, 'id'> & { device_id: string };

// 입력 검증: 실패하면 화면에 그대로 보여줄 문구를 돌려준다
export function validateEvent(body: unknown): { ok: true; value: EventInput } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

  const title = str(b.title);
  const start = str(b.start_date);
  const end = str(b.end_date) || start;
  const place = str(b.place);
  const memo = str(b.memo);
  const category = str(b.category);
  const deviceId = str(b.deviceId);

  if (!title) return { ok: false, error: '행사 이름을 입력하세요.' };
  if (title.length > EVENT_LIMITS.title) return { ok: false, error: `행사 이름은 ${EVENT_LIMITS.title}자까지 쓸 수 있어요.` };
  if (!isValidDate(start)) return { ok: false, error: '시작 날짜를 골라 주세요.' };
  if (!isValidDate(end)) return { ok: false, error: '끝나는 날짜가 올바르지 않아요.' };
  if (end < start) return { ok: false, error: '끝나는 날짜가 시작 날짜보다 빨라요.' };
  if (place.length > EVENT_LIMITS.place) return { ok: false, error: `장소는 ${EVENT_LIMITS.place}자까지 쓸 수 있어요.` };
  if (memo.length > EVENT_LIMITS.memo) return { ok: false, error: `메모는 ${EVENT_LIMITS.memo}자까지 쓸 수 있어요.` };
  if (category && !isEventCategory(category)) return { ok: false, error: '분류를 다시 골라 주세요.' };
  if (!deviceId || deviceId.length > 64) return { ok: false, error: '기기 정보를 읽지 못했어요. 새로고침 후 다시 시도해 주세요.' };

  return {
    ok: true,
    value: {
      title,
      start_date: start,
      end_date: end,
      place: place || null,
      memo: memo || null,
      category: category || null,
      device_id: deviceId,
    },
  };
}

// 기간이 [from, to]와 하루라도 겹치는 행사
export async function listEventsBetween(from: string, to: string): Promise<SchoolEvent[]> {
  await initCommunityDb();
  const result = await getDb().execute({
    sql: `SELECT id, title, start_date, end_date, place, memo, category FROM school_events
          WHERE start_date <= ? AND end_date >= ?
          ORDER BY start_date, (category = 'hoegi') DESC, end_date, title`,
    args: [to, from],
  });
  return result.rows as unknown as SchoolEvent[];
}

export async function createEvent(input: EventInput): Promise<string> {
  await initCommunityDb();
  const id = crypto.randomUUID();
  await getDb().execute({
    sql: `INSERT INTO school_events (id, title, start_date, end_date, place, memo, category, device_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.title,
      input.start_date,
      input.end_date,
      input.place,
      input.memo,
      input.category,
      input.device_id,
      new Date().toISOString(),
    ],
  });
  return id;
}

export async function deleteEvent(id: string): Promise<boolean> {
  await initCommunityDb();
  const result = await getDb().execute({ sql: 'DELETE FROM school_events WHERE id = ?', args: [id] });
  return result.rowsAffected > 0;
}

// 같은 기기에서 마지막으로 추가한 뒤 몇 초 더 기다려야 하는지 (0이면 바로 가능)
export async function eventCooldownLeft(deviceId: string): Promise<number> {
  await initCommunityDb();
  const result = await getDb().execute({
    sql: 'SELECT created_at FROM school_events WHERE device_id = ? ORDER BY created_at DESC LIMIT 1',
    args: [deviceId],
  });
  if (result.rows.length === 0) return 0;
  const last = Date.parse((result.rows[0] as unknown as { created_at: string }).created_at);
  return Math.max(0, Math.ceil(EVENT_COOLDOWN_SECONDS - (Date.now() - last) / 1000));
}
