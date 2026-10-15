// 참가자용 공개 엔드포인트 - 비밀번호 불필요, 현재 차수 정보만 반환
import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';

interface Session {
  id: string;
  date: string;
  current_round_number: number;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    await initDb();
    const { sessionId } = params;
    const db = getDb();

    const result = await db.execute({
      sql: 'SELECT id, date, current_round_number FROM sessions WHERE id = ?',
      args: [sessionId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = result.rows[0] as unknown as Session;
    return NextResponse.json(session);
  } catch (error) {
    console.error('GET /api/sessions/[sessionId]/public error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
