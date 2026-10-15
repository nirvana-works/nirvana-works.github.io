import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { validateAdminPassword } from '@/lib/auth';

export async function DELETE(
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

    const db = getDb();

    const roundResult = await db.execute({
      sql: 'SELECT id FROM rounds WHERE id = ? AND session_id = ?',
      args: [roundId, sessionId],
    });

    if (roundResult.rows.length === 0) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    await db.execute({
      sql: 'DELETE FROM checkins WHERE round_id = ?',
      args: [roundId],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/sessions/[sessionId]/rounds/[roundId]/reset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
