import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { validateAdminPassword } from '@/lib/auth';

// 차수 안의 사람별 조정 저장. body: { adjustments: { [checkinId]: { adjustment, fixed } } }
// fixed가 있으면 그 금액을 그대로 내고(0이면 엔빵 제외), 없으면 ± 조정 금액 반영
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

    // 값은 { adjustment, fixed } 형태. 예전 형식(숫자 = 조정 금액)도 받음
    const parsed: { id: string; adjustment: number; fixed: number | null }[] = [];
    for (const [id, value] of Object.entries(adjustments)) {
      const entry = typeof value === 'number' ? { adjustment: value, fixed: null } : (value as { adjustment?: unknown; fixed?: unknown });
      const adjustment = entry?.adjustment ?? 0;
      const fixed = entry?.fixed ?? null;
      if (typeof adjustment !== 'number' || !Number.isInteger(adjustment)) {
        return NextResponse.json({ error: '조정 금액은 정수여야 해요.' }, { status: 400 });
      }
      if (fixed !== null && (typeof fixed !== 'number' || !Number.isInteger(fixed) || fixed < 0)) {
        return NextResponse.json({ error: '지정 금액은 0 이상의 정수여야 해요.' }, { status: 400 });
      }
      parsed.push({ id, adjustment, fixed: fixed as number | null });
    }

    const db = getDb();

    const roundResult = await db.execute({
      sql: 'SELECT id FROM rounds WHERE id = ? AND session_id = ?',
      args: [roundId, sessionId],
    });

    if (roundResult.rows.length === 0) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    const checkinsResult = await db.execute({
      sql: 'SELECT id FROM checkins WHERE round_id = ?',
      args: [roundId],
    });
    const checkinIds = new Set((checkinsResult.rows as unknown as { id: string }[]).map((c) => c.id));

    for (const { id } of parsed) {
      if (!checkinIds.has(id)) {
        return NextResponse.json({ error: '이 차수의 출석자가 아니에요.' }, { status: 400 });
      }
    }

    // 합계가 총액과 맞지 않아도 저장은 허용 (화면에서 "다른 인원에서 조정" 안내)
    await db.batch(
      parsed.map(({ id, adjustment, fixed }) => ({
        sql: 'UPDATE checkins SET adjustment = ?, fixed_amount = ? WHERE id = ? AND round_id = ?',
        args: [fixed === null ? adjustment : 0, fixed, id, roundId],
      })),
      'write'
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/sessions/[sessionId]/rounds/[roundId]/adjustments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
