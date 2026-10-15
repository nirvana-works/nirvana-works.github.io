import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { generateCheckinId } from '@/lib/auth';

interface Session {
  id: string;
  current_round_number: number;
}

interface Round {
  id: string;
  round_number: number;
}

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const body = await request.json();
    const { sessionId, name } = body as { sessionId?: string; name?: string };

    if (!sessionId || !name || name.trim() === '') {
      return NextResponse.json(
        { error: 'sessionId and name are required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const db = getDb();

    const sessionResult = await db.execute({
      sql: 'SELECT id, current_round_number FROM sessions WHERE id = ?',
      args: [sessionId],
    });

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessionResult.rows[0] as unknown as Session;

    if (session.current_round_number === 0) {
      return NextResponse.json(
        { error: 'No active round. Ask the organizer to start a round.' },
        { status: 400 }
      );
    }

    const roundResult = await db.execute({
      sql: 'SELECT id, round_number FROM rounds WHERE session_id = ? AND round_number = ?',
      args: [sessionId, session.current_round_number],
    });

    if (roundResult.rows.length === 0) {
      return NextResponse.json({ error: 'Active round not found' }, { status: 404 });
    }

    const currentRound = roundResult.rows[0] as unknown as Round;
    const checkinId = generateCheckinId();
    const checkedInAt = new Date().toISOString();

    try {
      await db.execute({
        sql: 'INSERT INTO checkins (id, round_id, name, checked_in_at) VALUES (?, ?, ?, ?)',
        args: [checkinId, currentRound.id, trimmedName, checkedInAt],
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
        return NextResponse.json(
          { error: 'Already checked in', alreadyCheckedIn: true },
          { status: 409 }
        );
      }
      throw err;
    }

    return NextResponse.json({
      success: true,
      roundNumber: currentRound.round_number,
      name: trimmedName,
      checkedInAt,
    });
  } catch (error) {
    console.error('POST /api/checkin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
