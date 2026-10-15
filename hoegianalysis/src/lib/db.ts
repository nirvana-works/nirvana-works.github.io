import { createClient, type Client } from '@libsql/client';
import path from 'path';

let client: Client | null = null;

export function getDb(): Client {
  if (client) return client;

  const dbPath = path.join(process.cwd(), 'hoesik.db');
  client = createClient({ url: `file:${dbPath}` });
  return client;
}

export async function initDb(): Promise<void> {
  const db = getDb();
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      admin_password TEXT NOT NULL,
      current_round_number INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rounds (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      round_number INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      total_amount INTEGER DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS checkins (
      id TEXT PRIMARY KEY,
      round_id TEXT NOT NULL,
      name TEXT NOT NULL,
      checked_in_at TEXT NOT NULL,
      UNIQUE(round_id, name),
      FOREIGN KEY (round_id) REFERENCES rounds(id)
    );
  `);
}

export default getDb;
