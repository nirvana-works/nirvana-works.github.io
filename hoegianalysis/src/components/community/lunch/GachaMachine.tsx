'use client';

import { useEffect, useRef, useState } from 'react';
import { sfx } from '@/lib/lunch/sound';

export const CAPSULE_COLORS = ['#FF8F9C', '#FFC857', '#7ED9B0', '#86B8F5', '#B79CF0', '#FF9F68'];

export type MachinePhase = 'loading' | 'ready' | 'turning' | 'out' | 'opening';

interface Props {
  colors: string[]; // 장전할 캡슐 색 (후보 수만큼)
  phase: MachinePhase;
  removed: number | null; // 뽑혀서 돔에서 빠진 캡슐
  onTurn: () => void; // 레버를 끝까지 돌렸을 때
  onOpen: (rect: DOMRect) => void; // 배출된 캡슐을 눌렀을 때
  openedName?: string;
  openedEmoji?: string;
}

interface Cap {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  born: number; // 등장 시각 (초)
  gone: number | null; // 빠지기 시작한 시각
}

const W = 300; // 돔 내부 논리 좌표
const R = 146;
const CR = 31; // 캡슐 반지름

function drawCapsule(c: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, color: string) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.lineWidth = 3;
  c.strokeStyle = '#2b2118';
  // 아랫반쪽 (크림색)
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI);
  c.closePath();
  c.fillStyle = '#FFF6E3';
  c.fill();
  // 윗반쪽 (색)
  c.beginPath();
  c.arc(0, 0, r, Math.PI, Math.PI * 2);
  c.closePath();
  c.fillStyle = color;
  c.fill();
  // 테두리와 이음새
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.moveTo(-r, 0);
  c.lineTo(r, 0);
  c.stroke();
  // 반짝임
  c.beginPath();
  c.arc(0, 0, r * 0.66, Math.PI * 1.1, Math.PI * 1.45);
  c.lineWidth = 4;
  c.strokeStyle = 'rgba(255,255,255,0.85)';
  c.lineCap = 'round';
  c.stroke();
  c.restore();
}

