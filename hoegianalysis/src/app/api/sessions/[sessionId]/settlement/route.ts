import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { validateAdminPassword } from '@/lib/auth';
import { computeSettlement } from '@/lib/settlementData';

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

    if (!(await validateAdminPassword(sessionId, adminPassword))) {
      return NextResponse.json({ error: 'Invalid admin password' }, { status: 401 });
    }

    const db = getDb();

    const sessionResult = await db.execute({
      sql: 'SELECT id FROM sessions WHERE id = ?',
      args: [sessionId],
    });

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(await computeSettlement(sessionId));
  } catch (error) {
    console.error('GET /api/sessions/[sessionId]/settlement error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
