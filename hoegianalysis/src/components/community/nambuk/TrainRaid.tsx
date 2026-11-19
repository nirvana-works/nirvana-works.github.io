'use client';

import { useEffect, useRef, useState } from 'react';

const W = 720;
const H = 300;
const INK = '#14171f';
const ROOF = 190; // 지붕 높이(y)
const GAP = 26; // 칸 사이 틈
const PLAYER_X = 150; // 화면 속 내 자리
const TIME_LIMIT = 30;
const K = 0.49; // 열차 그림 크기 (그림은 2배 해상도로 만들어 둠)
const ART = '/hoegilab/nb-';

// 열차 그림: 지붕 면(roofY)과 크기 (nb-train-*.webp 기준)
const CAR = {
  box: { file: 'train-box.webp', w: 389, h: 220, roofY: 35 },
  gold: { file: 'train-gold.webp', w: 403, h: 220, roofY: 35 },
  loco: { file: 'train-loco.webp', w: 602, h: 242, roofY: 70 },
} as const;
const LAYOUT: ('box' | 'gold')[] = ['box', 'box', 'box', 'box', 'gold'];
const CAR_W = LAYOUT.map((t) => Math.round(CAR[t].w * K));
const CAR_START = LAYOUT.map((_, i) => CAR_W.slice(0, i).reduce((n, w) => n + w + GAP, 0));
const WORLD_END = CAR_START[LAYOUT.length - 1] + CAR_W[LAYOUT.length - 1] * 0.5;
const LOCO_W = Math.round(CAR.loco.w * K);

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

interface Guard {
  car: number;
  x: number; // 칸 안에서의 위치
  down: boolean;
}
interface St {
  scroll: number;
  y: number;
  vy: number;
  inv: number;
  stun: number;
  t: number;
}

