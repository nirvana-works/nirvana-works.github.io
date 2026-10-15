import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { validateAdminPassword } from '@/lib/auth';

interface Session {
  id: string;
  date: string;
  current_round_number: number;
  created_at: string;
  account_number: string | null;
  account_holder: string | null;
}

interface Round {
  id: string;
  session_id: string;
  round_number: number;
  started_at: string;
  total_amount: number;
}

interface CheckIn {
  id: string;
  round_id: string;
  name: string;
  checked_in_at: string;
}

export async function GET(
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

    const db = getDb();

    const sessionResult = await db.execute({
      sql: 'SELECT id, date, current_round_number, created_at, account_number, account_holder FROM sessions WHERE id = ?',
      args: [sessionId],
    });

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (!(await validateAdminPassword(sessionId, adminPassword))) {
      return NextResponse.json({ error: 'Invalid admin password' }, { status: 401 });
    }

    const session = sessionResult.rows[0] as unknown as Session;

    const roundsResult = await db.execute({
      sql: 'SELECT * FROM rounds WHERE session_id = ? ORDER BY round_number ASC',
      args: [sessionId],
    });

    const rounds = roundsResult.rows as unknown as Round[];

    const roundsWithCheckins = await Promise.all(
      rounds.map(async (round) => {
        const checkinsResult = await db.execute({
          sql: 'SELECT * FROM checkins WHERE round_id = ? ORDER BY checked_in_at ASC',
          args: [round.id],
        });
        const checkins = checkinsResult.rows as unknown as CheckIn[];
        return { ...round, checkins };
      })
    );

    return NextResponse.json({ ...session, rounds: roundsWithCheckins });
  } catch (error) {
    console.error('GET /api/sessions/[sessionId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 엔빵 계좌 정보 저장
export async function PATCH(
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

    const body = await request.json();
    const { accountNumber, accountHolder } = body as { accountNumber?: unknown; accountHolder?: unknown };

    if (typeof accountNumber !== 'string' || typeof accountHolder !== 'string') {
      return NextResponse.json({ error: 'accountNumber and accountHolder must be strings' }, { status: 400 });
    }

    const db = getDb();
    await db.execute({
      sql: 'UPDATE sessions SET account_number = ?, account_holder = ? WHERE id = ?',
      args: [accountNumber.trim() || null, accountHolder.trim() || null, sessionId],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/sessions/[sessionId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
