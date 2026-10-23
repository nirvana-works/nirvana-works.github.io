import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { validateAdminPassword, generateCheckinId } from '@/lib/auth';

// 관리자가 QR을 찍지 못한 참가자를 직접 출석 처리 (진행 중이 아닌 지난 차수에도 가능)
export async function POST(
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
    const { name } = body as { name?: unknown };
    const trimmed = typeof name === 'string' ? name.trim() : '';

    if (!trimmed) {
      return NextResponse.json({ error: '이름을 입력하세요.' }, { status: 400 });
    }

    const db = getDb();

    const roundResult = await db.execute({
      sql: 'SELECT id FROM rounds WHERE id = ? AND session_id = ?',
      args: [roundId, sessionId],
    });

    if (roundResult.rows.length === 0) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    const checkinId = generateCheckinId();
    const checkedInAt = new Date().toISOString();

    try {
      await db.execute({
        sql: 'INSERT INTO checkins (id, round_id, name, checked_in_at) VALUES (?, ?, ?, ?)',
        args: [checkinId, roundId, trimmed, checkedInAt],
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
        return NextResponse.json(
          { error: `이 차수에 이미 "${trimmed}" 이름이 있어요.` },
          { status: 409 }
        );
      }
      throw err;
    }

    return NextResponse.json({ id: checkinId, name: trimmed, checkedInAt }, { status: 201 });
  } catch (error) {
    console.error('POST /api/sessions/[sessionId]/rounds/[roundId]/checkins error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
