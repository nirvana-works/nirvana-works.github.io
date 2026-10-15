import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { validateAdminPassword } from '@/lib/auth';

// 차수 안의 사람별 조정 금액 저장. body: { adjustments: { [checkinId]: number } }
export async function PUT(
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
    const { adjustments } = body as { adjustments?: Record<string, unknown> };

    if (!adjustments || typeof adjustments !== 'object') {
      return NextResponse.json({ error: 'adjustments is required' }, { status: 400 });
    }
    for (const value of Object.values(adjustments)) {
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        return NextResponse.json({ error: '조정 금액은 정수여야 해요.' }, { status: 400 });
      }
    }

    const db = getDb();

    const roundResult = await db.execute({
      sql: 'SELECT total_amount FROM rounds WHERE id = ? AND session_id = ?',
      args: [roundId, sessionId],
    });

    if (roundResult.rows.length === 0) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    const { total_amount: total } = roundResult.rows[0] as unknown as { total_amount: number };

    const checkinsResult = await db.execute({
      sql: 'SELECT id, adjustment FROM checkins WHERE round_id = ?',
      args: [roundId],
    });
    const checkins = checkinsResult.rows as unknown as { id: string; adjustment: number }[];
    const checkinIds = new Set(checkins.map((c) => c.id));

    for (const id of Object.keys(adjustments)) {
      if (!checkinIds.has(id)) {
        return NextResponse.json({ error: '이 차수의 출석자가 아니에요.' }, { status: 400 });
      }
    }

    // 조정 후 나머지 사람들이 낼 금액이 음수가 되지 않도록
    const nextSum = checkins.reduce(
      (sum, c) => sum + ((adjustments[c.id] as number | undefined) ?? c.adjustment),
      0
    );
    if (nextSum > total) {
      return NextResponse.json(
        { error: '조정 금액 합계가 총액보다 클 수 없어요.' },
        { status: 400 }
      );
    }

    await db.batch(
      Object.entries(adjustments).map(([id, amount]) => ({
        sql: 'UPDATE checkins SET adjustment = ? WHERE id = ? AND round_id = ?',
        args: [amount as number, id, roundId],
      })),
      'write'
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/sessions/[sessionId]/rounds/[roundId]/adjustments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
