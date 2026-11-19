import type { Units } from './game';

// 실시간 전투 계산 (그리기와 입력은 BattleView 에서). 좌표는 720 x 405 논리 칸

export const W = 720;
export const H = 405;
export type Kind = 'i' | 'c' | 'k';
export const KINDS: Kind[] = ['i', 'c', 'k'];
const CAP: Record<Kind, number> = { i: 8, c: 4, k: 2 }; // 한 번에 나오는 최대 인원 (많으면 한 명이 더 세다)

interface Stat {
  hp: number;
  speed: number;
  range: number;
  dmg: number;
  cd: number;
  aggro: number;
}
const STAT: Record<Kind, Stat> = {
  i: { hp: 32, speed: 42, range: 100, dmg: 5, cd: 1.1, aggro: 130 },
  c: { hp: 44, speed: 96, range: 20, dmg: 9, cd: 0.7, aggro: 170 },
  k: { hp: 24, speed: 22, range: 340, dmg: 24, cd: 3.4, aggro: 340 },
};

export interface Soldier {
  id: number;
  side: 0 | 1;
  kind: Kind;
  x: number;
  y: number;
  hp: number;
  maxhp: number;
  power: number; // 인원이 모자랄 때 곱해지는 힘
  cd: number;
  dead: boolean;
  face: 1 | -1;
  flash: number;
  stage: number; // 다리 건너는 순서
}

export interface Order {
  x: number;
  y: number;
  target: 'camp' | 'bridge' | number | null; // 적 병사 id
}

export interface Camp {
  x: number;
  y: number;
  hp: number;
  maxhp: number;
}

export interface Shot {
  kind: 'bullet' | 'ball';
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  dur: number;
  side: 0 | 1;
  dmg: number;
  splash: number;
  at: 'ground' | 'camp' | 'bridge';
  hit?: boolean;
}

export interface Fx {
  x: number;
  y: number;
  t: number;
  kind: 'boom' | 'splash' | 'hit';
}

export interface River {
  x0: number;
  x1: number;
  by0: number;
  by1: number;
  hp: number;
  alive: boolean;
}

export interface Sim {
  soldiers: Soldier[];
  camps: [Camp, Camp];
  river: River | null;
  shots: Shot[];
  fx: Fx[];
  time: number;
  limit: number;
  orders: [Partial<Record<Kind, Order | null>>, Partial<Record<Kind, Order | null>>];
  botClock: number;
  over: { winner: 0 | 1; why: string } | null;
  counts: [Units, Units]; // 전투 전 병력 (결과 계산용)
  nextId: number;
}

export function makeSim(left: Units, right: Units, river: boolean): Sim {
  const sim: Sim = {
    soldiers: [],
    camps: [
      { x: 52, y: H / 2, hp: 220, maxhp: 220 },
      { x: W - 52, y: H / 2, hp: 220, maxhp: 220 },
    ],
    river: river ? { x0: 290, x1: 430, by0: 174, by1: 232, hp: 70, alive: true } : null, // 다리 그림에 맞춘 값
    shots: [],
    fx: [],
    time: 0,
    limit: 110,
    orders: [{}, {}],
    botClock: 0,
    over: null,
    counts: [left, right],
    nextId: 1,
  };
  const spawn = (side: 0 | 1, u: Units) => {
    for (const kind of KINDS) {
      const count = u[kind];
      const n = Math.min(count, CAP[kind]);
      if (n === 0) continue;
      const scale = count / n;
      const bx = kind === 'k' ? 96 : kind === 'c' ? 132 : 180;
      const baseX = side === 0 ? bx : W - bx;
      for (let j = 0; j < n; j++) {
        const spread = kind === 'i' ? 38 : kind === 'c' ? 54 : 60;
        const y = H / 2 + (j - (n - 1) / 2) * spread * (kind === 'i' ? 0.95 : 1.1) + (kind === 'k' ? -0 : 0);
        sim.soldiers.push({
          id: sim.nextId++,
          side,
          kind,
          x: baseX + (j % 2) * 10,
          y: Math.max(34, Math.min(H - 34, y)),
          hp: STAT[kind].hp * scale,
          maxhp: STAT[kind].hp * scale,
          power: scale,
          cd: Math.random(),
          dead: false,
          face: side === 0 ? 1 : -1,
          flash: 0,
          stage: 0,
        });
      }
    }
  };
  spawn(0, left);
  spawn(1, right);
  return sim;
}

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);
const alive = (s: Sim, side: 0 | 1, kind?: Kind) => s.soldiers.filter((u) => !u.dead && u.side === side && (!kind || u.kind === kind));

