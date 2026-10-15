import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { validateAdminPassword } from '@/lib/auth';

interface Session {
  current_round_number: number;
}

// 이전 차수로 돌아가기. 현재 차수가 비어 있으면(출석·총액 없음) 삭제하고,
// 기록이 있으면 남겨 두어 다음 차수로 넘어갈 때 다시 활성화된다.
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    await initDb();
    const { sessionId } = params;
    const adminPassword = request.headers.get('x-admin-password');

    if (!adminPassword) {
      return NextResponse.json({ error: 'Admin password required' }, { status: 401 });
    }

    if (!(await validateAdminPassword(sessionId, adminPassword))) {
      return NextResponse.json({ error: 'Invalid admin password' }, { status: 401 });
    }

    const db = getDb();

    const sessionResult = await db.execute({
      sql: 'SELECT current_round_number FROM sessions WHERE id = ?',
      args: [sessionId],
    });

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { current_round_number: current } = sessionResult.rows[0] as unknown as Session;

    if (current <= 1) {
      return NextResponse.json({ error: '1차보다 이전으로는 돌아갈 수 없어요.' }, { status: 400 });
    }

    const roundResult = await db.execute({
      sql: `
        SELECT r.id, r.total_amount, COUNT(c.id) AS checkin_count
        FROM rounds r
        LEFT JOIN checkins c ON c.round_id = r.id
        WHERE r.session_id = ? AND r.round_number = ?
        GROUP BY r.id
      `,
      args: [sessionId, current],
    });

    let removed = false;
    if (roundResult.rows.length > 0) {
      const round = roundResult.rows[0] as unknown as { id: string; total_amount: number; checkin_count: number };
      if (Number(round.checkin_count) === 0 && round.total_amount === 0) {
        await db.execute({ sql: 'DELETE FROM rounds WHERE id = ?', args: [round.id] });
        removed = true;
      }
    }

    await db.execute({
      sql: 'UPDATE sessions SET current_round_number = ? WHERE id = ?',
      args: [current - 1, sessionId],
    });

    return NextResponse.json({ roundNumber: current - 1, removedEmptyRound: removed });
  } catch (error) {
    console.error('POST /api/sessions/[sessionId]/rounds/previous error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
