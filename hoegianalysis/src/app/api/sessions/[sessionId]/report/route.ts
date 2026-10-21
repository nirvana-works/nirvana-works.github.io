// 참가자용 성적표 - 비밀번호 불필요, 입력한 이름의 출석·분담금·학점을 반환
import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { computeSettlement } from '@/lib/settlementData';
import { gradeFor, normalizeName } from '@/lib/settlement';

interface Session {
  date: string;
  account_number: string | null;
  account_holder: string | null;
}

// 오타 한 글자 정도는 비슷한 이름으로 추천하기 위한 편집 거리
function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    await initDb();
    const { sessionId } = params;
    const query = normalizeName(request.nextUrl.searchParams.get('name') ?? '');

    if (!query) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const db = getDb();
    const sessionResult = await db.execute({
      sql: 'SELECT date, account_number, account_holder FROM sessions WHERE id = ?',
      args: [sessionId],
    });

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessionResult.rows[0] as unknown as Session;
    const { participants, rounds } = await computeSettlement(sessionId);

    // 띄어쓰기만 다르게 출석한 경우(예: "김철수", "김 철수")는 같은 사람으로 합침
    const matches = participants.filter((p) => normalizeName(p.name) === query);

    if (matches.length === 0) {
      const suggestions = participants
        .map((p) => p.name)
        .filter((name) => {
          const n = normalizeName(name);
          return n.includes(query) || query.includes(n) || editDistance(n, query) <= 1;
        });
      return NextResponse.json({ found: false, date: session.date, suggestions });
    }

    // 아무도 출석하지 않은 차수(실수로 시작한 차수 등)는 학점 계산에서 제외
    const heldRounds = rounds.filter((r) => r.count > 0);

    const roundRows = heldRounds.map((r) => {
      const amounts = matches
        .map((m) => m.rounds[r.round_number])
        .filter((a): a is number => a !== null);
      const adjustment = matches.reduce((sum, m) => sum + (m.adjustments[r.round_number] ?? 0), 0);
      return {
        round_number: r.round_number,
        attended: amounts.length > 0,
        amount: amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) : null,
        adjustment,
        total_amount: r.total_amount,
        count: r.count,
      };
    });

    const attended = roundRows.filter((r) => r.attended).length;

    return NextResponse.json({
      found: true,
      name: matches[0].name,
      date: session.date,
      grade: gradeFor(heldRounds.length - attended),
      attended,
      totalRounds: heldRounds.length,
      rounds: roundRows,
      total: matches.reduce((sum, m) => sum + m.total, 0),
      account: {
        number: session.account_number,
        holder: session.account_holder,
      },
    });
  } catch (error) {
    console.error('GET /api/sessions/[sessionId]/report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