function nearestEnemy(s: Sim, u: Soldier, maxD: number): Soldier | null {
  let best: Soldier | null = null;
  let bd = maxD;
  for (const e of s.soldiers) {
    if (e.dead || e.side === u.side) continue;
    if (s.river && !s.river.alive && u.kind !== 'k' && sideOfX(s, u.x) !== sideOfX(s, e.x)) continue; // 다리가 끊기면 건너편은 닿지 않는다
    const d = dist(u.x, u.y, e.x, e.y);
    if (d < bd) (bd = d), (best = e);
  }
  return best;
}

// 강을 기준으로 어느 쪽 둑인지 (-1 왼쪽, 1 오른쪽, 0 강 위)
function sideOfX(s: Sim, x: number): -1 | 0 | 1 {
  if (!s.river) return -1;
  return x < s.river.x0 ? -1 : x > s.river.x1 ? 1 : 0;
}

// 목표 지점까지 가는 데 실제로 향할 지점 (강이 있으면 다리를 거친다)
function waypoint(s: Sim, u: Soldier, tx: number, ty: number): { x: number; y: number; blocked: boolean } {
  const r = s.river;
  if (!r) return { x: tx, y: ty, blocked: false };
  const me = sideOfX(s, u.x);
  const you = sideOfX(s, tx);
  if (me === you || me === 0 && you !== 0) return { x: tx, y: ty, blocked: false };
  const midY = (r.by0 + r.by1) / 2;
  if (!r.alive) {
    // 다리가 없으면 자기 둑 끝에서 멈춘다
    return { x: me < 0 ? r.x0 - 14 : r.x1 + 14, y: ty, blocked: true };
  }
  if (me === 0) return { x: tx, y: ty, blocked: false };
  const nearBank = me < 0 ? r.x0 - 8 : r.x1 + 8;
  if (Math.abs(u.y - midY) > 14 || Math.abs(u.x - nearBank) > 24) return { x: nearBank, y: midY, blocked: false };
  return { x: me < 0 ? r.x1 + 14 : r.x0 - 14, y: midY + (ty - midY) * 0.2, blocked: false };
}

function stepMove(s: Sim, u: Soldier, tx: number, ty: number, dt: number, speedMul = 1) {
  const wp = waypoint(s, u, tx, ty);
  const dx = wp.x - u.x;
  const dy = wp.y - u.y;
  const d = Math.hypot(dx, dy);
  if (d < 2) return;
  const sp = STAT[u.kind].speed * speedMul * dt;
  const k = Math.min(1, sp / d);
  let nx = u.x + dx * k;
  let ny = u.y + dy * k;
  const r = s.river;
  if (r && nx > r.x0 - 4 && nx < r.x1 + 4) {
    const onBridge = r.alive && ny > r.by0 && ny < r.by1;
    if (!onBridge) {
      // 강물엔 못 들어간다: 둑 가장자리에서 멈춘다
      nx = u.x < (r.x0 + r.x1) / 2 ? Math.min(nx, r.x0 - 4) : Math.max(nx, r.x1 + 4);
    }
  }
  if (Math.abs(nx - u.x) > 0.01) u.face = nx > u.x ? 1 : -1;
  u.x = Math.max(14, Math.min(W - 14, nx));
  u.y = Math.max(26, Math.min(H - 26, ny));
}

function fire(s: Sim, u: Soldier, tx: number, ty: number, at: Shot['at']) {
  const st = STAT[u.kind];
  u.cd = st.cd * (0.9 + Math.random() * 0.2);
  if (u.kind === 'k') {
    s.shots.push({ kind: 'ball', x0: u.x, y0: u.y - 6, x1: tx, y1: ty, t: 0, dur: Math.max(0.45, dist(u.x, u.y, tx, ty) / 420), side: u.side, dmg: st.dmg * u.power, splash: 38, at });
  } else if (u.kind === 'i') {
    s.shots.push({ kind: 'bullet', x0: u.x, y0: u.y - 4, x1: tx, y1: ty - 4, t: 0, dur: 0.12, side: u.side, dmg: st.dmg * u.power, splash: 0, at });
  }
}

