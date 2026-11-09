// 운영자: 회기분석(세션) 통째로 삭제 - 테스트로 만든 기록 정리용
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { deleteSession } from '@/lib/history';

export async function DELETE(_request: Request, { params }: { params: { sessionId: string } }) {
  if (!isAdmin()) {
    return NextResponse.json({ error: '운영자 로그인이 필요해요.' }, { status: 401 });
  }
  try {
    const deleted = await deleteSession(params.sessionId);
    if (!deleted) return NextResponse.json({ error: '이미 지워졌거나 없는 기록이에요.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/history/sessions/[sessionId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
