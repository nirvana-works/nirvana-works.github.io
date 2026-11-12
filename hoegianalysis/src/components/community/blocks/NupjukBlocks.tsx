'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  COLS,
  ROWS,
  cellsOf,
  createGame,
  dropInterval,
  ghostY,
  hardDrop,
  holdPiece,
  isGrounded,
  lock,
  move,
  rotate,
  shapeOf,
  softDrop,
  stackHeight,
  stepDown,
  type Game,
  type LockResult,
  type PieceType,
} from '@/lib/blocksEngine';
import { CHALK, rgba, sprite } from './chalk';
import { deviceId } from '@/lib/deviceId';

// 넙죽이 블록: 분필로 낙서한 칠판 위에서 떨어지는 블록을 쌓아 줄을 지운다. 키보드와 터치 모두 지원.

type Status = 'idle' | 'playing' | 'paused' | 'over';
type Mood = 'idle' | 'cheer' | 'wow' | 'worry' | 'over' | 'best';

const LOCK_MS = 500; // 바닥에 닿은 뒤 굳기까지 여유
const MAX_RESETS = 12; // 돌리고 밀면서 버틸 수 있는 횟수
const BEST_KEY = 'hl_blocks_best';
const NICK_KEY = 'hl_nick';

interface ScoreRow {
  id: string;
  name: string;
  score: number;
  lines: number;
  level: number;
}
const MOOD_IMG: Record<Mood, string> = {
  idle: '/hoegilab/blocks-mascot-idle.webp',
  cheer: '/hoegilab/blocks-mascot-cheer.webp',
  wow: '/hoegilab/blocks-mascot-wow.webp',
  worry: '/hoegilab/blocks-mascot-worry.webp',
  over: '/hoegilab/blocks-mascot-over.webp',
  best: '/hoegilab/blocks-mascot-best.webp',
};

// 줄을 지울 때 날리는 분필 효과 그림
const FX_DUST = [0, 1, 2, 3].map((i) => `/hoegilab/blocks-fx-dust${i}.webp`);
const FX_STAR = [0, 1, 2, 3].map((i) => `/hoegilab/blocks-fx-star${i}.webp`);
const FX_BOLT = [0, 1].map((i) => `/hoegilab/blocks-fx-bolt${i}.webp`);
const FX_FIREWORK = '/hoegilab/blocks-fx-firework.webp';
const fxCache = new Map<string, HTMLImageElement>();
const fxImg = (src: string) => {
  let im = fxCache.get(src);
  if (!im && typeof Image !== 'undefined') {
    im = new Image();
    im.src = src;
    fxCache.set(src, im);
  }
  return im;
};
interface Fx {
  src: string;
  x: number;
  y: number;
  size: number;
  rot: number;
  t0: number;
  dur: number;
  rise: number;
}

interface Hud {
  status: Status;
  score: number;
  lines: number;
  level: number;
  next: PieceType[];
  hold: PieceType | null;
  canHold: boolean;
  best: number;
  newBest: boolean;
}

const INITIAL_HUD: Hud = { status: 'idle', score: 0, lines: 0, level: 1, next: [], hold: null, canHold: true, best: 0, newBest: false };

// 작은 미리보기 상자 (다음 블록, 보관한 블록)
function MiniPiece({ type, cs, dim }: { type: PieceType | null; cs: number; dim?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const size = Math.round(cs * 4);
    c.width = size * dpr;
    c.height = Math.round(cs * 2.6) * dpr;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    if (!type) return;
    const cells = shapeOf(type, 0);
    const minX = Math.min(...cells.map(([x]) => x));
    const maxX = Math.max(...cells.map(([x]) => x));
    const minY = Math.min(...cells.map(([, y]) => y));
    const maxY = Math.max(...cells.map(([, y]) => y));
    const w = (maxX - minX + 1) * cs;
    const h = (maxY - minY + 1) * cs;
    const ox = (size - w) / 2;
    const oy = (Math.round(cs * 2.6) - h) / 2;
    cells.forEach(([x, y], i) => {
      ctx.globalAlpha = dim ? 0.4 : 1;
      ctx.drawImage(sprite(type, i === 1, 0, cs, dpr), (ox + (x - minX) * cs) * dpr, (oy + (y - minY) * cs) * dpr, cs * dpr, cs * dpr);
    });
  }, [type, cs, dim]);
  return <canvas ref={ref} className="block" style={{ width: Math.round(cs * 4), height: Math.round(cs * 2.6) }} aria-hidden />;
}

