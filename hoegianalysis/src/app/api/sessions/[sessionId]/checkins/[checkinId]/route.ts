import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { validateAdminPassword } from '@/lib/auth';

// 관리자가 출석자 이름 수정 (차수마다 이름을 다르게 쓴 경우 통일하기 위해)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { sessionId: string; checkinId: string } }
) {
  try {
    await initDb();
    const { sessionId, checkinId } = params;
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

    // 이 세션의 출석 기록인지 확인
    const checkinResult = await db.execute({
      sql: `
        SELECT c.id, c.round_id
        FROM checkins c
        JOIN rounds r ON c.round_id = r.id
        WHERE c.id = ? AND r.session_id = ?
      `,
      args: [checkinId, sessionId],
    });

    if (checkinResult.rows.length === 0) {
      return NextResponse.json({ error: 'Check-in not found' }, { status: 404 });
    }

    try {
      await db.execute({
        sql: 'UPDATE checkins SET name = ? WHERE id = ?',
        args: [trimmed, checkinId],
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

    return NextResponse.json({ success: true, name: trimmed });
  } catch (error) {
    console.error('PATCH /api/sessions/[sessionId]/checkins/[checkinId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
