// 넙죽이 배구 규칙 엔진 (화면과 분리된 순수 계산). 60틱/초 고정 간격으로 step을 부른다.
// 왼쪽(0)은 1P, 오른쪽(1)은 2P 또는 CPU. 공이 땅에 닿으면 반대편이 1점, 점수를 낸 쪽이 다음 서브.

export const W = 480;
export const H = 320;
export const GROUND = 272; // 코트 바닥
export const NET_X = W / 2;
export const NET_HALF = 3;
export const NET_TOP = 176;
export const PR = 30; // 선수 몸 반지름
export const BR = 14; // 공 반지름

const MOVE = 3.6;
const JUMP_V = -10.2;
const G_PLAYER = 0.5;
const G_BALL = 0.22;
const BALL_MAX = 12.5;
export const BALL_DT = 0.9; // 공만 시간을 90%로 느리게 흘린다 (궤적은 같고 속도만 90%)
const SPIKE_WINDOW = 28; // 스파이크 키를 누르고 몇 틱 안에 공을 치면 스파이크인지 (넉넉하게)
const SPIKE_REACH = 9; // 스파이크 자세일 땐 공이 이만큼 더 멀리 있어도 닿는다
export const REST_Y = GROUND - PR;

export interface Input {
  left: boolean;
  right: boolean;
  jump: boolean;
  spike: boolean;
}
export const NO_INPUT: Input = { left: false, right: false, jump: false, spike: false };

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spikeT: number; // 남은 강타 틱 (애니메이션에도 씀)
  hitT: number; // 방금 공을 친 뒤 지난 틱 (0이면 안 침)
  prevSpike: boolean;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  power: number; // 강타 직후 남은 틱 (잔상)
}

export type Phase = 'serve' | 'play' | 'point' | 'over';
export type Sfx = 'bump' | 'spike' | 'net' | 'wall' | 'land' | 'point' | 'serve' | 'win';

export interface Sim {
  players: [Player, Player];
  ball: Ball;
  score: [number, number];
  phase: Phase;
  timer: number;
  server: 0 | 1;
  target: number;
  winner: 0 | 1 | null;
  landX: number; // 마지막으로 공이 떨어진 자리
  events: Sfx[]; // 이번 틱에 난 소리. 화면이 읽고 비운다
}

const rest = (x: number): Player => ({ x, y: REST_Y, vx: 0, vy: 0, spikeT: 0, hitT: 0, prevSpike: false });

export function newSim(target: number, server: 0 | 1 = 0): Sim {
  const sim: Sim = {
    players: [rest(W / 4), rest((W * 3) / 4)],
    ball: { x: 0, y: 0, vx: 0, vy: 0, spin: 0, power: 0 },
    score: [0, 0],
    phase: 'serve',
    timer: 0,
    server,
    target,
    winner: null,
    landX: W / 2,
    events: [],
  };
  resetServe(sim);
  return sim;
}

function resetServe(sim: Sim) {
  sim.players[0] = rest(W / 4);
  sim.players[1] = rest((W * 3) / 4);
  const bx = sim.server === 0 ? W / 4 : (W * 3) / 4;
  sim.ball = { x: bx, y: 80, vx: 0, vy: 0, spin: 0, power: 0 };
  sim.phase = 'serve';
  sim.timer = 55;
}

function movePlayer(p: Player, side: 0 | 1, inp: Input) {
  const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  p.vx = dir * MOVE;
  p.x += p.vx;
  const minX = side === 0 ? PR : NET_X + NET_HALF + PR;
  const maxX = side === 0 ? NET_X - NET_HALF - PR : W - PR;
  p.x = Math.max(minX, Math.min(maxX, p.x));

  const grounded = p.y >= REST_Y - 0.01;
  if (inp.jump && grounded) p.vy = JUMP_V;
  p.vy += G_PLAYER;
  p.y += p.vy;
  if (p.y >= REST_Y) {
    p.y = REST_Y;
    p.vy = 0;
  }
  // 공중에서 강타 키를 새로 누르면 잠깐 강타 자세
  if (inp.spike && !p.prevSpike && p.y < REST_Y - 4) p.spikeT = SPIKE_WINDOW;
  p.prevSpike = inp.spike;
  if (p.spikeT > 0) p.spikeT--;
  if (p.hitT > 0) p.hitT++;
  if (p.hitT > 20) p.hitT = 0;
}

