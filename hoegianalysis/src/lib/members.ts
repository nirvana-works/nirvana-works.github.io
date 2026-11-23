import { createHash, randomBytes, randomInt } from 'crypto';
import { cookies } from 'next/headers';
import { hashPassword, verifyPassword } from './auth';
import { initCommunityDb } from './communityDb';
import { getDb } from './db';
import type { MemberStatus, MemberSummary } from './memberTypes';

// 회원 가입·로그인. 가입은 카이스트 메일로 하고, 운영자가 승인해야 로그인할 수 있다.
// 로그인하면 임의 토큰을 쿠키(hl_member)에 두고 DB엔 그 해시만 저장한다.
// 로그인 유지는 DB의 만료 시각이 정한다: 30일, 들어올 때마다(하루 한 번) 다시 30일로 늘어난다.

export const MEMBER_COOKIE = 'hl_member';
const SESSION_DAYS = 30;
const DAY = 86_400_000;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400; // 쿠키는 길게 두고, 실제 만료는 DB가 판단한다
const MAX_FAILED = 5; // 비밀번호를 연속으로 이만큼 틀리면
const LOCK_MINUTES = 10; // 이만큼 잠근다

export const MEMBER_LIMITS = { name: 20, cohort: 10, nickname: 12, message: 200, passwordMin: 8, passwordMax: 72 } as const;
const EMAIL_RE = /^[a-z0-9._%+-]+@kaist\.ac\.kr$/;

export type Member = { id: string; email: string; name: string; cohort: string; nickname: string };

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const len = (s: string) => [...s].length;
const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');
export const normalizeEmail = (v: unknown) => str(v).toLowerCase();

// ---------- 가입 ----------

type SignupInput = { email: string; name: string; cohort: string; nickname: string; message: string; password: string };

export function validateSignup(body: unknown): { ok: true; value: SignupInput } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const email = normalizeEmail(b.email);
  const name = str(b.name);
  const cohort = str(b.cohort);
  const nickname = str(b.nickname);
  const message = str(b.message);
  const password = typeof b.password === 'string' ? b.password : '';

  if (!EMAIL_RE.test(email)) return { ok: false, error: '카이스트 메일(@kaist.ac.kr)로 가입할 수 있어요.' };
  if (!name) return { ok: false, error: '이름을 입력하세요.' };
  if (len(name) > MEMBER_LIMITS.name) return { ok: false, error: `이름은 ${MEMBER_LIMITS.name}자까지예요.` };
  if (!cohort) return { ok: false, error: '기수를 입력하세요.' };
  if (len(cohort) > MEMBER_LIMITS.cohort) return { ok: false, error: `기수는 ${MEMBER_LIMITS.cohort}자까지예요.` };
  if (!nickname) return { ok: false, error: '별명을 입력하세요.' };
  if (len(nickname) > MEMBER_LIMITS.nickname) return { ok: false, error: `별명은 ${MEMBER_LIMITS.nickname}자까지예요.` };
  if (len(message) > MEMBER_LIMITS.message) return { ok: false, error: `교수님께 한마디는 ${MEMBER_LIMITS.message}자까지예요.` };
  const pw = validatePassword(password);
  if (pw) return { ok: false, error: pw };
  return { ok: true, value: { email, name, cohort, nickname, message, password } };
}

export function validatePassword(password: string): string | null {
  if (password.length < MEMBER_LIMITS.passwordMin) return `비밀번호는 ${MEMBER_LIMITS.passwordMin}자 이상으로 정해 주세요.`;
  if (password.length > MEMBER_LIMITS.passwordMax) return `비밀번호는 ${MEMBER_LIMITS.passwordMax}자까지예요.`;
  return null;
}

