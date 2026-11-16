import { Chess, type Move, type PieceSymbol } from 'chess.js';

// 넙죽이 체스 봇: 말 값 + 자리 점수로 평가하고 알파-베타로 몇 수 앞을 본다. 외부 엔진 없이 브라우저에서만 돈다.

export type BotLevel = 1 | 2 | 3;
export const BOT_LEVELS: { level: BotLevel; name: string; blurb: string }[] = [
  { level: 1, name: '아기 넙죽이', blurb: '실수가 많아요. 처음이면 여기서' },
  { level: 2, name: '동네 넙죽이', blurb: '한 수 앞은 봐요' },
  { level: 3, name: '고수 넙죽이', blurb: '세 수 앞까지 읽어요' },
];

const VALUE: Record<PieceSymbol, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

// 흰 말 기준 자리 점수 (8x8, 위가 8랭크). 검은 말은 뒤집어 쓴다
const PST: Record<PieceSymbol, number[]> = {
  p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
};

// 현재 두는 쪽 기준 점수 (높을수록 좋다)
function evaluate(g: Chess): number {
  let score = 0;
  const board = g.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = board[r][f];
      if (!sq) continue;
      const idx = sq.color === 'w' ? r * 8 + f : (7 - r) * 8 + f;
      const v = VALUE[sq.type] + PST[sq.type][idx];
      score += sq.color === 'w' ? v : -v;
    }
  }
  return g.turn() === 'w' ? score : -score;
}

// 잡는 수·승급을 먼저 살펴야 가지치기가 잘 된다
function ordered(g: Chess): Move[] {
  return g.moves({ verbose: true }).sort((a, b) => weight(b) - weight(a));
}
function weight(m: Move): number {
  let w = 0;
  if (m.captured) w += 10 * VALUE[m.captured] - VALUE[m.piece];
  if (m.promotion) w += VALUE[m.promotion];
  if (m.san.includes('+')) w += 50;
  return w;
}

const MATE = 100000;

function search(g: Chess, depth: number, alpha: number, beta: number, ply: number): number {
  if (g.isCheckmate()) return -MATE + ply;
  if (g.isDraw()) return 0;
  if (depth === 0) return evaluate(g);
  for (const m of ordered(g)) {
    g.move(m);
    const score = -search(g, depth - 1, -beta, -alpha, ply + 1);
    g.undo();
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

// 봇이 둘 수를 고른다. 수가 없으면 null
export function pickBotMove(fen: string, level: BotLevel): Move | null {
  const g = new Chess(fen);
  const moves = ordered(g);
  if (moves.length === 0) return null;

  // 아기 넙죽이: 대충 둔다. 가끔(약 절반) 주는 말을 잡거나 체크를 하되, 나머지는 아무 수나
  if (level === 1) {
    const good = moves.filter((m) => m.captured || m.san.includes('+'));
    if (good.length && Math.random() < 0.5) return good[Math.floor(Math.random() * good.length)];
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const depth = level === 2 ? 2 : 3;
  let best: Move[] = [];
  let bestScore = -Infinity;
  for (const m of moves) {
    g.move(m);
    const score = -search(g, depth - 1, -Infinity, Infinity, 1) + (level === 2 ? Math.random() * 30 : Math.random() * 6);
    g.undo();
    if (score > bestScore + 1e-9) {
      bestScore = score;
      best = [m];
    } else if (Math.abs(score - bestScore) < 1e-9) best.push(m);
  }
  return best[Math.floor(Math.random() * best.length)] ?? moves[0];
}