function Chip({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="chalkboard flex min-w-0 flex-1 flex-col items-center rounded-[10px] px-2 py-1 text-white"
      style={{ backgroundImage: 'url(/hoegilab/blocks-frame-0.webp)', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', border: 0, boxShadow: 'none' }}
    >
      <span className="font-pen text-[16px] leading-none text-white/75">{label}</span>
      <span className="font-latin text-[20px] font-semibold leading-tight tabular-nums">{value}</span>
    </div>
  );
}

const SAY: Record<string, string[]> = {
  start: ['쭉쭉 쌓아라!', '빈틈없이 채워 보거라~', '느긋하게, 하지만 재빠르게!'],
  clear1: ['한 줄 쓱싹!', '깔끔하다!'],
  clear2: ['두 줄이다!', '오오, 좋아 좋아!'],
  clear3: ['세 줄! 대단해!', '손이 불을 뿜는구나!'],
  clear4: ['네 줄 한 방! 넙죽!', '전설이 되려는가!'],
  level: ['레벨 업! 빨라진다~', '점점 재밌어지는구나!'],
  danger: ['으악, 너무 높아!', '식은땀이 줄줄…'],
  over: ['아이고… 다시 해 볼까?', '괜찮아, 한 판 더!'],
  best: ['신기록이다!', '내가 다 뿌듯하구나!'],
};
const pick = (k: string) => SAY[k][Math.floor(Math.random() * SAY[k].length)];

export function NupjukBlocks() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const statusRef = useRef<Status>('idle');
  const csRef = useRef(24);
  const soft = useRef(false);
  const accum = useRef({ drop: 0, lock: 0, resets: 0 });
  const particles = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);
  const flash = useRef<{ rows: number[]; t: number } | null>(null);
  const fx = useRef<Fx[]>([]);
  const bestRef = useRef(0);
  const levelRef = useRef(1);
  const sayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const [cs, setCs] = useState(24);
  const [mood, setMood] = useState<Mood>('idle');
  const [narrow, setNarrow] = useState(true);
  const [wide, setWide] = useState(false);
  const [scores, setScores] = useState<ScoreRow[] | null>(null);
  const [nick, setNick] = useState('');
  const [posted, setPosted] = useState<{ id: string; rank: number } | null>(null);
  const [posting, setPosting] = useState(false);
  const [postErr, setPostErr] = useState('');
  const [speech, setSpeech] = useState('넙죽이 블록에 어서 와!');

  const say = useCallback((text: string, m: Mood = 'idle', ms = 1800) => {
    setSpeech(text);
    setMood(m);
    if (sayTimer.current) clearTimeout(sayTimer.current);
    sayTimer.current = setTimeout(() => setMood('idle'), ms);
  }, []);

  const sync = useCallback((extra: Partial<Hud> = {}) => {
    const g = gameRef.current;
    setHud((prev) => ({
      ...prev,
      status: statusRef.current,
      score: g?.score ?? 0,
      lines: g?.lines ?? 0,
      level: g?.level ?? 1,
      next: g ? g.next.slice(0, 3) : [],
      hold: g?.hold ?? null,
      canHold: g?.canHold ?? true,
      best: bestRef.current,
      ...extra,
    }));
    levelRef.current = g?.level ?? 1;
  }, []);

  // 저장된 최고 점수
  useEffect(() => {
    try {
      bestRef.current = Number(localStorage.getItem(BEST_KEY)) || 0;
    } catch {
      // 저장소를 못 쓰는 브라우저면 이번 방문 동안만
    }
    setHud((h) => ({ ...h, best: bestRef.current }));
  }, []);

  // 화면 크기에 맞춰 칸 크기를 정한다. 폰은 옆 상자를 판 위로 올려 판을 가로로 꽉 차게, 컴퓨터는 옆에 둔다
  useEffect(() => {
    const calc = () => {
      const w = wrapRef.current?.clientWidth ?? 340;
      const isNarrow = w < 560;
      setNarrow(isNarrow);
      const isWide = w >= 780;
      setWide(isWide);
      let next: number;
      if (isNarrow) {
        const byW = Math.floor((w - 16) / COLS);
        const byH = Math.floor((window.innerHeight - 270) / ROWS);
        next = Math.min(byW, Math.max(26, byH), 34);
      } else {
        const byW = Math.floor((w - 150 - 12 - 16 - (isWide ? 262 : 0)) / COLS);
        const byH = Math.floor((window.innerHeight - 200) / ROWS);
        next = Math.min(byW, byH, 40);
      }
      next = Math.max(18, next);
      csRef.current = next;
      setCs(next);
    };
    calc();
    const ro = new ResizeObserver(calc);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener('resize', calc);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', calc);
    };
  }, []);

  // 점수판 불러오기와 기록 남기기
  const loadScores = useCallback(() => {
    fetch('/api/blocks/scores', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setScores(d.scores ?? []))
      .catch(() => setScores((prev) => prev ?? []));
  }, []);
  useEffect(() => {
    loadScores();
    try {
      setNick(localStorage.getItem(NICK_KEY) ?? '');
    } catch {
      // 저장소를 못 쓰면 매번 입력
    }
  }, [loadScores]);

  const postScore = async () => {
    const name = nick.trim();
    if (!name || posting) return;
    setPosting(true);
    setPostErr('');
    try {
      const res = await fetch('/api/blocks/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, score: hud.score, lines: hud.lines, level: hud.level, deviceId: deviceId() }),
      });
      const d = await res.json();
      if (!res.ok) {
        setPostErr(d.error ?? '기록하지 못했어요.');
      } else {
        setPosted({ id: d.id, rank: d.rank });
        setScores(d.scores);
        try {
          localStorage.setItem(NICK_KEY, name);
        } catch {
          // 저장 실패는 무시
        }
      }
    } catch {
      setPostErr('네트워크가 불안정해요. 다시 시도해 주세요.');
    } finally {
      setPosting(false);
    }
  };

  // ---------- 그리기 ----------
  const draw = useCallback(() => {
    const c = canvasRef.current;
    const g = gameRef.current;
    if (!c) return;
    const cell = csRef.current;
    const dpr = window.devicePixelRatio || 1;
    const W = COLS * cell;
    const H = ROWS * cell;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    }
    const ctx = c.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.scale(dpr, dpr);

    // 분필로 그은 옅은 칸 선
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < COLS; x++) {
      ctx.moveTo(x * cell, 0);
      ctx.lineTo(x * cell, H);
    }
    for (let y = 1; y < ROWS; y++) {
      ctx.moveTo(0, y * cell);
      ctx.lineTo(W, y * cell);
    }
    ctx.stroke();
    if (!g) return;

    // 쌓인 블록
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        const k = g.grid[y][x];
        if (k) ctx.drawImage(sprite(k.t, k.face, k.v, cell, dpr), x * cell, y * cell, cell, cell);
      }

    if (!g.over) {
      // 떨어질 자리 (점선 윤곽)
      const gy = ghostY(g);
      ctx.save();
      ctx.setLineDash([cell * 0.14, cell * 0.12]);
      ctx.strokeStyle = rgba(CHALK[g.piece.t], 0.6);
      ctx.lineWidth = 1.6;
      for (const [x, y] of cellsOf({ ...g.piece, y: gy })) {
        if (y >= 0) ctx.strokeRect(x * cell + cell * 0.1, y * cell + cell * 0.1, cell * 0.8, cell * 0.8);
      }
      ctx.restore();
      // 지금 블록
      cellsOf(g.piece).forEach(([x, y], i) => {
        if (y >= 0) ctx.drawImage(sprite(g.piece.t, i === g.piece.faceIdx, g.piece.v, cell, dpr), x * cell, y * cell, cell, cell);
      });
    }

    // 줄이 지워질 때 번쩍임과 분필 가루
    const f = flash.current;
    if (f) {
      const a = Math.max(0, 1 - (performance.now() - f.t) / 260);
      if (a <= 0) flash.current = null;
      else {
        ctx.fillStyle = `rgba(255,255,255,${0.45 * a})`;
        for (const r of f.rows) ctx.fillRect(0, r * cell, W, cell);
      }
    }
    ctx.fillStyle = '#fff';
    for (const p of particles.current) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, cell * 0.06), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // 분필 효과 그림 (먼지, 별, 번개, 불꽃)
    const now = performance.now();
    fx.current = fx.current.filter((e) => now - e.t0 < e.dur);
    for (const e of fx.current) {
      const im = fxImg(e.src);
      if (!im || !im.complete || !im.naturalWidth) continue;
      const k = (now - e.t0) / e.dur;
      ctx.save();
      ctx.globalAlpha = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
      ctx.translate(e.x, e.y - e.rise * k);
      ctx.rotate(e.rot * k);
      const sc = e.size * (0.7 + 0.5 * k);
      const w = (im.naturalWidth / im.naturalHeight) * sc;
      ctx.drawImage(im, -w / 2, -sc / 2, w, sc);
      ctx.restore();
    }
  }, []);

  // ---------- 규칙을 화면에 연결 ----------
  const afterLock = useCallback(
    (res: LockResult | null) => {
      const g = gameRef.current;
      if (!g || !res) return;
      accum.current = { drop: 0, lock: 0, resets: 0 };
      const prevLevel = levelRef.current;
      if (res.cleared.length) {
        flash.current = { rows: res.cleared, t: performance.now() };
        const cell = csRef.current;
        for (const r of res.cleared)
          for (let i = 0; i < 22; i++) particles.current.push({ x: Math.random() * COLS * cell, y: r * cell + cell / 2, vx: (Math.random() - 0.5) * 90, vy: -20 - Math.random() * 110, life: 1 });
        const n = res.cleared.length;
        const t0 = performance.now();
        const W = COLS * cell;
        const rnd = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
        for (const r of res.cleared) {
          const y = r * cell + cell / 2;
          fx.current.push({ src: rnd(FX_DUST), x: Math.random() * W, y, size: cell * 3.2, rot: (Math.random() - 0.5) * 1.2, t0, dur: 800, rise: cell * 1.2 });
          fx.current.push({ src: rnd(FX_DUST), x: Math.random() * W, y, size: cell * 2.6, rot: (Math.random() - 0.5) * 1.2, t0, dur: 700, rise: cell });
        }
        const mid = (res.cleared[0] + res.cleared[n - 1]) / 2 * cell + cell / 2;
        if (n >= 2) for (let i = 0; i < n; i++) fx.current.push({ src: rnd(FX_STAR), x: W * (0.2 + 0.6 * Math.random()), y: mid, size: cell * 1.8, rot: 1.5, t0, dur: 900, rise: cell * 2 });
        if (n >= 3) fx.current.push({ src: rnd(FX_BOLT), x: W / 2, y: mid, size: cell * 4.5, rot: 0, t0, dur: 600, rise: 0 });
        if (n >= 4) {
          fx.current.push({ src: FX_FIREWORK, x: W * 0.3, y: mid - cell * 2, size: cell * 6, rot: 0.3, t0, dur: 1100, rise: cell });
          fx.current.push({ src: FX_FIREWORK, x: W * 0.7, y: mid - cell * 3, size: cell * 6, rot: -0.3, t0: t0 + 150, dur: 1100, rise: cell });
        }
        say(g.level > prevLevel ? pick('level') : pick(`clear${n}`), n >= 4 ? 'wow' : 'cheer');
      } else if (stackHeight(g) >= 15) {
        say(pick('danger'), 'worry', 2200);
      }
      if (res.gameOver) {
        statusRef.current = 'over';
        const isBest = g.score > bestRef.current;
        if (isBest) {
          bestRef.current = g.score;
          try {
            localStorage.setItem(BEST_KEY, String(g.score));
          } catch {
            // 저장 실패는 무시
          }
        }
        say(isBest ? pick('best') : pick('over'), isBest ? 'best' : 'over', 600000);
        sync({ newBest: isBest });
      } else sync();
    },
    [say, sync],
  );

  const resetLockTimer = useCallback(() => {
    const g = gameRef.current;
    if (g && isGrounded(g) && accum.current.resets < MAX_RESETS) {
      accum.current.lock = 0;
      accum.current.resets++;
    }
  }, []);

  const act = useCallback(
    (name: 'left' | 'right' | 'cw' | 'ccw' | 'soft' | 'hard' | 'hold') => {
      const g = gameRef.current;
      if (!g || statusRef.current !== 'playing') return;
      if (name === 'left' || name === 'right') {
        if (move(g, name === 'left' ? -1 : 1)) resetLockTimer();
      } else if (name === 'cw' || name === 'ccw') {
        if (rotate(g, name === 'cw' ? 1 : -1)) resetLockTimer();
      } else if (name === 'soft') {
        if (softDrop(g)) accum.current.drop = 0;
      } else if (name === 'hard') {
        afterLock(hardDrop(g));
      } else if (name === 'hold') {
        if (holdPiece(g)) {
          accum.current = { drop: 0, lock: 0, resets: 0 };
        }
      }
      sync();
    },
    [afterLock, resetLockTimer, sync],
  );

  const start = useCallback(() => {
    gameRef.current = createGame();
    statusRef.current = 'playing';
    accum.current = { drop: 0, lock: 0, resets: 0 };
    particles.current = [];
    fx.current = [];
    flash.current = null;
    soft.current = false;
    setPosted(null);
    setPostErr('');
    say(pick('start'), 'idle');
    sync({ newBest: false });
    boardRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [say, sync]);

  const pause = useCallback(() => {
    if (statusRef.current === 'playing') {
      statusRef.current = 'paused';
      sync();
    } else if (statusRef.current === 'paused') {
      statusRef.current = 'playing';
      sync();
    }
  }, [sync]);

  // ---------- 게임 루프 ----------
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(now - last, 100);
      last = now;
      const g = gameRef.current;
      if (g && statusRef.current === 'playing' && !g.over) {
        const a = accum.current;
        const iv = soft.current ? Math.min(45, dropInterval(g.level)) : dropInterval(g.level);
        if (isGrounded(g)) {
          a.lock += dt;
          if (a.lock >= LOCK_MS) {
            afterLock(lock(g));
          }
        } else {
          a.drop += dt;
          while (a.drop >= iv && !isGrounded(g)) {
            a.drop -= iv;
            if (soft.current) g.score += 1;
            stepDown(g);
          }
        }
      }
      // 분필 가루 움직임
      const ps = particles.current;
      for (const p of ps) {
        p.x += (p.vx * dt) / 1000;
        p.y += (p.vy * dt) / 1000;
        p.vy += (160 * dt) / 1000;
        p.life -= dt / 700;
      }
      particles.current = ps.filter((p) => p.life > 0);
      draw();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [afterLock, draw]);

  // 점수 표시는 가끔 따라잡게 한다
  useEffect(() => {
    if (hud.status !== 'playing') return;
    const id = setInterval(() => sync(), 400);
    return () => clearInterval(id);
  }, [hud.status, sync]);

  // 탭을 떠나면 자동 일시정지
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && statusRef.current === 'playing') pause();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [pause]);

  // ---------- 키보드 ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = statusRef.current;
      const k = e.key;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (st === 'idle' || st === 'over') {
        if (k === 'Enter') {
          e.preventDefault();
          start();
        }
        return;
      }
      const game = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'x', 'X', 'z', 'Z', 'c', 'C', 'Shift'];
      if (game.includes(k)) e.preventDefault();
      if (k === 'p' || k === 'P' || k === 'Escape') {
        pause();
        return;
      }
      if (st !== 'playing') return;
      if (k === 'ArrowLeft') act('left');
      else if (k === 'ArrowRight') act('right');
      else if (k === 'ArrowDown') {
        soft.current = true;
        if (!e.repeat) act('soft');
      } else if (e.repeat) return;
      else if (k === 'ArrowUp' || k === 'x' || k === 'X') act('cw');
      else if (k === 'z' || k === 'Z') act('ccw');
      else if (k === ' ') act('hard');
      else if (k === 'c' || k === 'C' || k === 'Shift') act('hold');
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') soft.current = false;
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onUp);
    };
  }, [act, pause, start]);

  // ---------- 터치: 판 위에서 스와이프 ----------
  const touch = useRef<{ id: number; x0: number; y0: number; t0: number; lx: number; ly: number; moved: boolean } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    if (statusRef.current !== 'playing') return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); // 손가락이 판 밖으로 나가도 계속 따라간다
    } catch {
      // 캡처를 못 해도 동작에는 지장 없다
    }
    touch.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), lx: e.clientX, ly: e.clientY, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const t = touch.current;
    if (!t || t.id !== e.pointerId) return;
    const cell = csRef.current;
    const dx = e.clientX - t.lx;
    const dy = e.clientY - t.ly;
    if (Math.abs(dx) >= cell * 0.9 && Math.abs(dx) > Math.abs(e.clientY - t.y0) * 0.6) {
      act(dx > 0 ? 'right' : 'left');
      t.lx = e.clientX;
      t.moved = true;
    }
    if (dy >= cell * 0.9) {
      act('soft');
      t.ly = e.clientY;
      t.moved = true;
    }
  };
  const onUpPtr = (e: React.PointerEvent) => {
    const t = touch.current;
    if (!t || t.id !== e.pointerId) return;
    touch.current = null;
    const dt = performance.now() - t.t0;
    const dy = e.clientY - t.y0;
    const dist = Math.hypot(e.clientX - t.x0, dy);
    if (dist < 12 && dt < 280) act('cw'); // 톡 치면 회전
    else if (dy > csRef.current * 3 && dt < 320 && dy / dt > 0.5) act('hard'); // 아래로 휙 쓸면 바로 떨어뜨리기
  };

  // ---------- 화면의 버튼 (길게 누르면 반복) ----------
  const repeat = useRef<{ delay?: ReturnType<typeof setTimeout>; iv?: ReturnType<typeof setInterval> }>({});
  const stopRepeat = useCallback(() => {
    if (repeat.current.delay) clearTimeout(repeat.current.delay);
    if (repeat.current.iv) clearInterval(repeat.current.iv);
    repeat.current = {};
    soft.current = false;
  }, []);
  const pressStart = (name: 'left' | 'right' | 'soft', e: React.PointerEvent) => {
    e.preventDefault();
    stopRepeat();
    if (name === 'soft') soft.current = true;
    act(name);
    repeat.current.delay = setTimeout(() => {
      repeat.current.iv = setInterval(() => act(name), name === 'soft' ? 45 : 70);
    }, 200);
  };
  useEffect(() => stopRepeat, [stopRepeat]);

  const padBtn =
    'chalkboard grid h-[58px] select-none place-items-center rounded-[12px] font-pen text-[22px] leading-none text-white active:translate-y-[2px] active:brightness-125 touch-manipulation';
  const icon = (n: string) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/hoegilab/blocks-icon-${n}.webp`} alt="" aria-hidden draggable={false} className="pointer-events-none h-[34px] w-auto max-w-[80%] object-contain" />
  );

  const W = COLS * cs;
  const H = ROWS * cs;
  const danger = hud.status === 'playing' && gameRef.current ? stackHeight(gameRef.current) >= 15 : false;

  const leaderboard = (
    <section className={`chalkboard rounded-[10px] p-3 text-white ${wide ? 'flex w-[250px] shrink-0 flex-col' : ''}`}
      style={wide ? { height: H + 16 } : undefined} aria-label="점수판">
      <h2 className="mb-2 text-center font-pen text-[26px] leading-none">명예의 전당 TOP 10</h2>
      {scores === null ? (
        <p className="py-4 text-center text-[13px] text-white/60">불러오는 중…</p>
      ) : scores.length === 0 ? (
        <p className="py-4 text-center font-pen text-[20px] text-white/70">아직 기록이 없어요. 첫 번째 주인공이 되어 보세요!</p>
      ) : (
        <ol className={`flex flex-col gap-1 ${wide ? 'flex-1 justify-between' : ''}`}>
          {scores.map((r, i) => (
            <li key={r.id} className={`flex items-center gap-2 rounded-[8px] px-2 py-1 ${posted?.id === r.id ? 'bg-sticker/25' : ''}`}>
              <span className={`w-7 shrink-0 text-center font-pen text-[22px] leading-none ${i < 3 ? 'text-sticker' : 'text-white/70'}`}>{i + 1}</span>
              <span className="min-w-0 flex-1 truncate font-pen text-[20px] leading-none">{r.name}</span>
              <span className="shrink-0 text-[11px] text-white/55">{r.lines}줄</span>
              <span className="w-[68px] shrink-0 text-right font-latin text-[16px] font-semibold tabular-nums">{r.score.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );

  return (
    <div ref={wrapRef}>
    <div className={`flex flex-col gap-3 select-none ${wide ? 'mx-auto w-fit' : ''}`}>
      {/* 컴퓨터에서는 점수 칩/키 안내 폭을 아래 게임 화면(다음·판·명예의 전당) 폭에 맞춘다 */}
      <div className={`flex gap-2 ${wide ? 'w-0 min-w-full' : ''}`}>
        <Chip label="점수" value={hud.score} />
        <Chip label="줄" value={hud.lines} />
        <Chip label="레벨" value={hud.level} />
        <Chip label="최고" value={hud.best} />
      </div>

      {narrow && (
        <div className="flex items-stretch gap-2">
          <div className="chalkboard flex flex-1 flex-col items-center rounded-[10px] p-1">
            <p className="text-center font-pen text-[15px] leading-none text-white/85">보관</p>
            <MiniPiece type={hud.hold} cs={11} dim={!hud.canHold} />
          </div>
          <div className="chalkboard flex flex-[2] flex-col items-center rounded-[10px] p-1">
            <p className="text-center font-pen text-[15px] leading-none text-white/85">다음</p>
            <div className="flex">
              {hud.next.slice(0, 3).map((t, i) => (
                <MiniPiece key={i} type={t} cs={11} dim={i > 0} />
              ))}
            </div>
          </div>
          <div className="relative flex flex-[2] items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MOOD_IMG[mood === 'idle' && danger ? 'worry' : mood]} alt="" aria-hidden className={`h-[64px] w-auto shrink-0 object-contain ${mood === 'cheer' || mood === 'wow' ? 'animate-bounce' : ''}`} />
            <p className="flex min-h-[44px] flex-1 items-center justify-center px-1.5 text-center font-pen text-[14px] leading-tight text-white" style={{ backgroundImage: 'url(/hoegilab/blocks-frame-1.webp)', backgroundSize: '100% 100%', backgroundColor: '#27342f', borderRadius: 6 }}>
              {speech}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start justify-center gap-3">
        {/* 칠판 */}
        <div ref={boardRef} className="chalkboard relative shrink-0 rounded-[10px] p-2" style={{ width: W + 16 }}>
          <div
            className="relative touch-none overscroll-contain"
            style={{ width: W, height: H }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUpPtr}
            onPointerCancel={() => (touch.current = null)}
          >
            <canvas ref={canvasRef} style={{ width: W, height: H }} className="block" aria-label="넙죽이 블록 판" />
            {hud.status !== 'playing' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#1f2b27]/96 px-3 text-center text-white">
                {hud.status === 'idle' && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={MOOD_IMG.idle} alt="" aria-hidden className="h-[32%] w-auto" />
                    <p className="font-pen text-[36px] leading-none">넙죽이 블록</p>
                    <p className="font-pen text-[20px] leading-tight text-white/80">떨어지는 블록을 쌓아 줄을 지워요</p>
                  </>
                )}
                {hud.status === 'paused' && <p className="font-pen text-[40px] leading-none">잠깐 쉬는 중</p>}
                {hud.status === 'over' && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={hud.newBest ? MOOD_IMG.best : MOOD_IMG.over} alt="" aria-hidden className="h-[22%] w-auto" />
                    <p className="font-pen text-[34px] leading-none">{hud.newBest ? '신기록!' : '게임 끝!'}</p>
                    <p className="font-latin text-[20px] font-semibold">{hud.score}점</p>
                    {hud.score > 0 &&
                      (posted ? (
                        <p className="font-pen text-[22px] leading-tight text-sticker">{posted.rank <= 10 ? `${posted.rank}등으로 올랐어요!` : `${posted.rank}등으로 기록했어요`}</p>
                      ) : (
                        <div className="flex w-full max-w-[220px] flex-col gap-1.5">
                          <div className="flex gap-1.5">
                            <input
                              value={nick}
                              onChange={(e) => setNick(e.target.value)}
                              onKeyDown={(e) => {
                                // 한글 조합 중 Enter는 조합 확정용이라 기록으로 보내지 않는다
                                if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) postScore();
                              }}
                              placeholder="이름 (10자까지)"
                              maxLength={10}
                              aria-label="점수판에 남길 이름"
                              className="min-w-0 flex-1 rounded-[8px] border-2 border-white/60 bg-transparent px-2 py-1 text-[15px] text-white placeholder:text-white/50"
                            />
                            <button type="button" onClick={postScore} disabled={posting || !nick.trim()} className="shrink-0 rounded-[8px] border-2 border-ink bg-white px-2.5 font-pen text-[18px] leading-none text-ink disabled:opacity-50">
                              {posting ? '…' : '기록'}
                            </button>
                          </div>
                          {postErr && <p className="text-[12px] text-[#ffb0b0]">{postErr}</p>}
                        </div>
                      ))}
                  </>
                )}
                <button
                  type="button"
                  onClick={hud.status === 'paused' ? pause : start}
                  className="rounded-[12px] border-2 border-ink bg-sticker px-6 py-2 font-pen text-[28px] leading-none text-ink hover:bg-[#e3c900]"
                >
                  {hud.status === 'paused' ? '계속하기' : hud.status === 'over' ? '다시 하기' : '시작하기'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 옆 상자 (컴퓨터) */}
        {!narrow && (
          <aside className="order-first flex shrink-0 flex-col gap-2" style={{ width: Math.max(110, Math.min(170, Math.round(cs * 4.6))) }}>
            <div className="chalkboard rounded-[10px] p-1.5">
              <p className="text-center font-pen text-[18px] leading-none text-white/85">다음</p>
              <div className="flex flex-col items-center">
                {hud.next.slice(0, 3).map((t, i) => (
                  <MiniPiece key={i} type={t} cs={Math.max(9, Math.round(cs * 0.55))} dim={i > 0} />
                ))}
              </div>
            </div>
            <div className="chalkboard rounded-[10px] p-1.5">
              <p className="text-center font-pen text-[18px] leading-none text-white/85">보관</p>
              <div className="flex justify-center">
                <MiniPiece type={hud.hold} cs={Math.max(9, Math.round(cs * 0.55))} dim={!hud.canHold} />
              </div>
            </div>
            <div className="relative flex flex-col items-center">
              <p
                className="relative mb-2 flex min-h-[54px] w-full items-center justify-center px-2 pb-3 pt-1.5 text-center font-pen text-[16px] leading-tight text-white"
                style={{ backgroundImage: 'url(/hoegilab/blocks-frame-1.webp)', backgroundSize: '100% 100%', backgroundColor: '#27342f', borderRadius: 6 }}
              >
                {speech}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={MOOD_IMG[mood === 'idle' && danger ? 'worry' : mood]} alt="" aria-hidden className={`h-[110px] w-auto max-w-full object-contain ${mood === 'cheer' || mood === 'wow' ? 'animate-bounce' : ''}`} />
            </div>
            <button
              type="button"
              onClick={pause}
              disabled={hud.status !== 'playing' && hud.status !== 'paused'}
              className="chalkboard h-10 rounded-[10px] font-pen text-[20px] leading-none text-white disabled:opacity-40"
            >
              {hud.status === 'paused' ? '계속' : '일시정지'}
            </button>
          </aside>
        )}
        {wide && leaderboard}
      </div>

      {/* 폰용 버튼 */}
      <div className="grid grid-cols-5 gap-2 md:hidden" aria-label="조작 버튼">
        <button type="button" aria-label="왼쪽" className={padBtn} onPointerDown={(e) => pressStart('left', e)} onPointerUp={stopRepeat} onPointerLeave={stopRepeat} onPointerCancel={stopRepeat}>
          {icon('left')}
        </button>
        <button type="button" aria-label="오른쪽" className={padBtn} onPointerDown={(e) => pressStart('right', e)} onPointerUp={stopRepeat} onPointerLeave={stopRepeat} onPointerCancel={stopRepeat}>
          {icon('right')}
        </button>
        <button type="button" aria-label="돌리기" className={padBtn} onPointerDown={(e) => (e.preventDefault(), act('cw'))}>
          {icon('rotate')}
        </button>
        <button type="button" aria-label="아래로" className={padBtn} onPointerDown={(e) => pressStart('soft', e)} onPointerUp={stopRepeat} onPointerLeave={stopRepeat} onPointerCancel={stopRepeat}>
          {icon('down')}
        </button>
        <button type="button" aria-label="바로 떨어뜨리기" className={padBtn} onPointerDown={(e) => (e.preventDefault(), act('hard'))}>
          {icon('hard')}
        </button>
        <button type="button" aria-label="보관" className={`${padBtn} col-span-5 h-[44px] !flex items-center justify-center gap-2`} onPointerDown={(e) => (e.preventDefault(), act('hold'))}>
          <span className="[&_img]:h-[28px]">{icon('hold')}</span>
          블록 보관하기
        </button>
      </div>
      <p className="text-center text-[12px] text-inkMuted md:hidden">판을 톡 치면 회전, 좌우로 밀면 이동, 아래로 휙 쓸면 바로 떨어져요.</p>

      {narrow && (
        <button
          type="button"
          onClick={pause}
          disabled={hud.status !== 'playing' && hud.status !== 'paused'}
          className="chalkboard -mt-1 h-9 rounded-[10px] font-pen text-[18px] leading-none text-white disabled:opacity-40"
        >
          {hud.status === 'paused' ? '계속하기' : '일시정지'}
        </button>
      )}

      {!wide && leaderboard}


      {/* 컴퓨터용 키 안내 */}
      <div className={`hidden rounded-[10px] border-2 border-ink bg-white p-3 text-[13px] leading-relaxed md:block ${wide ? 'w-0 min-w-full' : ''}`}>
        <b>키보드</b> · ← → 이동 · ↑ 또는 X 돌리기 · Z 반대로 돌리기 · ↓ 천천히 내리기 · 스페이스 바로 떨어뜨리기 · C 또는 Shift 보관 · P 일시정지 · Enter 시작
      </div>
    </div>
    </div>
  );
}
