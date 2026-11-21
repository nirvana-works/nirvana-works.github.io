import { NextResponse } from 'next/server';
import { isKing } from './kingAuth';
import { KingError } from './kingmaker';

// 킹메이커 API 공통: 로그인 확인과 오류 문구 처리. 응답은 캐시하지 않는다
export async function king(fn: () => Promise<unknown>, status = 200) {
  if (!isKing()) return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  try {
    const data = await fn();
    return NextResponse.json(data ?? { ok: true }, { status, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof KingError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('kingmaker api error:', error);
    return NextResponse.json({ error: '문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.' }, { status: 500 });
  }
}

export const bodyOf = async (request: Request) => ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
