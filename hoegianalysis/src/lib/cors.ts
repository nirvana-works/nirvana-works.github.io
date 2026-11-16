import { NextResponse } from 'next/server';

// 다른 사이트(예: 개설과목 단독 HTML을 올린 곳)에서 과목 리뷰·수강 예정 API를 부를 수 있게 한다.
// 쿠키는 허용하지 않는다(credentials 없음). 그래서 운영자 삭제 권한은 다른 사이트로 넘어가지 않는다
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export function withCors<T extends Response>(res: T): T {
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
  return res;
}

export const json = (body: unknown, init?: ResponseInit) => withCors(NextResponse.json(body, init));

// 브라우저가 본 요청 전에 보내는 확인 요청(OPTIONS)에 답한다
export const preflight = () => withCors(new NextResponse(null, { status: 204 }));