export async function createMember(v: SignupInput): Promise<{ ok: true } | { ok: false; error: string }> {
  await initCommunityDb();
  const db = getDb();
  const existing = await db.execute({ sql: 'SELECT status FROM members WHERE email = ?', args: [v.email] });
  const status = existing.rows[0]?.status as MemberStatus | undefined;
  if (status === 'pending') return { ok: false, error: '이미 가입 신청한 메일이에요. 운영자 승인을 기다려 주세요.' };
  if (status === 'active') return { ok: false, error: '이미 가입된 메일이에요. 로그인해 주세요.' };
  if (status === 'suspended') return { ok: false, error: '이용이 제한된 메일이에요. 운영자에게 문의해 주세요.' };

  const hash = await hashPassword(v.password);
  const now = new Date().toISOString();
  if (status === 'rejected') {
    // 거절된 메일은 다시 신청할 수 있다
    await db.execute({
      sql: `UPDATE members SET name = ?, cohort = ?, nickname = ?, message = ?, password_hash = ?, status = 'pending',
              failed_logins = 0, locked_until = NULL, created_at = ?, approved_at = NULL WHERE email = ?`,
      args: [v.name, v.cohort, v.nickname, v.message || null, hash, now, v.email],
    });
  } else {
    await db.execute({
      sql: `INSERT INTO members (id, email, name, cohort, nickname, message, password_hash, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      args: [crypto.randomUUID(), v.email, v.name, v.cohort, v.nickname, v.message || null, hash, now],
    });
  }
  return { ok: true };
}

// ---------- 로그인 ----------

type LoginResult = { ok: true; token: string } | { ok: false; error: string; status: number };

export async function login(emailInput: unknown, passwordInput: unknown): Promise<LoginResult> {
  const email = normalizeEmail(emailInput);
  const password = typeof passwordInput === 'string' ? passwordInput : '';
  const wrong = { ok: false as const, error: '메일 또는 비밀번호가 맞지 않아요.', status: 401 };
  if (!email || !password) return { ok: false, error: '메일과 비밀번호를 입력하세요.', status: 400 };

  await initCommunityDb();
  const db = getDb();
  const r = await db.execute({
    sql: 'SELECT id, password_hash, status, failed_logins, locked_until FROM members WHERE email = ?',
    args: [email],
  });
  const row = r.rows[0] as unknown as
    | { id: string; password_hash: string; status: MemberStatus; failed_logins: number; locked_until: number | null }
    | undefined;
  if (!row) return wrong;

  const now = Date.now();
  if (row.locked_until && row.locked_until > now) {
    const min = Math.ceil((row.locked_until - now) / 60_000);
    return { ok: false, error: `비밀번호를 여러 번 틀렸어요. ${min}분 뒤에 다시 시도해 주세요.`, status: 429 };
  }

  if (!(await verifyPassword(password, row.password_hash))) {
    const failed = row.failed_logins + 1;
    const lock = failed >= MAX_FAILED ? now + LOCK_MINUTES * 60_000 : null;
    await db.execute({
      sql: 'UPDATE members SET failed_logins = ?, locked_until = ? WHERE id = ?',
      args: [lock ? 0 : failed, lock, row.id],
    });
    return wrong;
  }

  await db.execute({ sql: 'UPDATE members SET failed_logins = 0, locked_until = NULL WHERE id = ?', args: [row.id] });
  // 비밀번호가 맞은 사람에게만 상태를 알려 준다
  if (row.status === 'pending') return { ok: false, error: '아직 승인 대기 중이에요. 운영자가 승인하면 로그인할 수 있어요.', status: 403 };
  if (row.status === 'rejected') return { ok: false, error: '가입이 승인되지 않았어요. 다시 신청하거나 운영자에게 문의해 주세요.', status: 403 };
  if (row.status === 'suspended') return { ok: false, error: '이용이 제한된 계정이에요. 운영자에게 문의해 주세요.', status: 403 };

  const token = randomBytes(32).toString('base64url');
  await db.batch(
    [
      {
        sql: 'INSERT INTO login_sessions (token_hash, member_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)',
        args: [hashToken(token), row.id, now, now + SESSION_DAYS * DAY, now],
      },
      { sql: 'UPDATE members SET last_login_at = ? WHERE id = ?', args: [new Date(now).toISOString(), row.id] },
      { sql: 'DELETE FROM login_sessions WHERE expires_at < ?', args: [now] }, // 지난 로그인 정리
    ],
    'write',
  );
  return { ok: true, token };
}

export const memberCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: COOKIE_MAX_AGE,
};

export async function logout(token: string | undefined): Promise<void> {
  if (!token) return;
  await initCommunityDb();
  await getDb().execute({ sql: 'DELETE FROM login_sessions WHERE token_hash = ?', args: [hashToken(token)] });
}

// 서버 컴포넌트·API에서 지금 요청한 사람이 로그인한 회원인지. 아니면 null
export async function getMember(): Promise<Member | null> {
  const token = cookies().get(MEMBER_COOKIE)?.value;
  if (!token) return null;
  await initCommunityDb();
  const db = getDb();
  const r = await db.execute({
    sql: `SELECT s.token_hash, s.expires_at, s.last_seen_at, m.id, m.email, m.name, m.cohort, m.nickname, m.status
          FROM login_sessions s JOIN members m ON m.id = s.member_id WHERE s.token_hash = ?`,
    args: [hashToken(token)],
  });
  const row = r.rows[0] as unknown as
    | (Member & { token_hash: string; expires_at: number; last_seen_at: number; status: MemberStatus })
    | undefined;
  const now = Date.now();
  if (!row || row.expires_at < now || row.status !== 'active') return null;

  // 하루에 한 번만 만료를 다시 30일 뒤로 미룬다
  if (now - row.last_seen_at > DAY) {
    await db.execute({
      sql: 'UPDATE login_sessions SET last_seen_at = ?, expires_at = ? WHERE token_hash = ?',
      args: [now, now + SESSION_DAYS * DAY, row.token_hash],
    });
  }
  return { id: row.id, email: row.email, name: row.name, cohort: row.cohort, nickname: row.nickname };
}

// 본인이 비밀번호를 바꾸면 지금 기기만 남기고 다른 기기는 로그아웃
export async function changePassword(
  member: Member,
  current: unknown,
  next: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cur = typeof current === 'string' ? current : '';
  const nxt = typeof next === 'string' ? next : '';
  const err = validatePassword(nxt);
  if (err) return { ok: false, error: err };
  const db = getDb();
  const r = await db.execute({ sql: 'SELECT password_hash FROM members WHERE id = ?', args: [member.id] });
  const stored = r.rows[0]?.password_hash as string | undefined;
  if (!stored || !(await verifyPassword(cur, stored))) return { ok: false, error: '지금 비밀번호가 맞지 않아요.' };

  const token = cookies().get(MEMBER_COOKIE)?.value ?? '';
  await db.batch(
    [
      { sql: 'UPDATE members SET password_hash = ? WHERE id = ?', args: [await hashPassword(nxt), member.id] },
      { sql: 'DELETE FROM login_sessions WHERE member_id = ? AND token_hash != ?', args: [member.id, hashToken(token)] },
    ],
    'write',
  );
  return { ok: true };
}

// ---------- 운영자 ----------

export async function listMembers(): Promise<MemberSummary[]> {
  await initCommunityDb();
  const r = await getDb().execute(
    `SELECT id, email, name, cohort, nickname, message, status, created_at, approved_at, last_login_at
     FROM members ORDER BY created_at DESC`,
  );
  return r.rows.map((row) => ({ ...(row as unknown as MemberSummary) }));
}

export type AdminAction = 'approve' | 'reject' | 'suspend' | 'restore' | 'reset' | 'delete';

// 운영자가 회원 상태를 바꾼다. reset이면 임시 비밀번호를 돌려준다 (운영자가 본인에게 직접 전달)
export async function adminUpdateMember(
  id: string,
  action: AdminAction,
): Promise<{ ok: true; tempPassword?: string } | { ok: false; error: string }> {
  await initCommunityDb();
  const db = getDb();
  const found = await db.execute({ sql: 'SELECT id FROM members WHERE id = ?', args: [id] });
  if (!found.rows[0]) return { ok: false, error: '없는 회원이에요.' };
  const now = new Date().toISOString();
  const kickOut = { sql: 'DELETE FROM login_sessions WHERE member_id = ?', args: [id] };

  switch (action) {
    case 'approve':
    case 'restore':
      await db.execute({
        sql: "UPDATE members SET status = 'active', approved_at = COALESCE(approved_at, ?) WHERE id = ?",
        args: [now, id],
      });
      return { ok: true };
    case 'reject':
      await db.batch([{ sql: "UPDATE members SET status = 'rejected' WHERE id = ?", args: [id] }, kickOut], 'write');
      return { ok: true };
    case 'suspend':
      await db.batch([{ sql: "UPDATE members SET status = 'suspended' WHERE id = ?", args: [id] }, kickOut], 'write');
      return { ok: true };
    case 'reset': {
      const tempPassword = makeTempPassword();
      await db.batch(
        [
          {
            sql: 'UPDATE members SET password_hash = ?, failed_logins = 0, locked_until = NULL WHERE id = ?',
            args: [await hashPassword(tempPassword), id],
          },
          kickOut,
        ],
        'write',
      );
      return { ok: true, tempPassword };
    }
    case 'delete':
      await db.batch([kickOut, { sql: 'DELETE FROM members WHERE id = ?', args: [id] }], 'write');
      return { ok: true };
  }
}

// 헷갈리는 글자(0/O, 1/l/I)를 뺀 10자리 임시 비밀번호
function makeTempPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[randomInt(chars.length)]).join('');
}
