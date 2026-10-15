import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { getDb } from './db';

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEY_LENGTH = 32;
const PREFIX = 'scrypt$';

// 관리자 비밀번호는 "scrypt$<salt hex>$<hash hex>" 형식으로 저장
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `${PREFIX}${salt.toString('hex')}$${hash.toString('hex')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.slice(PREFIX.length).split('$');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

export async function validateAdminPassword(sessionId: string, password: string): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT admin_password FROM sessions WHERE id = ?',
    args: [sessionId],
  });
  if (result.rows.length === 0) return false;
  const stored = (result.rows[0] as unknown as { admin_password: string }).admin_password;

  if (stored.startsWith(PREFIX)) {
    return verifyPassword(password, stored);
  }

  // 암호화 도입 전에 만든 세션(평문 저장): 맞으면 이번에 해시로 바꿔 저장
  if (stored !== password) return false;
  await db.execute({
    sql: 'UPDATE sessions SET admin_password = ? WHERE id = ?',
    args: [await hashPassword(password), sessionId],
  });
  return true;
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