// 열차 습격: 달리는 열차 지붕을 건너 금화 칸까지 간다. 누르면(스페이스·↑) 뛰어올라 틈새와 경비병을 넘는다
export function TrainRaid({ mySide, title, onDone }: { mySide: 'U' | 'C'; title: string; onDone: (success: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'ready' | 'play' | 'win' | 'lose'>('ready');
  const [hud, setHud] = useState({ hearts: 3, time: TIME_LIMIT, pct: 0 });
  const jumpRef = useRef<() => void>(() => {});
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const me = mySide === 'U' ? 'u' : 'c';
  const foe = mySide === 'U' ? 'c' : 'u';

  useEffect(() => {
    [...Object.values(CAR).map((c) => c.file), 'train-bg.webp', `inf-${me}.webp`, `inf-${foe}.webp`].forEach((f) => art(f));
  }, [me, foe]);

  useEffect(() => {
    if (phase !== 'play') return;
    const guards: Guard[] = [];
    for (let c = 1; c < LAYOUT.length - 1; c++) {
      const n = 1 + (c % 2);
      for (let j = 0; j < n; j++) guards.push({ car: c, x: 60 + j * 70 + Math.random() * 24, down: false });
    }
    const st = { scroll: CAR_START[0] - PLAYER_X + 50, y: ROOF, vy: 0, hearts: 3, time: TIME_LIMIT, inv: 0, stun: 0, t: 0, result: '' as '' | 'win' | 'lose' };
    jumpRef.current = () => {
      if (st.y >= ROOF - 1 && st.stun <= 0) st.vy = -470;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        jumpRef.current();
      }
    };
    window.addEventListener('keydown', onKey);

    const carAt = (wx: number): { car: number; on: boolean } => {
      for (let i = 0; i < LAYOUT.length; i++) {
        if (wx >= CAR_START[i] && wx <= CAR_START[i] + CAR_W[i]) return { car: i, on: true };
      }
      let car = 0;
      for (let i = 0; i < LAYOUT.length; i++) if (wx > CAR_START[i]) car = i;
      return { car, on: false };
    };

    let raf = 0;
    let last = performance.now();
    let hudAcc = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      st.t += dt;
      st.time -= dt;
      st.inv = Math.max(0, st.inv - dt);
      st.stun = Math.max(0, st.stun - dt);
      const speed = 150 + Math.min(80, st.t * 4) - (st.stun > 0 ? 100 : 0);
      st.scroll += speed * dt;
      st.vy += 1250 * dt;
      st.y += st.vy * dt;
      const wx = st.scroll + PLAYER_X;

      const here = carAt(wx);
      if (st.y >= ROOF) {
        if (here.on) {
          st.y = ROOF;
          st.vy = 0;
        } else if (st.y > ROOF + 60) {
          // 틈새에 떨어졌다: 다음 칸 앞으로 되돌려 놓는다
          if (st.inv <= 0) st.hearts -= 1;
          const next = Math.min(LAYOUT.length - 1, here.car + 1);
          st.scroll = CAR_START[next] - PLAYER_X + 24;
          st.y = ROOF;
          st.vy = 0;
          st.inv = 1.2;
        }
      }

      // 경비병
      for (const g of guards) {
        if (g.down) continue;
        const gx = CAR_START[g.car] + g.x;
        if (Math.abs(wx - gx) < 18 && st.y > ROOF - 30 && st.inv <= 0) {
          st.hearts -= 1;
          st.inv = 1.2;
          st.stun = 0.45;
          g.down = true; // 부딪히면 경비병도 나가떨어진다
        }
      }

      if (st.hearts <= 0) st.result = 'lose';
      else if (wx >= WORLD_END) st.result = 'win';
      else if (st.time <= 0) st.result = 'lose';

      draw(canvasRef.current, st, guards, me, foe);
      hudAcc += dt;
      if (hudAcc > 0.1 || st.result) {
        hudAcc = 0;
        setHud({ hearts: Math.max(0, st.hearts), time: Math.max(0, Math.ceil(st.time)), pct: Math.max(0, Math.min(1, (wx - CAR_START[0]) / (WORLD_END - CAR_START[0]))) });
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
      window.removeEventListener('keydown', onKey);
    };
  }, [phase, me, foe]);

  // 시작 전 화면 (그림이 올 때까지 몇 번 다시 그린다)
  useEffect(() => {
    if (phase !== 'ready') return;
    const idle: St = { scroll: CAR_START[0] - PLAYER_X + 50, y: ROOF, vy: 0, inv: 0, stun: 0, t: 0 };
    const redraw = () => draw(canvasRef.current, idle, [], me, foe);
    redraw();
    let n = 0;
    const iv = setInterval(() => {
      redraw();
      if (++n > 20) clearInterval(iv);
    }, 200); // 그림이 도착할 때까지 잠깐 다시 그린다
    return () => clearInterval(iv);
  }, [phase, me, foe]);

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-2">
      <div className="flex items-center justify-between gap-2 text-[14px] font-bold">
        <span className="truncate">{title}</span>
        <span className="font-latin tabular-nums">
          {'♥'.repeat(hud.hearts)}
          <span className="opacity-30">{'♥'.repeat(3 - hud.hearts)}</span> · {hud.time}초
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full border-2 border-ink bg-white">
        <div className="h-full bg-sticker" style={{ width: `${hud.pct * 100}%` }} />
      </div>
      <div
        className="relative overflow-hidden rounded-[10px] border-[3px] border-ink shadow-[4px_4px_0_#14171f]"
        onPointerDown={() => phaseRef.current === 'play' && jumpRef.current()}
      >
        <canvas ref={canvasRef} width={W} height={H} className="block aspect-[12/5] w-full touch-manipulation" />
        {phase !== 'play' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/60 p-4 text-center text-white">
            {phase === 'ready' && <p className="text-[22px] font-black">열차 습격!</p>}
            {phase === 'ready' && (
              <button type="button" onClick={() => setPhase('play')} className="h-11 rounded-[10px] border-2 border-ink bg-sticker px-6 text-[16px] font-black text-ink">
                달리기 시작
              </button>
            )}
            {(phase === 'win' || phase === 'lose') && (
              <>
                <p className="text-[24px] font-black">{phase === 'win' ? '금화를 털었어요!' : '실패했어요…'}</p>
                <button type="button" onClick={() => onDone(phase === 'win')} className="h-11 rounded-[10px] border-2 border-ink bg-sticker px-6 text-[16px] font-black text-ink">
                  계속
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {phase === 'ready' && (
        <p className="text-center text-[13px] leading-snug">달리는 열차 지붕 위를 달려요. 화면을 누르거나 스페이스를 눌러 뛰어서 틈새와 경비병을 넘고, 맨 끝 금화 칸까지 가세요.</p>
      )}
      {phase === 'ready' && (
        <button type="button" onClick={() => onDone(false)} className="mx-auto text-[13px] underline">
          습격 안 할래요
        </button>
      )}
    </div>
  );
}

function draw(canvas: HTMLCanvasElement | null, st: St, guards: Guard[], me: string, foe: string) {
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;
  ctx.fillStyle = '#cfd6cc';
  ctx.fillRect(0, 0, W, H);

  // 먼 풍경: 천천히 흘러가고, 양끝이 안 맞아서 한 칸씩 뒤집어 이어 붙인다
  const bg = art('train-bg.webp');
  if (bg) {
    const bh = H;
    const bw = (bg.naturalWidth * bh) / bg.naturalHeight;
    const off = (st.scroll * 0.35) % (bw * 2);
    for (let i = -1; i < 3; i++) {
      const x = i * bw - off;
      if (x > W || x + bw < 0) continue;
      ctx.save();
      if (((i % 2) + 2) % 2 === 1) {
        ctx.translate(x + bw, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(bg, 0, 0, bw, bh);
      } else ctx.drawImage(bg, x, 0, bw, bh);
      ctx.restore();
    }
  }

  // 기관차와 객차들
  const draw1 = (file: string, x: number, roofY: number, w: number, h: number) => {
    const im = art(file);
    if (!im || x > W + 20 || x + w < -20) return;
    ctx.drawImage(im, x, ROOF - roofY * K, w, h * K);
  };
  draw1(CAR.loco.file, CAR_START[0] - GAP - LOCO_W - st.scroll, CAR.loco.roofY + 18, LOCO_W, CAR.loco.h);
  LAYOUT.forEach((t, i) => {
    const x = CAR_START[i] - st.scroll;
    draw1(CAR[t].file, x, CAR[t].roofY, CAR_W[i], CAR[t].h);
    // 연결 사슬
    if (i > 0) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - GAP + 2, ROOF + 66);
      ctx.lineTo(x + 2, ROOF + 66);
      ctx.stroke();
    }
  });

  // 경비병
  const foeIm = art(`inf-${foe}.webp`);
  if (foeIm) {
    const gh = 46;
    const gw = (foeIm.naturalWidth * gh) / foeIm.naturalHeight;
    for (const g of guards) {
      const x = CAR_START[g.car] + g.x - st.scroll;
      if (x < -40 || x > W + 40) continue;
      ctx.save();
      ctx.translate(x, ROOF + (g.down ? 2 : 0));
      ctx.scale(-1, 1); // 달려오는 나를 바라본다
      if (g.down) ctx.rotate(-1.35);
      ctx.drawImage(foeIm, -gw / 2, -gh, gw, gh);
      ctx.restore();
    }
  }

  // 나
  const meIm = art(`inf-${me}.webp`);
  const flick = st.inv > 0 && Math.floor(st.t * 14) % 2 === 0;
  if (meIm && !flick) {
    const ph = 50;
    const pw = (meIm.naturalWidth * ph) / meIm.naturalHeight;
    const air = Math.max(0, ROOF - st.y);
    ctx.save();
    ctx.translate(PLAYER_X, st.y);
    ctx.fillStyle = 'rgba(20,23,31,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 1 + air, 13, 4, 0, 0, 7);
    ctx.fill();
    const bob = air > 1 ? 0 : Math.abs(Math.sin(st.t * 16)) * 2;
    ctx.rotate(air > 1 ? -0.12 : 0);
    ctx.drawImage(meIm, -pw / 2, -ph - bob, pw, ph);
    ctx.restore();
  }
}