export function step(s: Sim, dt: number) {
  if (s.over) return;
  s.time += dt;

  // 봇 조종: 1초마다 명령을 새로 내린다
  s.botClock -= dt;
  if (s.botClock <= 0) {
    s.botClock = 1;
    botThink(s, 1);
    if ((s as Sim & { autoPlayer?: boolean }).autoPlayer) botThink(s, 0);
  }

  for (const u of s.soldiers) {
    if (u.dead) continue;
    const st = STAT[u.kind];
    u.cd -= dt;
    u.flash = Math.max(0, u.flash - dt);
    const order = s.orders[u.side][u.kind] ?? null;
    const foeSide = (u.side === 0 ? 1 : 0) as 0 | 1;
    const foeCamp = s.camps[foeSide];

    // 대상 정하기
    let chase: Soldier | null = null;
    let wantCamp = false;
    let wantBridge = false;
    if (order && typeof order.target === 'number') {
      const t = s.soldiers.find((e) => e.id === order.target);
      if (t && !t.dead) chase = t;
      else s.orders[u.side][u.kind] = null;
    } else if (order && order.target === 'camp') wantCamp = true;
    else if (order && order.target === 'bridge') wantBridge = true;

    const idleAggro = !order || (order.target === null && dist(u.x, u.y, order.x, order.y) < 10);
    if (!chase && !wantCamp && !wantBridge && idleAggro) chase = nearestEnemy(s, u, st.aggro);

    // 대포: 사거리 안의 적에게 쏜다 (멈춰서)
    if (u.kind === 'k') {
      let tx = 0;
      let ty = 0;
      let at: Shot['at'] = 'ground';
      let found = false;
      if (wantBridge && s.river?.alive) {
        tx = (s.river.x0 + s.river.x1) / 2;
        ty = (s.river.by0 + s.river.by1) / 2;
        at = 'bridge';
        found = dist(u.x, u.y, tx, ty) <= st.range;
      } else if (chase && dist(u.x, u.y, chase.x, chase.y) <= st.range) {
        tx = chase.x;
        ty = chase.y;
        found = true;
      } else if (wantCamp && dist(u.x, u.y, foeCamp.x, foeCamp.y) <= st.range) {
        tx = foeCamp.x;
        ty = foeCamp.y;
        at = 'camp';
        found = true;
      }
      if (found) {
        if (u.cd <= 0) fire(s, u, tx, ty, at);
        u.face = tx > u.x ? 1 : -1;
        continue;
      }
      // 사거리 밖이면 다가간다
      const goal = wantBridge && s.river ? { x: (s.river.x0 + s.river.x1) / 2 + (u.side === 0 ? -st.range * 0.8 : st.range * 0.8), y: u.y } : chase ?? (wantCamp ? foeCamp : order);
      if (goal) stepMove(s, u, goal.x, goal.y, dt);
      continue;
    }

    // 보병·기병
    if (chase) {
      const d = dist(u.x, u.y, chase.x, chase.y);
      if (d <= st.range) {
        u.face = chase.x > u.x ? 1 : -1;
        if (u.cd <= 0) {
          if (u.kind === 'i') fire(s, u, chase.x, chase.y, 'ground');
          else {
            u.cd = st.cd;
            const bonus = chase.kind === 'k' ? 1.6 : 1;
            hurt(s, chase, st.dmg * u.power * bonus);
            s.fx.push({ x: chase.x, y: chase.y - 6, t: 0, kind: 'hit' });
          }
        }
        if (u.kind === 'c') continue;
        // 보병은 거리를 지키며 쏜다
        if (d < 55) stepMove(s, u, u.x + (u.x - chase.x), u.y + (u.y - chase.y), dt, 0.5);
        continue;
      }
      stepMove(s, u, chase.x, chase.y, dt);
    } else if (wantCamp) {
      const d = dist(u.x, u.y, foeCamp.x, foeCamp.y);
      if (d <= (u.kind === 'i' ? 70 : 26)) {
        u.face = foeCamp.x > u.x ? 1 : -1;
        if (u.cd <= 0) {
          u.cd = st.cd;
          const dmg = (u.kind === 'i' ? 3 : 6) * u.power;
          foeCamp.hp -= dmg;
          s.fx.push({ x: foeCamp.x + (Math.random() - 0.5) * 30, y: foeCamp.y - 10 + (Math.random() - 0.5) * 30, t: 0, kind: 'hit' });
        }
      } else stepMove(s, u, foeCamp.x, foeCamp.y, dt);
    } else if (order && dist(u.x, u.y, order.x, order.y) > 8) {
      // 이동 중에도 보병은 사거리 안의 적을 쏜다
      if (u.kind === 'i' && u.cd <= 0) {
        const e = nearestEnemy(s, u, st.range);
        if (e) fire(s, u, e.x, e.y, 'ground');
      }
      stepMove(s, u, order.x, order.y, dt);
    }
  }

  // 겹침 풀기
  for (let a = 0; a < s.soldiers.length; a++) {
    const p = s.soldiers[a];
    if (p.dead) continue;
    for (let b = a + 1; b < s.soldiers.length; b++) {
      const q = s.soldiers[b];
      if (q.dead) continue;
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 0 && d < 12) {
        const push = (12 - d) / 2;
        p.x -= (dx / d) * push * 0.5;
        p.y -= (dy / d) * push * 0.5;
        q.x += (dx / d) * push * 0.5;
        q.y += (dy / d) * push * 0.5;
      }
    }
  }

  // 포탄·총알
  for (const sh of s.shots) {
    sh.t += dt;
    if (sh.t >= sh.dur && !sh.hit) {
      sh.hit = true;
      if (sh.kind === 'bullet') {
        const e = s.soldiers.filter((u) => !u.dead && u.side !== sh.side).sort((a, b) => dist(a.x, a.y, sh.x1, sh.y1 + 4) - dist(b.x, b.y, sh.x1, sh.y1 + 4))[0];
        if (e && dist(e.x, e.y, sh.x1, sh.y1 + 4) < 20) {
          hurt(s, e, sh.dmg);
          s.fx.push({ x: e.x, y: e.y - 6, t: 0, kind: 'hit' });
        }
      } else {
        s.fx.push({ x: sh.x1, y: sh.y1, t: 0, kind: 'boom' });
        if (sh.at === 'bridge' && s.river?.alive) {
          s.river.hp -= sh.dmg * 1.6;
          if (s.river.hp <= 0) breakBridge(s);
        } else if (sh.at === 'camp') {
          s.camps[sh.side === 0 ? 1 : 0].hp -= sh.dmg * 1.4;
        } else {
          for (const e of s.soldiers) if (!e.dead && e.side !== sh.side && dist(e.x, e.y, sh.x1, sh.y1) < sh.splash) hurt(s, e, sh.dmg * (e.kind === 'c' ? 0.9 : 1));
          // 포탄이 다리 위를 스쳐도 다리가 상한다
          if (s.river?.alive && sh.x1 > s.river.x0 && sh.x1 < s.river.x1 && sh.y1 > s.river.by0 - 10 && sh.y1 < s.river.by1 + 10) {
            s.river.hp -= 12;
            if (s.river.hp <= 0) breakBridge(s);
          }
        }
      }
    }
  }
  s.shots = s.shots.filter((x) => !x.hit || x.t < x.dur + 0.05);
  for (const f of s.fx) f.t += dt;
  s.fx = s.fx.filter((f) => f.t < 0.6);

  // 끝났는지
  const left = alive(s, 0).length;
  const right = alive(s, 1).length;
  if (s.camps[0].hp <= 0) s.over = { winner: 1, why: '주둔지가 무너졌어요' };
  else if (s.camps[1].hp <= 0) s.over = { winner: 0, why: '적 주둔지를 무너뜨렸어요' };
  else if (left === 0 && right === 0) s.over = { winner: 1, why: '모두 쓰러졌어요' };
  else if (left === 0) s.over = { winner: 1, why: '병사가 모두 쓰러졌어요' };
  else if (right === 0) s.over = { winner: 0, why: '적이 모두 쓰러졌어요' };
  else if (s.time >= s.limit) {
    const hp = (side: 0 | 1) => alive(s, side).reduce((n, u) => n + u.hp, 0) + s.camps[side].hp * 0.3;
    s.over = hp(0) > hp(1) ? { winner: 0, why: '시간이 다 돼서 남은 힘이 더 센 쪽이 이겼어요' } : { winner: 1, why: '시간이 다 돼서 남은 힘이 더 센 쪽이 이겼어요' };
  }
}

