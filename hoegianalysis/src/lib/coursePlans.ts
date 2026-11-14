import { getDb } from './db';
import { initCommunityDb } from './communityDb';
import { VALID_COURSE_KEYS } from './courses/courseKey';
import { PLAN_NAME_LIMIT, type CoursePlan } from './coursePlanTypes';

// 개설과목 수강 예정. 누구나 이름으로 올리고, 본인 기기나 운영자가 취소할 수 있다
const MAX_PER_DEVICE = 5; // 한 기기로 한 과목에 올릴 수 있는 이름 수 (친구 대신 올려 주는 정도만)

export class PlanError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export async function listCoursePlans(deviceId: string): Promise<CoursePlan[]> {
  await initCommunityDb();
  const r = await getDb().execute('SELECT id, course_key, name, device_id FROM course_plans ORDER BY created_at ASC');
  return r.rows.map((row) => {
    const x = row as unknown as { id: string; course_key: string; name: string; device_id: string };
    return { id: x.id, key: x.course_key, name: x.name, mine: !!deviceId && x.device_id === deviceId };
  });
}

export async function addCoursePlan(rawKey: unknown, rawName: unknown, rawDevice: unknown): Promise<void> {
  const key = typeof rawKey === 'string' ? rawKey : '';
  const name = typeof rawName === 'string' ? rawName.trim().replace(/\s+/g, ' ') : '';
  const device = typeof rawDevice === 'string' ? rawDevice : '';
  if (!VALID_COURSE_KEYS.has(key)) throw new PlanError('없는 과목이에요.', 404);
  if (!name) throw new PlanError('이름을 입력하세요.');
  if ([...name].length > PLAN_NAME_LIMIT) throw new PlanError(`이름은 ${PLAN_NAME_LIMIT}자까지 쓸 수 있어요.`);
  if (!device || device.length > 64) throw new PlanError('기기 정보를 읽지 못했어요. 새로고침 후 다시 시도해 주세요.');

  await initCommunityDb();
  const db = getDb();
  const dup = await db.execute({ sql: 'SELECT 1 FROM course_plans WHERE course_key = ? AND LOWER(name) = LOWER(?)', args: [key, name] });
  if (dup.rows.length) throw new PlanError('이미 올린 이름이에요.', 409);
  const mine = await db.execute({ sql: 'SELECT COUNT(*) AS n FROM course_plans WHERE course_key = ? AND device_id = ?', args: [key, device] });
  if (Number((mine.rows[0] as unknown as { n: number }).n) >= MAX_PER_DEVICE) throw new PlanError(`한 기기에서는 한 과목에 ${MAX_PER_DEVICE}명까지 올릴 수 있어요.`, 429);

  await db.execute({
    sql: 'INSERT INTO course_plans (id, course_key, name, device_id, created_at) VALUES (?, ?, ?, ?, ?)',
    args: [crypto.randomUUID(), key, name, device, new Date().toISOString()],
  });
}

// 본인 기기(또는 운영자)만 취소
export async function removeCoursePlan(id: string, deviceId: string, admin: boolean): Promise<boolean> {
  await initCommunityDb();
  const db = getDb();
  const r = admin
    ? await db.execute({ sql: 'DELETE FROM course_plans WHERE id = ?', args: [id] })
    : await db.execute({ sql: 'DELETE FROM course_plans WHERE id = ? AND device_id = ?', args: [id, deviceId || '-'] });
  return r.rowsAffected > 0;
}
