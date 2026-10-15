import { getDb } from './db';

export async function validateAdminPassword(sessionId: string, password: string): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT admin_password FROM sessions WHERE id = ?',
    args: [sessionId],
  });
  if (result.rows.length === 0) return false;
  const row = result.rows[0] as unknown as { admin_password: string };
  return row.admin_password === password;
}

export function generateSessionId(): string {
  return crypto.randomUUID();
}

export function generateRoundId(): string {
  return crypto.randomUUID();
}

export function generateCheckinId(): string {
  return crypto.randomUUID();
}
