import { getDb } from './db';
import { initCommunityDb } from './communityDb';
import { BIRTHDAY_STYLE } from './eventCategories';
import type { SchoolEvent } from './schoolEvents';

export interface Birthday {
  id: string;
  name: string;
  month: number;
  day: number;
}

export const BIRTHDAY_NAME_LIMIT = 12;
export const BIRTHDAY_COOLDOWN_SECONDS = 20;
// 달력·목록에서 생일 항목 id 앞에 붙여 일정과 구분한다
export const BIRTHDAY_ID_PREFIX = 'bd-';

// 2월 29일도 받는다 (윤년이 아닌 해에는 2월 28일에 보여준다)
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function validateBirthday(
  body: unknown,
): { ok: true; value: { name: string; month: number; day: number; deviceId: string } } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const month = Number(b.month);
  const day = Number(b.day);
  const deviceId = typeof b.deviceId === 'string' ? b.deviceId.trim() : '';

  if (!name) return { ok: false, error: '이름(별명)을 입력하세요.' };
  if ([...name].length > BIRTHDAY_NAME_LIMIT) return { ok: false, error: `이름은 ${BIRTHDAY_NAME_LIMIT}자까지 쓸 수 있어요.` };
  if (!Number.isInteger(month) || month < 1 || month > 12) return { ok: false, error: '생일 월을 골라 주세요.' };
  if (!Number.isInteger(day) || day < 1 || day > DAYS_IN_MONTH[month - 1]) return { ok: false, error: '생일 날짜를 골라 주세요.' };
  if (!deviceId || deviceId.length > 64) return { ok: false, error: '기기 정보를 읽지 못했어요. 새로고침 후 다시 시도해 주세요.' };

  return { ok: true, value: { name, month, day, deviceId } };
}

export async function listBirthdays(month?: number): Promise<Birthday[]> {
  await initCommunityDb();
  const result = await getDb().execute(
    month
      ? { sql: 'SELECT id, name, month, day FROM member_birthdays WHERE month = ? ORDER BY day, name', args: [month] }
      : { sql: 'SELECT id, name, month, day FROM member_birthdays ORDER BY month, day, name', args: [] },
  );
  return result.rows.map((r) => {
    const row = r as unknown as Birthday;
    return { id: row.id, name: row.name, month: Number(row.month), day: Number(row.day) };
  });
}

// 해당 연·월 달력에 그대로 얹을 수 있게 일정 모양으로 바꾼다
export function birthdaysAsEvents(birthdays: Birthday[], year: number): SchoolEvent[] {
  return birthdays.map((b) => {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const day = b.month === 2 && b.day === 29 && !leap ? 28 : b.day;
    const date = `${year}-${String(b.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return {
      id: `${BIRTHDAY_ID_PREFIX}${b.id}`,
      title: `${b.name} 생일`,
      start_date: date,
      end_date: date,
      place: null,
      memo: null,
      category: BIRTHDAY_STYLE.key,
    };
  });
}

export async function birthdayCooldownLeft(deviceId: string): Promise<number> {
  await initCommunityDb();
  const result = await getDb().execute({
    sql: 'SELECT created_at FROM member_birthdays WHERE device_id = ? ORDER BY created_at DESC LIMIT 1',
    args: [deviceId],
  });
  if (result.rows.length === 0) return 0;
  const last = Date.parse((result.rows[0] as unknown as { created_at: string }).created_at);
  return Math.max(0, Math.ceil(BIRTHDAY_COOLDOWN_SECONDS - (Date.now() - last) / 1000));
}

export async function createBirthday(input: { name: string; month: number; day: number; deviceId: string }): Promise<string> {
  await initCommunityDb();
  const id = crypto.randomUUID();
  await getDb().execute({
    sql: 'INSERT INTO member_birthdays (id, name, month, day, device_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    args: [id, input.name, input.month, input.day, input.deviceId, new Date().toISOString()],
  });
  return id;
}

export async function deleteBirthday(id: string): Promise<boolean> {
  await initCommunityDb();
  const result = await getDb().execute({ sql: 'DELETE FROM member_birthdays WHERE id = ?', args: [id] });
  return result.rowsAffected > 0;
}
