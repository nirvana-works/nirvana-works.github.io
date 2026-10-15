import { getDb } from './db';
import { splitAmount } from './settlement';

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

export interface SettlementParticipant {
  name: string;
  rounds: Record<number, number | null>;
  total: number;
}

export interface SettlementRound {
  round_number: number;
  total_amount: number;
  per_person: number;
  count: number;
}

// 세션의 차수별 분담금을 계산 (관리자 정산표와 성적표가 같은 결과를 쓰도록 공유)
export async function computeSettlement(
  sessionId: string
): Promise<{ participants: SettlementParticipant[]; rounds: SettlementRound[] }> {
  const db = getDb();

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

  return { participants, rounds: roundSummary };
}