function hitBall(sim: Sim, p: Player, side: 0 | 1) {
  const b = sim.ball;
  const dx = b.x - p.x;
  const dy = b.y - p.y;
  const d = Math.hypot(dx, dy);
  const airborne = p.y < REST_Y - 2;
  // 스파이크: 키를 누른 직후이거나 누르고 있는 채로 공중에 있으면 자세가 잡힌다
  const spiking = airborne && (p.spikeT > 0 || p.prevSpike);
  const reach = PR + BR + (spiking ? SPIKE_REACH : 0);
  if (d >= reach || d === 0) return;
  const nx = dx / d;
  const ny = dy / d;
  if (d < PR + BR) {
    b.x = p.x + nx * (PR + BR);
    b.y = p.y + ny * (PR + BR);
  }
  const dir = side === 0 ? 1 : -1;
  p.hitT = 1;
  if (spiking) {
    // 스파이크: 상대 코트로 빠르게 내리꽂는다. 공이 위에 있을수록 가파르게, 늘 아래로 향한다
    const steep = Math.max(0, Math.min(1, (p.y - b.y) / reach + 0.4));
    b.vx = dir * (9.5 + steep * 2.5);
    b.vy = 4 + steep * 7.5;
    b.power = 40;
    p.spikeT = 0;
    sim.events.push('spike');
  } else {
    // 일반 타격: 늘 위로 뜬다. 공의 어느 쪽을 맞췄는지로 좌우가 정해진다
    b.vx = nx * 6 + p.vx * 0.5;
    b.vy = -(6.3 + Math.max(0, -ny) * 2.2 + Math.max(0, -p.vy) * 0.3);
    sim.events.push('bump');
  }
}

function hitNet(sim: Sim) {
  const b = sim.ball;
  const cx = Math.max(NET_X - NET_HALF, Math.min(NET_X + NET_HALF, b.x));
  const cy = Math.max(NET_TOP, Math.min(GROUND, b.y));
  const dx = b.x - cx;
  const dy = b.y - cy;
  const d = Math.hypot(dx, dy);
  if (d >= BR) return;
  let nx: number;
  let ny: number;
  if (d === 0) {
    nx = 0;
    ny = -1;
  } else {
    nx = dx / d;
    ny = dy / d;
  }
  b.x = cx + nx * BR;
  b.y = cy + ny * BR;
  const dot = b.vx * nx + b.vy * ny;
  if (dot < 0) {
    b.vx -= 1.55 * dot * nx;
    b.vy -= 1.55 * dot * ny;
    b.power = 0;
    sim.events.push('net');
  }
}

function stepBall(sim: Sim) {
  const b = sim.ball;
  b.vy += G_BALL * BALL_DT;
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > BALL_MAX) {
    b.vx = (b.vx / sp) * BALL_MAX;
    b.vy = (b.vy / sp) * BALL_MAX;
  }
  b.x += b.vx * BALL_DT;
  b.y += b.vy * BALL_DT;
  b.spin += b.vx * 0.04 * BALL_DT;
  if (b.power > 0) b.power--;

  if (b.x < BR) {
    b.x = BR;
    b.vx = Math.abs(b.vx) * 0.9;
    sim.events.push('wall');
  } else if (b.x > W - BR) {
    b.x = W - BR;
    b.vx = -Math.abs(b.vx) * 0.9;
    sim.events.push('wall');
  }
  if (b.y < BR) {
    b.y = BR;
    b.vy = Math.abs(b.vy) * 0.5;
  }
}

