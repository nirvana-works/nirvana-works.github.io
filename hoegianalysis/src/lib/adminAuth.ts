import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

// 커뮤니티 운영자 인증: 환경변수 ADMIN_PASSWORD 하나로 보호한다.
// 로그인하면 비밀번호에서 만든 서명값을 httpOnly 쿠키로 저장 (비밀번호를 바꾸면 기존 로그인은 풀림)
export const ADMIN_COOKIE = 'hl_admin';
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function tokenFor(password: string): Buffer {
  return createHmac('sha256', password).update('hoegilab-admin-v1').digest();
}

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function checkAdminPassword(input: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  return timingSafeEqual(tokenFor(input), tokenFor(password));
}

// 운영자로 쓸 회원 메일 (환경변수 ADMIN_EMAILS, 쉼표로 여러 개). 이 회원이 로그인하면 운영자 권한도 함께 켜진다
export function isAdminEmail(email: string): boolean {
  if (!process.env.ADMIN_PASSWORD) return false; // 운영자 쿠키가 이 비밀번호에서 만들어진다
  const list = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: ADMIN_COOKIE_MAX_AGE,
};

export function adminToken(): string {
  return tokenFor(process.env.ADMIN_PASSWORD ?? '').toString('hex');
}

// 서버 컴포넌트와 API 라우트에서 현재 요청이 운영자인지 확인
export function isAdmin(): boolean {
  const password = process.env.ADMIN_PASSWORD;
  const cookie = cookies().get(ADMIN_COOKIE)?.value;
  if (!password || !cookie) return false;
  const actual = Buffer.from(cookie, 'hex');
  const expected = tokenFor(password);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
