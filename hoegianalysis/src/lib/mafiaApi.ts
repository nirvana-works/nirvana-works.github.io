import { NextResponse } from 'next/server';
import { MafiaError } from './mafia';

// 마피아 API 공통: 오류를 화면에 그대로 보여줄 문구와 상태 코드로 바꾼다
export async function respond(fn: () => Promise<unknown>, status = 200) {
  try {
    const data = await fn();
    return NextResponse.json(data ?? { ok: true }, { status, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof MafiaError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('mafia api error:', error);
    return NextResponse.json({ error: '문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.' }, { status: 500 });
  }
}

export const tokenOf = (request: Request) => request.headers.get('x-mafia-token');
export const bodyOf = async (request: Request) => ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
