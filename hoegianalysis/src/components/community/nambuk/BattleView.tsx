'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { H, KINDS, W, makeSim, setAutoPlayer, step, survivors, type Kind, type Sim, type Soldier } from '@/lib/nambuk/battle';
import { SIDE_COLOR, SIDE_NAME, type Side } from '@/lib/nambuk/data';
import type { Units } from '@/lib/nambuk/game';

const INK = '#14171f';
const ART = '/hoegilab/nb-';
const PRELOAD = ['bg-field', 'bg-bridge', 'bg-broken', 'inf-u', 'inf-c', 'cav-u', 'cav-c', 'can-u', 'can-c', 'camp-u', 'camp-c'].map((n) => `${n}.webp`);

// 그림 불러오기 (한 번만). 아직 안 왔으면 null
const cache = new Map<string, HTMLImageElement>();
function art(file: string): HTMLImageElement | null {
  let im = cache.get(file);
  if (!im) {
    im = new Image();
    im.src = ART + file;
    cache.set(file, im);
  }
  return im.complete && im.naturalWidth > 0 ? im : null;
}
const KIND_NAME: Record<Kind, string> = { i: '보병', c: '기병', k: '대포' };
const KIND_ICON: Record<Kind, string> = { i: '🔫', c: '🐎', k: '💣' };

export interface BattleOutcome {
  playerWon: boolean;
  playerSurv: Units;
  enemySurv: Units;
}