function score(sim: Sim) {
  const b = sim.ball;
  const side: 0 | 1 = b.x < NET_X ? 0 : 1;
  const winner: 0 | 1 = side === 0 ? 1 : 0;
  sim.score[winner]++;
  sim.server = winner;
  sim.landX = b.x;
  b.y = GROUND - BR;
  b.vx = 0;
  b.vy = 0;
  b.power = 0;
  sim.events.push('land');
  if (sim.score[winner] >= sim.target) {
    sim.phase = 'over';
    sim.winner = winner;
    sim.timer = 0;
    sim.events.push('win');
  } else {
    sim.phase = 'point';
    sim.timer = 70;
    sim.events.push('point');
  }
}

export function step(sim: Sim, in0: Input, in1: Input) {
  if (sim.phase === 'over') {
    return;
  }
  if (sim.phase === 'point') {
    // 점수가 난 뒤 잠깐: 선수는 서 있고, 끝나면 다음 서브
    for (const p of sim.players) p.vx = 0;
    if (--sim.timer <= 0) resetServe(sim);
    return;
  }

  movePlayer(sim.players[0], 0, in0);
  movePlayer(sim.players[1], 1, in1);

  if (sim.phase === 'serve') {
    if (--sim.timer <= 0) {
      sim.phase = 'play';
      sim.events.push('serve');
    }
    return;
  }

  stepBall(sim);
  hitBall(sim, sim.players[0], 0);
  hitBall(sim, sim.players[1], 1);
  hitNet(sim);
  if (sim.ball.y + BR >= GROUND) score(sim);
}

// ───────── CPU ─────────

export type Level = 'easy' | 'normal' | 'hard';
const LEVELS: Record<Level, { err: number; spike: number; react: number }> = {
  easy: { err: 46, spike: 0.08, react: 0.68 },
  normal: { err: 16, spike: 0.55, react: 0.92 },
  hard: { err: 4, spike: 0.95, react: 1 },
};

// 공이 땅에 닿을 자리 (선수와 그물은 무시하고 벽 튕김만 계산)
function landing(b: Ball): { x: number; t: number } {
  let x = b.x;
  let y = b.y;
  let vx = b.vx;
  let vy = b.vy;
  for (let t = 0; t < 400; t++) {
    vy += G_BALL * BALL_DT;
    x += vx * BALL_DT;
    y += vy * BALL_DT;
    if (x < BR) {
      x = BR;
      vx = Math.abs(vx) * 0.9;
    } else if (x > W - BR) {
      x = W - BR;
      vx = -Math.abs(vx) * 0.9;
    }
    if (y + BR >= GROUND - PR * 0.6) return { x, t };
  }
  return { x, t: 400 };
}

export interface AiState {
  err: number;
  lastSide: number;
}
export const newAi = (): AiState => ({ err: 0, lastSide: -1 });

export function cpuInput(sim: Sim, side: 0 | 1, level: Level, ai: AiState): Input {
  const cfg = LEVELS[level];
  const p = sim.players[side];
  const b = sim.ball;
  const dir = side === 0 ? 1 : -1;
  const ballSide = b.x < NET_X ? 0 : 1;
  if (ballSide !== ai.lastSide) {
    ai.lastSide = ballSide;
    ai.err = (Math.random() * 2 - 1) * cfg.err;
  }
  const incoming = ballSide === side || (b.vx * dir < 0 && Math.abs(b.x - NET_X) < 160);
  let tx = side === 0 ? W / 4 : (W * 3) / 4;
  if (sim.phase === 'serve' && sim.server === side) tx = b.x - dir * 16;
  else if (incoming) tx = landing(b).x - dir * 15 + ai.err;
  const dx = tx - p.x;
  const inp: Input = { left: false, right: false, jump: false, spike: false };
  if (Math.abs(dx) > 5 && Math.random() < cfg.react) {
    inp.left = dx < 0;
    inp.right = dx > 0;
  }
  const grounded = p.y >= REST_Y - 0.01;
  const near = Math.abs(b.x - p.x) < 52;
  const above = p.y - b.y; // 양수면 공이 선수보다 위
  if (ballSide === side && sim.phase === 'play') {
    if (grounded && near && b.vy > 0 && above > 70 && above < 135 && Math.random() < cfg.react) inp.jump = true;
    if (!grounded && near && above > -10 && Math.random() < cfg.spike * 0.22) inp.spike = true;
  }
  return inp;
}
