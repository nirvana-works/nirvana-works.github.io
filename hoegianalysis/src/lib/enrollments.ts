import { getDb } from './db';
import { initCommunityDb } from './communityDb';
import { HOEGI } from './eventCategories';

// 회기분석 수강신청. 누구나 이름으로 신청하고, 본인 기기나 운영자가 취소할 수 있다
import { ENROLL_NAME_LIMIT } from './enrollmentTypes';
const MAX_PER_DEVICE = 5; // 한 기기로 한 행사에 넣을 수 있는 이름 수 (친구 대신 신청 정도만)

export interface Enrollment {
  id: string;
  name: string;
  created_at: string;
  mine: boolean;
}

export class EnrollError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export async function enrollmentCounts(eventIds: string[]): Promise<Record<string, number>> {
  if (eventIds.length === 0) return {};
  await initCommunityDb();
  const marks = eventIds.map(() => '?').join(',');
  const r = await getDb().execute({
    sql: `SELECT event_id, COUNT(*) AS n FROM event_enrollments WHERE event_id IN (${marks}) GROUP BY event_id`,
    args: eventIds,
  });
  const out: Record<string, number> = {};
  for (const row of r.rows) {
    const x = row as unknown as { event_id: string; n: number };
    out[x.event_id] = Number(x.n);
  }
  return out;
}

export async function listEnrollments(eventId: string, deviceId: string): Promise<Enrollment[]> {
  await initCommunityDb();
  const r = await getDb().execute({
    sql: 'SELECT id, name, device_id, created_at FROM event_enrollments WHERE event_id = ? ORDER BY created_at ASC',
    args: [eventId],
  });
  return r.rows.map((row) => {
    const x = row as unknown as { id: string; name: string; device_id: string; created_at: string };
    return { id: x.id, name: x.name, created_at: x.created_at, mine: !!deviceId && x.device_id === deviceId };
  });
}

export async function addEnrollment(eventId: string, rawName: unknown, deviceId: unknown): Promise<void> {
  await initCommunityDb();
  const db = getDb();
  const name = typeof rawName === 'string' ? rawName.trim().replace(/\s+/g, ' ') : '';
  const device = typeof deviceId === 'string' ? deviceId : '';
  if (!name) throw new EnrollError('이름을 입력하세요.');
  if ([...name].length > ENROLL_NAME_LIMIT) throw new EnrollError(`이름은 ${ENROLL_NAME_LIMIT}자까지 쓸 수 있어요.`);
  if (!device || device.length > 64) throw new EnrollError('기기 정보를 읽지 못했어요. 새로고침 후 다시 시도해 주세요.');

  const ev = await db.execute({ sql: 'SELECT category FROM school_events WHERE id = ?', args: [eventId] });
  if (ev.rows.length === 0) throw new EnrollError('이미 지워진 일정이에요.', 404);
  if ((ev.rows[0] as unknown as { category: string | null }).category !== HOEGI) throw new EnrollError('회기분석 수업만 신청할 수 있어요.', 409);

  const dup = await db.execute({ sql: 'SELECT 1 FROM event_enrollments WHERE event_id = ? AND LOWER(name) = LOWER(?)', args: [eventId, name] });
  if (dup.rows.length) throw new EnrollError('이미 신청한 이름이에요.', 409);
  const mine = await db.execute({ sql: 'SELECT COUNT(*) AS n FROM event_enrollments WHERE event_id = ? AND device_id = ?', args: [eventId, device] });
  if (Number((mine.rows[0] as unknown as { n: number }).n) >= MAX_PER_DEVICE) throw new EnrollError(`한 기기에서는 ${MAX_PER_DEVICE}명까지 신청할 수 있어요.`, 429);

  await db.execute({
    sql: 'INSERT INTO event_enrollments (id, event_id, name, device_id, created_at) VALUES (?, ?, ?, ?, ?)',
    args: [crypto.randomUUID(), eventId, name, device, new Date().toISOString()],
  });
}

// 본인 기기(또는 운영자)만 취소
export async function removeEnrollment(eventId: string, enrollId: string, deviceId: string, admin: boolean): Promise<boolean> {
  await initCommunityDb();
  const db = getDb();
  const r = admin
    ? await db.execute({ sql: 'DELETE FROM event_enrollments WHERE id = ? AND event_id = ?', args: [enrollId, eventId] })
    : await db.execute({ sql: 'DELETE FROM event_enrollments WHERE id = ? AND event_id = ? AND device_id = ?', args: [enrollId, eventId, deviceId || '-'] });
  return r.rowsAffected > 0;
}
