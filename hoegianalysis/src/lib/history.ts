import { getDb, initDb } from './db';

// 지금까지 열린 모든 회기분석(세션)과 차수별 출석자. 금액은 읽지 않는다.
export interface HistoryCheckin {
  id: string;
  name: string;
  checked_in_at: string;
}

export interface HistoryRound {
  id: string;
  round_number: number;
  checkins: HistoryCheckin[];
}

export interface HistorySession {
  id: string;
  date: string;
  created_at: string;
  rounds: HistoryRound[];
}

export async function listHistory(): Promise<HistorySession[]> {
  await initDb();
  const db = getDb();
  const [sessions, rounds, checkins] = await Promise.all([
    db.execute('SELECT id, date, created_at FROM sessions ORDER BY date DESC, created_at DESC'),
    db.execute('SELECT id, session_id, round_number FROM rounds ORDER BY round_number'),
    db.execute('SELECT id, round_id, name, checked_in_at FROM checkins ORDER BY checked_in_at'),
  ]);

  const checkinsByRound = new Map<string, HistoryCheckin[]>();
  for (const row of checkins.rows as unknown as (HistoryCheckin & { round_id: string })[]) {
    const list = checkinsByRound.get(row.round_id) ?? [];
    list.push({ id: row.id, name: row.name, checked_in_at: row.checked_in_at });
    checkinsByRound.set(row.round_id, list);
  }

  const roundsBySession = new Map<string, HistoryRound[]>();
  for (const row of rounds.rows as unknown as { id: string; session_id: string; round_number: number }[]) {
    const list = roundsBySession.get(row.session_id) ?? [];
    list.push({ id: row.id, round_number: Number(row.round_number), checkins: checkinsByRound.get(row.id) ?? [] });
    roundsBySession.set(row.session_id, list);
  }

  return (sessions.rows as unknown as Omit<HistorySession, 'rounds'>[]).map((s) => ({
    id: s.id,
    date: s.date,
    created_at: s.created_at,
    rounds: roundsBySession.get(s.id) ?? [],
  }));
}

// 세션 하나를 통째로 지운다 (출석 → 차수 → 세션 순서)
export async function deleteSession(sessionId: string): Promise<boolean> {
  await initDb();
  const db = getDb();
  const results = await db.batch(
    [
      { sql: 'DELETE FROM checkins WHERE round_id IN (SELECT id FROM rounds WHERE session_id = ?)', args: [sessionId] },
      { sql: 'DELETE FROM rounds WHERE session_id = ?', args: [sessionId] },
      { sql: 'DELETE FROM sessions WHERE id = ?', args: [sessionId] },
    ],
    'write'
  );
  return results[2].rowsAffected > 0;
}

export async function deleteCheckin(checkinId: string): Promise<boolean> {
  await initDb();
  const result = await getDb().execute({ sql: 'DELETE FROM checkins WHERE id = ?', args: [checkinId] });
  return result.rowsAffected > 0;
}
