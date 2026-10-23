import { getDb } from './db';
import { validateAdminPassword } from './auth';

export interface SessionMatch {
  id: string;
  created_at: string;
  current_round_number: number;
  round_count: number;
  checkin_count: number;
}

// 날짜 + 관리자 비밀번호가 맞는 세션 전부 (최근에 만든 순).
// 같은 날짜·비밀번호로 세션을 여러 번 만들 수 있어서 하나만 고르지 않고 모두 돌려준다.
export async function findSessionsByDateAndPassword(date: string, password: string): Promise<SessionMatch[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `
      SELECT s.id, s.created_at, s.current_round_number,
        (SELECT COUNT(*) FROM rounds r WHERE r.session_id = s.id) AS round_count,
        (SELECT COUNT(*) FROM checkins c JOIN rounds r ON c.round_id = r.id WHERE r.session_id = s.id) AS checkin_count
      FROM sessions s
      WHERE s.date = ?
      ORDER BY s.created_at DESC
    `,
    args: [date],
  });

  const matches: SessionMatch[] = [];
  for (const row of result.rows as unknown as SessionMatch[]) {
    if (await validateAdminPassword(row.id, password)) {
      matches.push({
        id: row.id,
        created_at: row.created_at,
        current_round_number: Number(row.current_round_number),
        round_count: Number(row.round_count),
        checkin_count: Number(row.checkin_count),
      });
    }
  }
  return matches;
}
