import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { validateAdminPassword } from '@/lib/auth';
import { splitAmount } from '@/lib/settlement';

interface Round {
  id: string;
  round_number: number;
  started_at: string;
  total_amount: number;
}

interface CheckIn {
  round_id: string;
  name: string;
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

    const roundsResult = await db.execute({
      sql: 'SELECT * FROM rounds WHERE session_id = ? ORDER BY round_number ASC',
      args: [sessionId],
    });

    const rounds = roundsResult.rows as unknown as Round[];

    const checkinsResult = await db.execute({
      sql: `
        SELECT c.round_id, c.name
        FROM checkins c
        JOIN rounds r ON c.round_id = r.id
        WHERE r.session_id = ?
        ORDER BY c.checked_in_at ASC
      `,
      args: [sessionId],
    });

    const allCheckins = checkinsResult.rows as unknown as CheckIn[];

    // round_id -> 출석 순서대로 정렬된 참가자 이름
    const namesByRound: Record<string, string[]> = {};
    for (const c of allCheckins) {
      (namesByRound[c.round_id] ??= []).push(c.name);
    }

    // round_id -> (이름 -> 분담금). 합계가 총액과 정확히 일치하도록 분배
    const shareByRound: Record<string, Map<string, number>> = {};
    for (const round of rounds) {
      const names = namesByRound[round.id] ?? [];
      const shares = splitAmount(round.total_amount, names.length);
      shareByRound[round.id] = new Map(names.map((name, i) => [name, shares[i]]));
    }

    const participantNames = [...new Set(allCheckins.map((c) => c.name))].sort();

    const participants = participantNames.map((name) => {
      const roundAmounts: Record<number, number | null> = {};
      let total = 0;

      for (const round of rounds) {
        const share = shareByRound[round.id].get(name);
        if (share === undefined) {
          roundAmounts[round.round_number] = null;
        } else {
          roundAmounts[round.round_number] = share;
          total += share;
        }
      }

      return { name, rounds: roundAmounts, total };
    });

    const roundSummary = rounds.map((r) => {
      const count = namesByRound[r.id]?.length ?? 0;
      return {
        round_number: r.round_number,
        total_amount: r.total_amount,
        per_person: count > 0 ? Math.floor(r.total_amount / count) : 0,
        count,
      };
    });

    return NextResponse.json({ participants, rounds: roundSummary });
  } catch (error) {
    console.error('GET /api/sessions/[sessionId]/settlement error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
