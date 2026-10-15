import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { validateAdminPassword, generateRoundId } from '@/lib/auth';

interface Session {
  id: string;
  current_round_number: number;
}

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
      sql: 'SELECT id, current_round_number FROM sessions WHERE id = ?',
      args: [sessionId],
    });

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessionResult.rows[0] as unknown as Session;
    const newRoundNumber = session.current_round_number + 1;

    // 이전 차수로 돌아갔다가 다시 넘어오는 경우: 남아 있는 차수를 다시 활성화
    const existing = await db.execute({
      sql: 'SELECT id, started_at FROM rounds WHERE session_id = ? AND round_number = ?',
      args: [sessionId, newRoundNumber],
    });

    let roundId: string;
    let startedAt: string;
    let created = false;
    if (existing.rows.length > 0) {
      const row = existing.rows[0] as unknown as { id: string; started_at: string };
      roundId = row.id;
      startedAt = row.started_at;
    } else {
      roundId = generateRoundId();
      startedAt = new Date().toISOString();
      created = true;
      await db.execute({
        sql: 'INSERT INTO rounds (id, session_id, round_number, started_at, total_amount) VALUES (?, ?, ?, ?, 0)',
        args: [roundId, sessionId, newRoundNumber, startedAt],
      });
    }

    await db.execute({
      sql: 'UPDATE sessions SET current_round_number = ? WHERE id = ?',
      args: [newRoundNumber, sessionId],
    });

    return NextResponse.json(
      { id: roundId, sessionId, roundNumber: newRoundNumber, startedAt },
      { status: created ? 201 : 200 }
    );
  } catch (error) {
    console.error('POST /api/sessions/[sessionId]/rounds error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
