// 날짜 + 관리자 비밀번호로 진행 중인 세션 찾기 (홈의 "정산 중인 출석 불러오기").
// 맞는 세션이 여러 개면 모두 돌려주고 화면에서 고르게 한다
import { NextRequest, NextResponse } from 'next/server';
import { initDb } from '@/lib/db';
import { findSessionsByDateAndPassword } from '@/lib/sessionLookup';

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const body = await request.json();
    const { date, adminPassword } = body as { date?: unknown; adminPassword?: unknown };

    if (typeof date !== 'string' || typeof adminPassword !== 'string' || !date || !adminPassword) {
      return NextResponse.json({ error: 'date and adminPassword are required' }, { status: 400 });
    }

    const sessions = await findSessionsByDateAndPassword(date, adminPassword);
    if (sessions.length > 0) {
      return NextResponse.json({ sessions });
    }

    // 날짜가 틀렸는지 비밀번호가 틀렸는지 구분하지 않음
    return NextResponse.json(
      { error: '해당 날짜에 이 비밀번호로 만든 정산을 찾지 못했어요.', sessions: [] },
      { status: 404 }
    );
  } catch (error) {
    console.error('POST /api/sessions/find error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