// 실시간 전투: 플레이어는 왼쪽, 상대(봇)는 오른쪽. 집단(보병·기병·대포)을 골라 땅이나 적을 눌러 명령한다
export function BattleView({
  mine,
  theirs,
  mySide,
  river,
  title,
  onDone,
}: {
  mine: Units;
  theirs: Units;
  mySide: Side;
  river: boolean;
  title: string;
  onDone: (o: BattleOutcome) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sim = useRef<Sim | null>(null);
  const [sel, setSel] = useState<Kind>(mine.i > 0 ? 'i' : mine.c > 0 ? 'c' : 'k');
  const selRef = useRef(sel);
  selRef.current = sel;
  const [ui, setUi] = useState({ i: 0, c: 0, k: 0, time: 0, c0: 1, c1: 1, bridge: true, over: '' as string, won: false });
  const [auto, setAuto] = useState(false);
  const doneRef = useRef(false);

  const enemySide: Side = mySide === 'U' ? 'C' : 'U';
  const sides = useMemo(() => [mySide, enemySide] as const, [mySide, enemySide]);

  // 시뮬레이션 시작
  useEffect(() => {
    PRELOAD.forEach((f) => art(f));
    sim.current = makeSim(mine, theirs, river);
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      const s = sim.current;
      if (!s) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      step(s, dt);
      draw(canvasRef.current, s, sides, selRef.current);
      acc += dt;
      if (acc > 0.12) {
        acc = 0;
        const a = (k: Kind) => s.soldiers.filter((u) => !u.dead && u.side === 0 && u.kind === k).length;
        setUi({
          i: a('i'),
          c: a('c'),
          k: a('k'),
          time: Math.max(0, Math.ceil(s.limit - s.time)),
          c0: Math.max(0, s.camps[0].hp / s.camps[0].maxhp),
          c1: Math.max(0, s.camps[1].hp / s.camps[1].maxhp),
          bridge: s.river?.alive ?? false,
          over: s.over ? s.over.why : '',
          won: s.over?.winner === 0,
        });
      }
      if (!s.over) raf = requestAnimationFrame(loop);
      else {
        draw(canvasRef.current, s, sides, selRef.current);
        setUi((u) => ({ ...u, over: s.over?.why ?? '', won: s.over?.winner === 0 }));
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sim.current) setAutoPlayer(sim.current, auto);
  }, [auto]);

  // 키보드 1·2·3
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = ({ '1': 'i', '2': 'c', '3': 'k' } as const)[e.key as '1' | '2' | '3'];
      if (k && ui[k] > 0) setSel(k);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ui]);

  function issue(e: React.PointerEvent<HTMLCanvasElement>) {
    const s = sim.current;
    if (!s || s.over || auto) return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * W;
    const y = ((e.clientY - box.top) / box.height) * H;
    const kind = selRef.current;
    if (!s.soldiers.some((u) => !u.dead && u.side === 0 && u.kind === kind)) return;
    // 적 병사를 눌렀나
    const foe = s.soldiers.filter((u) => !u.dead && u.side === 1).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
    if (foe && Math.hypot(foe.x - x, foe.y - y) < 26) {
      s.orders[0][kind] = { x: foe.x, y: foe.y, target: foe.id };
      return;
    }
    const camp = s.camps[1];
    if (Math.hypot(camp.x - x, camp.y - y) < 46) {
      s.orders[0][kind] = { x: camp.x, y: camp.y, target: 'camp' };
      return;
    }
    const r = s.river;
    if (r?.alive && kind === 'k' && x > r.x0 - 8 && x < r.x1 + 8 && y > r.by0 - 10 && y < r.by1 + 10) {
      s.orders[0][kind] = { x, y, target: 'bridge' };
      return;
    }
    s.orders[0][kind] = { x, y, target: null };
  }

  function allAttack() {
    const s = sim.current;
    if (!s || s.over) return;
    for (const k of KINDS) s.orders[0][k] = { x: s.camps[1].x, y: s.camps[1].y, target: 'camp' };
  }

  function finish() {
    const s = sim.current;
    if (!s || doneRef.current) return;
    doneRef.current = true;
    onDone({ playerWon: s.over?.winner === 0, playerSurv: survivors(s, 0), enemySurv: survivors(s, 1) });
  }

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-2">
      <div className="flex items-center justify-between gap-2 text-[14px] font-bold">
        <span className="truncate">{title}</span>
        <span className="font-latin tabular-nums">{ui.time}초</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[12px] font-bold">
        <Bar label={`${SIDE_NAME[mySide]} 주둔지`} v={ui.c0} color={SIDE_COLOR[mySide]} />
        <Bar label={`${SIDE_NAME[enemySide]} 주둔지`} v={ui.c1} color={SIDE_COLOR[enemySide]} />
      </div>

      <div className="relative overflow-hidden rounded-[10px] border-[3px] border-ink shadow-[4px_4px_0_#14171f]">
        <canvas ref={canvasRef} width={W} height={H} onPointerDown={issue} className="block aspect-[16/9] w-full touch-manipulation" style={{ touchAction: 'manipulation' }} />
        {ui.over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/60 p-4 text-center text-white">
            <p className="text-[26px] font-black">{ui.won ? '승리!' : '패배…'}</p>
            <p className="text-[14px]">{ui.over}</p>
            <button type="button" onClick={finish} className="h-11 rounded-[10px] border-2 border-ink bg-sticker px-6 text-[16px] font-black text-ink">
              계속
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            disabled={ui[k] === 0 || auto}
            onClick={() => setSel(k)}
            aria-pressed={sel === k}
            className={`flex h-14 flex-col items-center justify-center rounded-[10px] border-2 border-ink text-[14px] font-bold disabled:opacity-40 ${sel === k ? 'bg-sticker' : 'bg-white'}`}
          >
            <span>
              {KIND_ICON[k]} {KIND_NAME[k]}
            </span>
            <span className="font-latin text-[13px]">{ui[k]}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={allAttack} disabled={!!ui.over || auto} className="h-10 rounded-[10px] border-2 border-ink bg-white px-4 text-[14px] font-bold disabled:opacity-40">
          전원 돌격
        </button>
        <button type="button" onClick={() => setAuto((v) => !v)} aria-pressed={auto} disabled={!!ui.over} className={`h-10 rounded-[10px] border-2 border-ink px-4 text-[14px] font-bold disabled:opacity-40 ${auto ? 'bg-ink text-white' : 'bg-white'}`}>
          {auto ? '직접 하기' : '자동 조종'}
        </button>
      </div>
      <p className="text-center text-[12px] leading-snug text-inkMuted">
        집단을 고르고 땅을 누르면 이동, 적을 누르면 공격해요. 적 주둔지를 부수면 이겨요.
        {river && ' 대포를 고르고 다리를 누르면 다리를 부술 수 있어요.'}
      </p>
    </div>
  );
}

function Bar({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <div>
      <div className="mb-0.5 flex justify-between">
        <span>{label}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full border-2 border-ink bg-white">
        <div className="h-full" style={{ width: `${v * 100}%`, background: color }} />
      </div>
    </div>
  );
}

// ---------- 그리기 ----------
const SPR_H: Record<Kind, number> = { i: 42, c: 52, k: 46 };
const KEY: Record<Kind, string> = { i: 'inf', c: 'cav', k: 'can' };
const sideKey = (s: Side) => (s === 'U' ? 'u' : 'c');