// 레트로 캡슐 뽑기 기계: 유리돔 속 캡슐 물리 시뮬레이션 + 레버 + 배출구
export function GachaMachine({ colors, phase, removed, onTurn, onOpen, openedName, openedEmoji }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const caps = useRef<Cap[]>([]);
  const phaseRef = useRef(phase);
  const removedRef = useRef(removed);
  const outRef = useRef<HTMLButtonElement>(null);
  const [angle, setAngle] = useState(0);
  const angleRef = useRef(0);
  const drag = useRef<{ last: number; total: number; tickAt: number } | null>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const animRef = useRef(0);

  phaseRef.current = phase;
  removedRef.current = removed;

  // 후보가 바뀌면(장전) 캡슐을 새로 만든다
  useEffect(() => {
    caps.current = colors.map((_, i) => ({
      x: W / 2 + (Math.random() - 0.5) * 120,
      y: 40 + Math.random() * 20,
      vx: (Math.random() - 0.5) * 120,
      vy: 0,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 4,
      born: i * 0.22,
      gone: null,
    }));
    angleRef.current = 0;
    setAngle(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors.join(',')]);

  // 시뮬레이션 + 그리기
  useEffect(() => {
    const cv = canvasRef.current;
    const c = cv?.getContext('2d');
    if (!cv || !c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr;
    cv.height = W * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    let prev = performance.now();
    let acc = 0;
    let clock = 0;
    const STEP = 1 / 60;

    const step = () => {
      clock += STEP;
      const shaking = phaseRef.current === 'turning';
      const list = caps.current;
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        if (clock < p.born) continue;
        if (removedRef.current === i && p.gone === null) p.gone = clock;
        if (p.gone !== null) continue;
        p.vy += 900 * STEP;
        if (shaking) {
          // 휘젓기: 중심 둘레로 회전하는 힘과 위로 튀는 힘
          const dx = p.x - W / 2;
          const dy = p.y - W / 2;
          p.vx += -dy * 0.9 * STEP * 6 + (Math.random() - 0.5) * 90;
          p.vy += dx * 0.9 * STEP * 6 - Math.random() * 70;
        }
        p.x += p.vx * STEP;
        p.y += p.vy * STEP;
        p.rot += p.vr * STEP;
        p.vx *= 0.999;
        // 돔 벽
        const dx = p.x - W / 2;
        const dy = p.y - W / 2;
        const d = Math.hypot(dx, dy);
        const lim = R - CR - 2;
        if (d > lim) {
          const nx = dx / d;
          const ny = dy / d;
          p.x = W / 2 + nx * lim;
          p.y = W / 2 + ny * lim;
          const vn = p.vx * nx + p.vy * ny;
          if (vn > 0) {
            p.vx -= 1.7 * vn * nx;
            p.vy -= 1.7 * vn * ny;
            p.vr += (-nx * p.vy + ny * p.vx) * 0.004;
          }
          p.vx *= 0.985;
        }
      }
      // 캡슐끼리 부딪힘
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        if (clock < a.born || a.gone !== null) continue;
        for (let j = i + 1; j < list.length; j++) {
          const b = list[j];
          if (clock < b.born || b.gone !== null) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 0.01;
          const min = CR * 2 - 1;
          if (d < min) {
            const nx = dx / d;
            const ny = dy / d;
            const push = (min - d) / 2;
            a.x -= nx * push;
            a.y -= ny * push;
            b.x += nx * push;
            b.y += ny * push;
            const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (rv < 0) {
              const imp = -rv * 0.85;
              a.vx -= nx * imp;
              a.vy -= ny * imp;
              b.vx += nx * imp;
              b.vy += ny * imp;
              a.vr += ny * 0.3;
              b.vr -= ny * 0.3;
            }
          }
        }
      }
    };

    const draw = () => {
      c.clearRect(0, 0, W, W);
      caps.current.forEach((p, i) => {
        if (clock < p.born) return;
        let s = Math.min(1, (clock - p.born) / 0.25);
        s = 1 - (1 - s) ** 3;
        if (p.gone !== null) s *= Math.max(0, 1 - (clock - p.gone) / 0.2);
        if (s <= 0.01) return;
        drawCapsule(c, p.x, p.y, CR * s, p.rot, colors[i] ?? '#ccc');
      });
    };

    const frame = (now: number) => {
      acc += Math.min(0.1, (now - prev) / 1000);
      prev = now;
      while (acc >= STEP) {
        step();
        acc -= STEP;
      }
      draw();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors.join(',')]);

  // 장전 중 캡슐이 하나씩 떨어질 때 나는 소리
  useEffect(() => {
    if (phase !== 'loading') return;
    const timers = colors.map((_, i) => window.setTimeout(() => sfx.click(), 120 + i * 220));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === 'loading', colors.join(',')]);

  const canTurn = phase === 'ready';

  // 레버: 끌어서 한 바퀴 돌리기
  function pointerAngle(e: React.PointerEvent) {
    const r = knobRef.current!.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  }
  function down(e: React.PointerEvent) {
    if (!canTurn) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { last: pointerAngle(e), total: 0, tickAt: 0 };
  }
  function move(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const a = pointerAngle(e);
    let delta = a - d.last;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    d.last = a;
    if (delta > 0) d.total += delta; // 시계 방향으로만
    const shown = Math.min(d.total, 360);
    angleRef.current = shown;
    setAngle(shown);
    if (d.total - d.tickAt > 30) {
      d.tickAt = d.total;
      sfx.tick();
    }
    if (d.total >= 340) {
      drag.current = null;
      finishTurn();
    }
  }
  function up() {
    if (!drag.current) return;
    drag.current = null;
    // 덜 돌렸으면 제자리로 돌아간다
    let cur = angleRef.current;
    const back = () => {
      cur = Math.max(0, cur - 14);
      angleRef.current = cur;
      setAngle(cur);
      if (cur > 0) animRef.current = requestAnimationFrame(back);
    };
    animRef.current = requestAnimationFrame(back);
  }
  function finishTurn() {
    setAngle(360);
    sfx.ratchet();
    onTurn();
  }
  // 버튼으로 돌리기: 한 바퀴를 자동 애니메이션
  function autoTurn() {
    if (!canTurn) return;
    cancelAnimationFrame(animRef.current);
    sfx.ratchet(16, 1);
    const t0 = performance.now();
    const spin = (now: number) => {
      const k = Math.min(1, (now - t0) / 1000);
      const a = 360 * (1 - (1 - k) ** 2);
      angleRef.current = a;
      setAngle(a);
      if (k < 1) animRef.current = requestAnimationFrame(spin);
      else onTurn();
    };
    animRef.current = requestAnimationFrame(spin);
  }
  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const shaking = phase === 'turning';

  return (
    <div className="mx-auto flex w-full max-w-[340px] flex-col items-center select-none">
      {/* 유리돔 */}
      <div className={`relative aspect-square w-[88%] ${shaking ? '[animation:machine-shake_0.16s_linear_infinite]' : ''}`}>
        <div className="absolute inset-0 overflow-hidden rounded-full border-[3px] border-[#2b2118] bg-[radial-gradient(circle_at_50%_40%,#FFFDF5_0%,#FFF0D0_70%,#FFE3B8_100%)]">
          <canvas ref={canvasRef} className="h-full w-full" />
          {/* 유리 반사광 */}
          <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.85)_0%,rgba(255,255,255,0)_32%)]" />
          <div className="pointer-events-none absolute left-[14%] top-[10%] h-[34%] w-[10%] -rotate-[35deg] rounded-full bg-white/60 blur-[1px]" />
        </div>
      </div>

      {/* 몸통 */}
      <div className="-mt-5 w-full rounded-[22px] border-[3px] border-[#2b2118] bg-[#FF9C8F] px-4 pb-4 pt-6 shadow-[0_6px_0_#2b2118]">
        <div className="flex items-center justify-between gap-3">
          {/* 동전 투입구 + 안내 스티커 */}
          <div className="flex flex-1 flex-col gap-2">
            <div className="rounded-[10px] border-[3px] border-[#2b2118] bg-[#FFF6E3] px-2 py-1.5 text-center">
              <p className="text-[11px] font-black leading-tight">처방 가챠</p>
              <p className="font-latin text-[10px] font-bold leading-tight text-[#6a5a48]">1 PRESCRIPTION</p>
            </div>
            <div className="mx-auto h-2.5 w-14 rounded-full border-[3px] border-[#2b2118] bg-[#2b2118]" aria-hidden />
          </div>

          {/* 레버 */}
          <div className="flex flex-col items-center gap-1">
            <div
              ref={knobRef}
              role="slider"
              aria-label="레버"
              aria-valuemin={0}
              aria-valuemax={360}
              aria-valuenow={Math.round(angle)}
              tabIndex={canTurn ? 0 : -1}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && autoTurn()}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
              className={`relative grid h-[92px] w-[92px] touch-none place-items-center rounded-full border-[3px] border-[#2b2118] bg-[#FFF6E3] shadow-[inset_0_-6px_0_rgba(0,0,0,0.12)] ${canTurn ? 'cursor-grab active:cursor-grabbing' : 'opacity-80'}`}
            >
              <div className="absolute inset-0" style={{ transform: `rotate(${angle}deg)` }}>
                <div className="absolute left-1/2 top-[8px] h-[38px] w-[18px] -translate-x-1/2 rounded-full border-[3px] border-[#2b2118] bg-[#FFC857]" />
                <div className="absolute left-1/2 top-[44px] h-[4px] w-[8px] -translate-x-1/2 bg-[#2b2118]" />
              </div>
              <div className="h-[22px] w-[22px] rounded-full border-[3px] border-[#2b2118] bg-[#FF9C8F]" />
            </div>
            <span className="text-[11px] font-black text-[#2b2118]">{canTurn ? '↻ 돌려요' : phase === 'loading' ? '장전 중…' : ''}</span>
          </div>
        </div>

        {/* 배출구 */}
        <div className="relative mt-3 flex h-[84px] items-end justify-center overflow-hidden rounded-[14px] border-[3px] border-[#2b2118] bg-[#3a2c20] shadow-[inset_0_6px_0_rgba(0,0,0,0.35)]">
          <div className="absolute inset-x-0 top-0 h-3 bg-black/30" />
          {(phase === 'out' || phase === 'opening') && removed !== null && (
            <button
              ref={outRef}
              type="button"
              onClick={() => outRef.current && phase === 'out' && onOpen(outRef.current.getBoundingClientRect())}
              aria-label="캡슐 열기"
              className="mb-1.5 h-[64px] w-[64px] [animation:capsule-drop_0.9s_cubic-bezier(.3,1.4,.5,1)_both]"
            >
              <span className={`relative block h-full w-full ${phase === 'out' ? '[animation:capsule-nudge_1.1s_ease-in-out_1.2s_infinite]' : ''}`}>
                <CapsuleView color={colors[removed] ?? '#ccc'} open={phase === 'opening'} emoji={openedEmoji} />
              </span>
            </button>
          )}
          {phase === 'out' && (
            <span className="pointer-events-none absolute right-2 top-1.5 rounded-full bg-[#FFC857] px-2 py-0.5 text-[11px] font-black text-[#2b2118] [animation:pop-in_0.4s_ease-out_0.9s_both]">눌러서 열기 👆</span>
          )}
        </div>
      </div>

      {/* 받침 */}
      <div className="h-3 w-[94%] rounded-b-[14px] border-[3px] border-t-0 border-[#2b2118] bg-[#7a5c8a]" />

      <button
        type="button"
        onClick={autoTurn}
        disabled={!canTurn}
        className="mt-4 h-12 w-full max-w-[300px] rounded-[12px] border-2 border-ink bg-sticker text-[16px] font-black shadow-[0_4px_0_#000] active:translate-y-[2px] active:shadow-[0_2px_0_#000] disabled:opacity-50"
      >
        {phase === 'loading' ? '캡슐 장전 중…' : phase === 'turning' ? '섞는 중…' : phase === 'ready' ? '🎰 레버 돌리기' : '꺼내서 열어 보세요'}
      </button>

      {/* 공개 직전 메뉴 이름 */}
      {phase === 'opening' && openedName && (
        <p className="mt-3 text-center text-[22px] font-black [animation:pop-in_0.45s_cubic-bezier(.3,1.5,.5,1)_0.25s_both]">
          {openedEmoji} {openedName}!
        </p>
      )}
    </div>
  );
}

// 배출된 캡슐 (열리면 두 쪽으로 갈라지고 이모지가 튀어나온다)
function CapsuleView({ color, open, emoji }: { color: string; open: boolean; emoji?: string }) {
  const half = 'absolute left-0 h-1/2 w-full overflow-hidden transition-transform duration-500 ease-out';
  return (
    <>
      {open && emoji && <span className="absolute inset-0 grid place-items-center text-[40px] [animation:pop-in_0.4s_ease-out_0.15s_both]">{emoji}</span>}
      <span className={`${half} top-0`} style={{ transform: open ? 'translate(-14px,-22px) rotate(-38deg)' : undefined }}>
        <span className="block h-[200%] w-full rounded-full border-[3px] border-[#2b2118]" style={{ background: color }}>
          <span className="absolute left-[22%] top-[14%] h-[14%] w-[34%] -rotate-[25deg] rounded-full bg-white/80" />
        </span>
      </span>
      <span className={`${half} bottom-0`} style={{ transform: open ? 'translate(14px,22px) rotate(38deg)' : undefined }}>
        <span className="absolute bottom-0 block h-[200%] w-full rounded-full border-[3px] border-[#2b2118] bg-[#FFF6E3]" />
      </span>
    </>
  );
}
