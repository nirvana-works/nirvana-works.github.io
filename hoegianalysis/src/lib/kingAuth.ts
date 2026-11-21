import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

// 킹메이커(비밀 페이지) 암호: 코드가 아니라 환경변수 KINGMAKER_PASSWORD 로만 받는다 (저장소가 공개라서)
// 로그인하면 암호에서 만든 서명값을 httpOnly 쿠키로 저장한다. 암호를 바꾸면 기존 로그인은 풀린다
export const KING_COOKIE = 'hl_king';
export const KING_COOKIE_MAX_AGE = 60 * 60 * 24 * 14;

function tokenFor(password: string): Buffer {
  return createHmac('sha256', password).update('hoegilab-kingmaker-v1').digest();
}

export function kingConfigured(): boolean {
  return Boolean(process.env.KINGMAKER_PASSWORD);
}

export function checkKingPassword(input: string): boolean {
  const password = process.env.KINGMAKER_PASSWORD;
  if (!password) return false;
  return timingSafeEqual(tokenFor(input), tokenFor(password));
}

export function kingToken(): string {
  return tokenFor(process.env.KINGMAKER_PASSWORD ?? '').toString('hex');
}

// 서버 컴포넌트와 API 라우트에서 지금 요청이 로그인한 사람인지 확인
export function isKing(): boolean {
  const password = process.env.KINGMAKER_PASSWORD;
  const cookie = cookies().get(KING_COOKIE)?.value;
  if (!password || !cookie) return false;
  const actual = Buffer.from(cookie, 'hex');
  const expected = tokenFor(password);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