function draw(canvas: HTMLCanvasElement | null, s: Sim, sides: readonly [Side, Side], sel: Kind) {
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, W, H);

  // 바닥: 들판 / 강과 다리 / 부서진 다리
  const r = s.river;
  const bg = art(!r ? 'bg-field.webp' : r.alive ? 'bg-bridge.webp' : 'bg-broken.webp');
  if (bg) ctx.drawImage(bg, 0, 0, W, H);
  else {
    ctx.fillStyle = '#c9c37a';
    ctx.fillRect(0, 0, W, H);
  }

  // 주둔지 (천막·모닥불·깃발)
  s.camps.forEach((c, i) => {
    if (c.hp <= 0) return;
    const im = art(`camp-${sideKey(sides[i])}.webp`);
    const dmg = 1 - c.hp / c.maxhp;
    if (im) {
      const w = 138;
      const h = (im.naturalHeight * w) / im.naturalWidth;
      ctx.save();
      if (i === 1) {
        ctx.translate(c.x * 2, 0);
        ctx.scale(-1, 1); // 오른쪽 진영은 안쪽을 보게 뒤집는다
      }
      ctx.drawImage(im, (i === 1 ? c.x : c.x) - w / 2, c.y + 40 - h, w, h);
      ctx.restore();
    }
    if (dmg > 0.35) {
      ctx.fillStyle = 'rgba(40,40,40,0.45)';
      ctx.beginPath();
      ctx.arc(c.x + 8, c.y - 4, 10 + Math.sin(s.time * 6) * 2, 0, 7);
      ctx.fill();
    }
  });

  // 선택한 집단 표시
  for (const u of s.soldiers) {
    if (u.dead || u.side !== 0 || u.kind !== sel) continue;
    ctx.strokeStyle = '#f2d80e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(u.x, u.y + 10, 15, 5, 0, 0, 7);
    ctx.stroke();
  }
  const o = s.orders[0][sel];
  if (o && !s.over) {
    ctx.strokeStyle = '#c8322b';
    ctx.lineWidth = 3;
    const t = typeof o.target === 'number' ? s.soldiers.find((e) => e.id === o.target) : null;
    const ox = t ? t.x : o.x;
    const oy = t ? t.y : o.y;
    ctx.beginPath();
    ctx.arc(ox, oy, 9, 0, 7);
    ctx.moveTo(ox - 13, oy);
    ctx.lineTo(ox + 13, oy);
    ctx.moveTo(ox, oy - 13);
    ctx.lineTo(ox, oy + 13);
    ctx.stroke();
  }

  // 병사 (아래쪽에 있을수록 앞에 그린다)
  const list = s.soldiers.filter((u) => !u.dead).sort((a, b) => a.y - b.y);
  for (const u of list) drawSoldier(ctx, u, sides[u.side], s.time);

  // 포탄·총알
  for (const sh of s.shots) {
    if (sh.hit) continue;
    const p = Math.min(1, sh.t / sh.dur);
    if (sh.kind === 'ball') {
      const x = sh.x0 + (sh.x1 - sh.x0) * p;
      const y = sh.y0 + (sh.y1 - sh.y0) * p - Math.sin(p * Math.PI) * 70;
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 7);
      ctx.fill();
    } else {
      const x = sh.x0 + (sh.x1 - sh.x0) * p;
      const y = sh.y0 + (sh.y1 - sh.y0) * p;
      ctx.strokeStyle = '#f7e9b0';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - (sh.x1 - sh.x0) * 0.06, y - (sh.y1 - sh.y0) * 0.06);
      ctx.stroke();
    }
  }
  for (const f of s.fx) {
    const p = f.t / 0.6;
    ctx.globalAlpha = 1 - p;
    if (f.kind === 'boom') {
      ctx.fillStyle = '#e8892e';
      ctx.beginPath();
      ctx.arc(f.x, f.y, 10 + p * 34, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#f7e9b0';
      ctx.beginPath();
      ctx.arc(f.x, f.y, 5 + p * 16, 0, 7);
      ctx.fill();
    } else if (f.kind === 'splash') {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 6 + p * 26, 0, 7);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#f7e9b0';
      ctx.beginPath();
      ctx.arc(f.x, f.y, 3 + p * 6, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawSoldier(ctx: CanvasRenderingContext2D, u: Soldier, side: Side, time: number) {
  const im = art(`${KEY[u.kind]}-${sideKey(side)}.webp`);
  const h = SPR_H[u.kind];
  ctx.save();
  ctx.translate(u.x, u.y + 10);
  // 그림자
  ctx.fillStyle = 'rgba(20,23,31,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, -1, u.kind === 'c' ? 20 : 12, 4, 0, 0, 7);
  ctx.fill();
  if (im) {
    const w = (im.naturalWidth * h) / im.naturalHeight;
    ctx.scale(u.face, 1);
    const bob = Math.abs(Math.sin(time * 9 + u.id)) * (u.kind === 'k' ? 0 : 1.5);
    if (u.flash > 0) ctx.filter = 'brightness(1.8) saturate(0.6)';
    ctx.drawImage(im, -w / 2, -h - bob, w, h);
    ctx.filter = 'none';
    ctx.scale(u.face, 1);
  }
  // 체력 막대
  if (u.hp < u.maxhp) {
    const w = 22;
    ctx.fillStyle = INK;
    ctx.fillRect(-w / 2 - 1, -h - 9, w + 2, 5);
    ctx.fillStyle = u.hp / u.maxhp > 0.4 ? '#7bd16a' : '#e8574f';
    ctx.fillRect(-w / 2, -h - 8, (w * Math.max(0, u.hp)) / u.maxhp, 3);
  }
  ctx.restore();
}
