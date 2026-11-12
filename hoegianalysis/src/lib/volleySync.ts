import { BALL_DT, GROUND, BR, NET_X, PR, REST_Y, W, type Ball, type Input, type Phase, type Player, type Sfx, type Sim } from './volleyEngine';

// 온라인 대결용 메시지. 방장(1P)이 규칙을 계산하고 30번/초 상태를 보내며, 손님(2P)은 자기 입력만 보낸다.
export type Msg =
  | { k: 'i'; v: number } // 손님 입력 (비트: 1 왼쪽, 2 오른쪽, 4 점프, 8 스파이크)
  | { k: 's'; s: number[]; e: Sfx[] } // 방장이 보내는 상태
  | { k: 'rematch' };

export const bitsOf = (i: Input): number => (i.left ? 1 : 0) | (i.right ? 2 : 0) | (i.jump ? 4 : 0) | (i.spike ? 8 : 0);
export const inputOf = (v: number): Input => ({ left: !!(v & 1), right: !!(v & 2), jump: !!(v & 4), spike: !!(v & 8) });

const PHASES: Phase[] = ['serve', 'play', 'point', 'over'];
const r1 = (n: number) => Math.round(n * 10) / 10;

export function encodeSim(sim: Sim): number[] {
  const p = (q: Player) => [r1(q.x), r1(q.y), r1(q.vx), r1(q.vy), q.spikeT, q.hitT];
  const b = sim.ball;
  return [
    PHASES.indexOf(sim.phase),
    sim.timer,
    sim.score[0],
    sim.score[1],
    sim.server,
    sim.winner === null ? -1 : sim.winner,
    sim.target,
    ...p(sim.players[0]),
    ...p(sim.players[1]),
    r1(b.x),
    r1(b.y),
    r1(b.vx),
    r1(b.vy),
    r1(b.spin),
    b.power,
  ];
}

export function applySnap(sim: Sim, a: number[]) {
  sim.phase = PHASES[a[0]] ?? 'play';
  sim.timer = a[1];
  sim.score = [a[2], a[3]];
  sim.server = a[4] === 1 ? 1 : 0;
  sim.winner = a[5] === 0 ? 0 : a[5] === 1 ? 1 : null;
  sim.target = a[6];
  for (let i = 0; i < 2; i++) {
    const o = 7 + i * 6;
    const q = sim.players[i];
    q.x = a[o];
    q.y = a[o + 1];
    q.vx = a[o + 2];
    q.vy = a[o + 3];
    q.spikeT = a[o + 4];
    q.hitT = a[o + 5];
  }
  const b = sim.ball;
  b.x = a[19];
  b.y = a[20];
  b.vx = a[21];
  b.vy = a[22];
  b.spin = a[23];
  b.power = a[24];
}

// 마지막 상태에서 n틱 뒤를 대충 예상해서 그린다 (부딪힘은 무시, 다음 상태가 오면 바로잡힌다)
export function extrapolate(sim: Sim, n: number): { players: [Player, Player]; ball: Ball } {
  const players = sim.players.map((p, i) => {
    const q = { ...p };
    const minX = i === 0 ? PR : NET_X + 3 + PR;
    const maxX = i === 0 ? NET_X - 3 - PR : W - PR;
    q.x = Math.max(minX, Math.min(maxX, q.x + q.vx * n));
    if (q.y < REST_Y || q.vy !== 0) {
      let y = q.y;
      let vy = q.vy;
      for (let t = 0; t < n; t++) {
        vy += 0.5;
        y += vy;
        if (y >= REST_Y) {
          y = REST_Y;
          vy = 0;
        }
      }
      q.y = y;
    }
    return q;
  }) as [Player, Player];
  const b = { ...sim.ball };
  if (sim.phase === 'play') {
    for (let t = 0; t < n; t++) {
      b.vy += 0.22 * BALL_DT;
      b.x += b.vx * BALL_DT;
      b.y += b.vy * BALL_DT;
      if (b.x < BR || b.x > W - BR) {
        b.x = Math.max(BR, Math.min(W - BR, b.x));
        b.vx = -b.vx * 0.9;
      }
      if (b.y + BR >= GROUND) {
        b.y = GROUND - BR;
        break;
      }
    }
  }
  return { players, ball: b };
}
