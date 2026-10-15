import { getDb } from './db';
import { splitWithAdjustments } from './settlement';

interface Round {
  id: string;
  round_number: number;
  started_at: string;
  total_amount: number;
}

interface CheckIn {
  round_id: string;
  name: string;
  adjustment: number;
}

export interface SettlementParticipant {
  name: string;
  rounds: Record<number, number | null>;
  // 차수별 조정 금액 (출석한 차수만, 조정 없으면 0)
  adjustments: Record<number, number>;
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
      SELECT c.round_id, c.name, c.adjustment
      FROM checkins c
      JOIN rounds r ON c.round_id = r.id
      WHERE r.session_id = ?
      ORDER BY c.checked_in_at ASC
    `,
    args: [sessionId],
  });

  const allCheckins = checkinsResult.rows as unknown as CheckIn[];

  // round_id -> 출석 순서대로 정렬된 출석 기록
  const checkinsByRound: Record<string, CheckIn[]> = {};
  for (const c of allCheckins) {
    (checkinsByRound[c.round_id] ??= []).push(c);
  }

  // round_id -> (이름 -> 분담금). 사람별 조정을 반영하고 합계가 총액과 정확히 일치하도록 분배
  const shareByRound: Record<string, Map<string, number>> = {};
  const adjustmentByRound: Record<string, Map<string, number>> = {};
  for (const round of rounds) {
    const checkins = checkinsByRound[round.id] ?? [];
    const adjustments = checkins.map((c) => Number(c.adjustment));
    const shares = splitWithAdjustments(round.total_amount, adjustments);
    shareByRound[round.id] = new Map(checkins.map((c, i) => [c.name, shares[i]]));
    adjustmentByRound[round.id] = new Map(checkins.map((c, i) => [c.name, adjustments[i]]));
  }

  const participantNames = [...new Set(allCheckins.map((c) => c.name))].sort();

  const participants = participantNames.map((name) => {
    const roundAmounts: Record<number, number | null> = {};
    const roundAdjustments: Record<number, number> = {};
    let total = 0;

    for (const round of rounds) {
      const share = shareByRound[round.id].get(name);
      if (share === undefined) {
        roundAmounts[round.round_number] = null;
      } else {
        roundAmounts[round.round_number] = share;
        roundAdjustments[round.round_number] = adjustmentByRound[round.id].get(name) ?? 0;
        total += share;
      }
    }

    return { name, rounds: roundAmounts, adjustments: roundAdjustments, total };
  });

  const roundSummary = rounds.map((r) => {
    const count = checkinsByRound[r.id]?.length ?? 0;
    return {
      round_number: r.round_number,
      total_amount: r.total_amount,
      per_person: count > 0 ? Math.floor(r.total_amount / count) : 0,
      count,
    };
  });

  return { participants, rounds: roundSummary };
}
