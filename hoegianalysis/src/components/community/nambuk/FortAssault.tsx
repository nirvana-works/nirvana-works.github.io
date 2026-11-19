'use client';

import { useEffect, useRef, useState } from 'react';

const W = 720;
const H = 320;
const INK = '#14171f';
const ART = '/hoegilab/nb-';
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
const BAND_TOP = 150;
const BAND_BOT = 290;
const FLAG_X = 580;
const FLAG_Y = 232;
const TIME_LIMIT = 36;

interface Guard {
  id: number;
  x: number;
  y: number;
  hp: number;
  cd: number;
  flash: number;
  face: 1 | -1;
  spawnAt: number;
  hit: number;
}

type Keys = { l: boolean; r: boolean; u: boolean; d: boolean };

// 요새 습격: 옆으로 가며 싸우는 액션. 경비병을 물리치며 오른쪽 깃발까지 가서 잠시 서 있으면 깃발이 바뀐다
export function FortAssault({ mySide, title, guardsCount, onDone }: { mySide: 'U' | 'C'; title: string; guardsCount: number; onDone: (success: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'ready' | 'play' | 'win' | 'lose'>('ready');
  const [hud, setHud] = useState({ hp: 8, time: TIME_LIMIT, flag: 0 });
  const keys = useRef<Keys>({ l: false, r: false, u: false, d: false });
  const punch = useRef(false);
  const me = mySide === 'U' ? 'u' : 'c';
  const foe = mySide === 'U' ? 'c' : 'u';

  useEffect(() => {
    if (phase !== 'play') return;
    const n = Math.max(3, Math.min(7, guardsCount));
    const guards: Guard[] = Array.from({ length: n }, (_, i) => ({
      id: i,
      x: W + 30,
      y: BAND_TOP + 20 + ((i * 47) % (BAND_BOT - BAND_TOP - 30)),
      hp: 3,
      cd: 0.6,
      flash: 0,
      face: -1,
      spawnAt: i * 3.2,
      hit: 0,
    }));
    const st = { x: 70, y: 235, face: 1 as 1 | -1, hp: 8, time: TIME_LIMIT, t: 0, swing: 0, swingCd: 0, inv: 0, flag: 0, result: '' as '' | 'win' | 'lose' };
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const k = keys.current;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') k.l = down;
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') k.r = down;
      else if (e.code === 'ArrowUp' || e.code === 'KeyW') k.u = down;
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') k.d = down;
      else if ((e.code === 'Space' || e.code === 'KeyJ') && down) punch.current = true;
      else return;
      e.preventDefault();
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    let raf = 0;
    let last = performance.now();
    let hudAcc = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      st.t += dt;
      st.time -= dt;
      st.inv = Math.max(0, st.inv - dt);
      st.swing = Math.max(0, st.swing - dt);
      st.swingCd = Math.max(0, st.swingCd - dt);
      const k = keys.current;
      const vx = (k.r ? 1 : 0) - (k.l ? 1 : 0);
      const vy = (k.d ? 1 : 0) - (k.u ? 1 : 0);
      st.x = Math.max(24, Math.min(W - 24, st.x + vx * 130 * dt));
      st.y = Math.max(BAND_TOP, Math.min(BAND_BOT, st.y + vy * 95 * dt));
      if (vx !== 0) st.face = vx > 0 ? 1 : -1;

      if (punch.current) {
        punch.current = false;
        if (st.swingCd <= 0) {
          st.swing = 0.18;
          st.swingCd = 0.34;
          for (const g of guards) {
            if (g.hp <= 0 || st.t < g.spawnAt) continue;
            const dx = (g.x - st.x) * st.face;
            if (dx > -8 && dx < 52 && Math.abs(g.y - st.y) < 24) {
              g.hp -= 1;
              g.flash = 0.15;
              g.hit = 0.25;
              g.x += st.face * 22;
            }
          }
        }
      }

      for (const g of guards) {
        if (g.hp <= 0 || st.t < g.spawnAt) continue;
        g.cd -= dt;
        g.flash = Math.max(0, g.flash - dt);
        g.hit = Math.max(0, g.hit - dt);
        if (g.x > W) g.x = W - 4;
        const dx = st.x - g.x;
        const dy = st.y - g.y;
        const d = Math.hypot(dx, dy);
        if (g.hit <= 0 && d > 30) {
          g.x += (dx / d) * 62 * dt;
          g.y += (dy / d) * 50 * dt;
        }
        g.face = dx > 0 ? 1 : -1;
        if (d <= 34 && g.cd <= 0 && g.hit <= 0) {
          g.cd = 1.6;
          if (st.inv <= 0) {
            st.hp -= 1;
            st.inv = 0.5;
          }
        }
      }

      // 깃발
      if (Math.hypot(st.x - FLAG_X, st.y - FLAG_Y) < 46) st.flag = Math.min(1, st.flag + dt / 1.6);
      else st.flag = Math.max(0, st.flag - dt * 0.6);

      if (st.hp <= 0) st.result = 'lose';
      else if (st.flag >= 1) st.result = 'win';
      else if (st.time <= 0) st.result = 'lose';

      draw(canvasRef.current, st, guards, me, foe);
      hudAcc += dt;
      if (hudAcc > 0.1 || st.result) {
        hudAcc = 0;
        setHud({ hp: Math.max(0, st.hp), time: Math.max(0, Math.ceil(st.time)), flag: st.flag });
      }
      if (st.result) {
        setPhase(st.result);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      keys.current = { l: false, r: false, u: false, d: false };
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase === 'ready') {
      const idle = { x: 70, y: 235, face: 1 as 1 | -1, t: 0, swing: 0, inv: 0, flag: 0 };
      draw(canvasRef.current, idle, [], me, foe);
      let n = 0;
      const iv = setInterval(() => {
        draw(canvasRef.current, idle, [], me, foe);
        if (++n > 20) clearInterval(iv);
      }, 200); // 그림이 도착할 때까지 잠깐 다시 그린다
      return () => clearInterval(iv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const hold = (key: keyof Keys) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      keys.current[key] = true;
    },
    onPointerUp: () => (keys.current[key] = false),
    onPointerLeave: () => (keys.current[key] = false),
    onPointerCancel: () => (keys.current[key] = false),
  });
  const padBtn = 'flex h-14 w-14 touch-none select-none items-center justify-center rounded-[12px] border-2 border-ink bg-white text-[22px] font-black active:bg-sticker';

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-2">
      <div className="flex items-center justify-between gap-2 text-[14px] font-bold">
        <span className="truncate">{title}</span>
        <span className="font-latin tabular-nums">
          {'♥'.repeat(hud.hp)}
          <span className="opacity-30">{'♥'.repeat(8 - hud.hp)}</span> · {hud.time}초
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full border-2 border-ink bg-white">
        <div className="h-full bg-sticker" style={{ width: `${hud.flag * 100}%` }} />
      </div>
      <div className="relative overflow-hidden rounded-[10px] border-[3px] border-ink shadow-[4px_4px_0_#14171f]">
        <canvas ref={canvasRef} width={W} height={H} className="block aspect-[9/4] w-full" />
        {phase !== 'play' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/60 p-4 text-center text-white">
            {phase === 'ready' && (
              <>
                <p className="text-[22px] font-black">요새 습격!</p>
                <button type="button" onClick={() => setPhase('play')} className="h-11 rounded-[10px] border-2 border-ink bg-sticker px-6 text-[16px] font-black text-ink">
                  쳐들어가기
                </button>
              </>
            )}
            {(phase === 'win' || phase === 'lose') && (
              <>
                <p className="text-[24px] font-black">{phase === 'win' ? '깃발을 바꿨어요!' : '실패했어요…'}</p>
                <button type="button" onClick={() => onDone(phase === 'win')} className="h-11 rounded-[10px] border-2 border-ink bg-sticker px-6 text-[16px] font-black text-ink">
                  계속
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {phase === 'play' && (
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="grid grid-cols-3 grid-rows-2 gap-1.5">
            <span />
            <button type="button" aria-label="위" {...hold('u')} className={padBtn}>
              ↑
            </button>
            <span />
            <button type="button" aria-label="왼쪽" {...hold('l')} className={padBtn}>
              ←
            </button>
            <button type="button" aria-label="아래" {...hold('d')} className={padBtn}>
              ↓
            </button>
            <button type="button" aria-label="오른쪽" {...hold('r')} className={padBtn}>
              →
            </button>
          </div>
          <button
            type="button"
            aria-label="공격"
            onPointerDown={(e) => {
              e.preventDefault();
              punch.current = true;
            }}
            className="flex h-24 w-24 touch-none select-none items-center justify-center rounded-full border-2 border-ink bg-sticker text-[18px] font-black active:bg-[#e3c900]"
          >
            공격
          </button>
        </div>
      )}
      {phase === 'ready' && (
        <p className="text-center text-[13px] leading-snug">방향키(또는 화살 버튼)로 움직이고 스페이스(공격 버튼)로 경비병을 때려요. 오른쪽 깃발 옆에 잠깐 서 있으면 깃발이 바뀌어요.</p>
      )}
      {phase === 'ready' && (
        <button type="button" onClick={() => onDone(false)} className="mx-auto text-[13px] underline">
          습격 안 할래요
        </button>
      )}
    </div>
  );
}

function draw(
  canvas: HTMLCanvasElement | null,
  st: { x: number; y: number; face: 1 | -1; swing: number; inv: number; flag: number; t: number },
  guards: Guard[],
  me: string,
  foe: string,
) {
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;
  // 하늘
  const sky = ctx.createLinearGradient(0, 0, 0, 160);
  sky.addColorStop(0, '#c9d4dc');
  sky.addColorStop(1, '#e6e2cf');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // 요새 벽 (위쪽 총안에 경비병이 보인다)
  const wall = art('fort-wall.webp');
  const wallH = wall ? (wall.naturalHeight * W) / wall.naturalWidth : 156;
  if (wall) ctx.drawImage(wall, 0, 4, W, wallH);
  // 바닥: 벽 밑의 흙길
  const fy = 4 + wallH - 8;
  const floor = ctx.createLinearGradient(0, fy, 0, H);
  floor.addColorStop(0, '#b79b6c');
  floor.addColorStop(1, '#d6bd8a');
  ctx.fillStyle = floor;
  ctx.fillRect(0, fy, W, H - fy);
  ctx.fillStyle = 'rgba(80,58,30,0.16)';
  for (let y = fy + 16; y < H; y += 26) ctx.fillRect(0, y, W, 6);
  ctx.strokeStyle = 'rgba(20,23,31,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, fy);
  ctx.lineTo(W, fy);
  ctx.stroke();

  // 깃발 (절반 넘게 채우면 우리 깃발로 바뀐다)
  const flagIm = art(`flag-${st.flag > 0.5 ? me : foe}.webp`);
  if (flagIm) {
    const fh = 86;
    const fw = (flagIm.naturalWidth * fh) / flagIm.naturalHeight;
    ctx.drawImage(flagIm, FLAG_X - 6, FLAG_Y + 12 - fh, fw, fh);
  }
  ctx.fillStyle = 'rgba(242,216,14,0.9)';
  ctx.globalAlpha = 0.16;
  ctx.beginPath();
  ctx.arc(FLAG_X, FLAG_Y + 4, 46, 0, 7);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (st.flag > 0) {
    ctx.strokeStyle = '#f2d80e';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(FLAG_X, FLAG_Y + 4, 46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * st.flag);
    ctx.stroke();
  }

  type Ent = { y: number; draw: () => void };
  const ents: Ent[] = [];
  for (const g of guards) {
    if (g.hp <= 0 || st.t < g.spawnAt) continue;
    ents.push({ y: g.y, draw: () => fighter(ctx, g.x, g.y, foe, g.face, g.flash > 0, g.hp / 3, false, 0) });
  }
  const flick = st.inv > 0 && Math.floor(st.t * 16) % 2 === 0;
  if (!flick) ents.push({ y: st.y, draw: () => fighter(ctx, st.x, st.y, me, st.face, false, 1, true, st.swing) });
  ents.sort((a, b) => a.y - b.y).forEach((e) => e.draw());
}

function fighter(ctx: CanvasRenderingContext2D, x: number, y: number, side: string, face: 1 | -1, flash: boolean, hpFrac: number, isMe: boolean, swing: number) {
  const im = art(`inf-${side}.webp`);
  const h = 60;
  ctx.save();
  ctx.translate(x, y + 4);
  ctx.fillStyle = 'rgba(20,23,31,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 5, 0, 0, 7);
  ctx.fill();
  if (im) {
    const w = (im.naturalWidth * h) / im.naturalHeight;
    ctx.scale(face, 1);
    if (swing > 0) {
      ctx.translate(8, 0);
      ctx.rotate(0.18); // 내지르는 몸짓
    }
    if (flash) ctx.filter = 'brightness(1.8) saturate(0.6)';
    ctx.drawImage(im, -w / 2, -h, w, h);
    ctx.filter = 'none';
    if (swing > 0) {
      ctx.strokeStyle = '#f7e9b0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(w / 2 + 8, -h * 0.55, 13, -0.9, 0.9);
      ctx.stroke();
    }
  }
  ctx.restore();
  if (!isMe && hpFrac < 1) {
    ctx.fillStyle = INK;
    ctx.fillRect(x - 13, y - h - 10, 26, 5);
    ctx.fillStyle = '#e8574f';
    ctx.fillRect(x - 12, y - h - 9, 24 * hpFrac, 3);
  }
}