function hurt(s: Sim, u: Soldier, dmg: number) {
  u.hp -= dmg;
  u.flash = 0.15;
  if (u.hp <= 0 && !u.dead) {
    u.dead = true;
    s.fx.push({ x: u.x, y: u.y, t: 0, kind: 'hit' });
  }
}

function breakBridge(s: Sim) {
  const r = s.river;
  if (!r) return;
  r.alive = false;
  r.hp = 0;
  s.fx.push({ x: (r.x0 + r.x1) / 2, y: (r.by0 + r.by1) / 2, t: 0, kind: 'splash' });
  // 다리 위에 있던 병사는 물에 빠진다
  for (const u of s.soldiers) {
    if (!u.dead && u.x > r.x0 - 4 && u.x < r.x1 + 4) {
      u.dead = true;
      s.fx.push({ x: u.x, y: u.y, t: 0, kind: 'splash' });
    }
  }
}

// ---------- 봇 ----------
export function botThink(s: Sim, side: 0 | 1) {
  const foe = (side === 0 ? 1 : 0) as 0 | 1;
  const mine = alive(s, side);
  const theirs = alive(s, foe);
  const camp = s.camps[foe];
  const orders = s.orders[side];
  const r = s.river;
  const home = s.camps[side];

  for (const kind of KINDS) {
    const group = mine.filter((u) => u.kind === kind);
    if (group.length === 0) {
      orders[kind] = null;
      continue;
    }
    const lead = group[0];
    if (kind === 'k') {
      // 대포: 다리 위에 적이 많으면 다리를 부수고, 아니면 사거리 끝에서 쏜다
      const onBridge = r?.alive ? theirs.filter((u) => u.x > r.x0 - 6 && u.x < r.x1 + 6).length : 0;
      if (r?.alive && onBridge >= 2) orders[kind] = { x: lead.x, y: lead.y, target: 'bridge' };
      else {
        const t = theirs.slice().sort((a, b) => dist(lead.x, lead.y, a.x, a.y) - dist(lead.x, lead.y, b.x, b.y))[0];
        orders[kind] = t ? { x: lead.x, y: lead.y, target: t.id } : { x: lead.x, y: lead.y, target: 'camp' };
      }
    } else if (kind === 'c') {
      // 기병: 적 대포부터 노린다
      const gun = theirs.find((u) => u.kind === 'k' && (!r?.alive ? sideOfX(s, u.x) === sideOfX(s, lead.x) : true));
      if (gun) orders[kind] = { x: gun.x, y: gun.y, target: gun.id };
      else orders[kind] = { x: camp.x, y: camp.y, target: theirs.length > 3 ? null : 'camp' };
      if (!gun && theirs.length > 0 && !orders[kind]?.target) {
        const t = theirs.slice().sort((a, b) => dist(lead.x, lead.y, a.x, a.y) - dist(lead.x, lead.y, b.x, b.y))[0];
        orders[kind] = { x: t.x, y: t.y, target: t.id };
      }
    } else {
      // 보병: 적이 가까이 오면 맞서고, 아니면 적 주둔지로 간다. 내 주둔지가 공격받으면 돌아온다
      const threat = theirs.find((u) => dist(u.x, u.y, home.x, home.y) < 120);
      if (threat) orders[kind] = { x: threat.x, y: threat.y, target: threat.id };
      else orders[kind] = { x: camp.x, y: camp.y, target: 'camp' };
    }
  }
}

// ---------- 결과 ----------
export function survivors(s: Sim, side: 0 | 1): Units {
  const base = s.counts[side];
  const out: Units = { i: 0, c: 0, k: 0 };
  for (const kind of KINDS) {
    const all = s.soldiers.filter((u) => u.side === side && u.kind === kind);
    if (all.length === 0) continue;
    const frac = all.reduce((n, u) => n + Math.max(0, u.hp), 0) / all.reduce((n, u) => n + u.maxhp, 0);
    const living = all.some((u) => !u.dead);
    out[kind] = living ? Math.max(1, Math.round(base[kind] * frac)) : 0;
  }
  return out;
}

// 자동 조종(플레이어도 봇이 대신): 한 번 켜면 계속
export function setAutoPlayer(s: Sim, on: boolean) {
  (s as Sim & { autoPlayer?: boolean }).autoPlayer = on;
}
