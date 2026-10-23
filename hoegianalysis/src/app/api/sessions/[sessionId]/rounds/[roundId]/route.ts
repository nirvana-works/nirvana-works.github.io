import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { validateAdminPassword } from '@/lib/auth';

interface Round {
  id: string;
  session_id: string;
  round_number: number;
  started_at: string;
  total_amount: number;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { sessionId: string; roundId: string } }
) {
  try {
    await initDb();
    const { sessionId, roundId } = params;
    const adminPassword = request.headers.get('x-admin-password');

    if (!adminPassword) {
      return NextResponse.json({ error: 'Admin password required' }, { status: 401 });
    }

    if (!(await validateAdminPassword(sessionId, adminPassword))) {
      return NextResponse.json({ error: 'Invalid admin password' }, { status: 401 });
    }

    const body = await request.json();
    const { totalAmount } = body as { totalAmount?: number };

    if (totalAmount === undefined || typeof totalAmount !== 'number' || totalAmount < 0) {
      return NextResponse.json({ error: 'totalAmount must be a non-negative number' }, { status: 400 });
    }

    const db = getDb();

    const roundResult = await db.execute({
      sql: 'SELECT * FROM rounds WHERE id = ? AND session_id = ?',
      args: [roundId, sessionId],
    });

    if (roundResult.rows.length === 0) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    const round = roundResult.rows[0] as unknown as Round;

    await db.execute({
      sql: 'UPDATE rounds SET total_amount = ? WHERE id = ?',
      args: [totalAmount, roundId],
    });

    return NextResponse.json({ ...round, total_amount: totalAmount });
  } catch (error) {
    console.error('PATCH /api/sessions/[sessionId]/rounds/[roundId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
