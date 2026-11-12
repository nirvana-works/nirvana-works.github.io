'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { H, NO_INPUT, W, cpuInput, newAi, newSim, step, type AiState, type Input, type Level, type Sfx, type Sim } from '@/lib/volleyEngine';
import { applySnap, bitsOf, encodeSim, extrapolate, inputOf, type Msg } from '@/lib/volleySync';
import { LOOK_1P, LOOK_2P, SPIKE_FX_LIFE, drawBackground, drawBall, drawNet, drawPlayer, drawShadow, drawSpikeFx, type SpikeFx } from './volleyArt';

type Status = 'menu' | 'playing' | 'paused' | 'over';
type Action = 'left' | 'right' | 'jump' | 'spike';

// 온라인 대결 연결. 방장(host)이 규칙을 계산하고, 손님(guest)은 입력만 보낸다
export interface Link {
  role: 'host' | 'guest';
  names: [string, string];
  target: number;
  linked: boolean; // 상대와 직접 연결돼 있는지
  send: (m: Msg, reliable?: boolean) => void;
  subscribe: (fn: (m: Msg) => void) => () => void;
}

const MUTE_KEY = 'hl_volley_mute';
const STEP_MS = 1000 / 60;
const LEVEL_LABEL: Record<Level, string> = { easy: '쉬움', normal: '보통', hard: '어려움' };
const NAME_LIFT = 40; // 머리 위 이름이 선수 중심에서 떨어진 거리

const blank = (): Input => ({ ...NO_INPUT });

export function NupjukVolley({ link }: { link?: Link }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<Sim | null>(null);
  const aiRef = useRef<AiState>(newAi());
  const statusRef = useRef<Status>(link ? 'playing' : 'menu');
  const levelRef = useRef<Level>('normal');
  const keys = useRef<Set<string>>(new Set());
  const touch = useRef<Input>(blank());
  const audioRef = useRef<AudioContext | null>(null);
  const mutedRef = useRef(false);
  const popup = useRef<{ text: string; t: number } | null>(null);
  const linkRef = useRef<Link | undefined>(link);
  const remoteIn = useRef<Input>(blank()); // 방장: 손님의 마지막 입력
  const snapAt = useRef(0); // 손님: 마지막 상태를 받은 시각
  const sentBits = useRef(-1);
  const sentTick = useRef(0);
  const fxRef = useRef<SpikeFx[]>([]); // 스파이크 충격 효과
  const shake = useRef(0); // 화면 흔들림 남은 프레임
  const freeze = useRef(0); // 스파이크 순간 잠깐 멈추는 틱

  const [level, setLevel] = useState<Level>('normal');
  const [target, setTarget] = useState(11);
  const [status, setStatus] = useState<Status>(link ? 'playing' : 'menu');
  const [winner, setWinner] = useState<0 | 1 | null>(null);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [muted, setMuted] = useState(false);

  linkRef.current = link;
  levelRef.current = level;
  const online = !!link;
  const names: [string, string] = link ? link.names : ['나', '봇'];
  const namesRef = useRef(names);
  namesRef.current = names;
  const me = link?.role === 'guest' ? 1 : 0;

  const setStatusBoth = useCallback((s: Status) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  // 소리: 브라우저 정책상 첫 누름 뒤에 켠다. 파일 없이 짧은 합성음
  const sfx = useCallback((kind: Sfx) => {
    if (mutedRef.current) return;
    const ac = audioRef.current;
    if (!ac) return;
    const t0 = ac.currentTime;
    const tone = (type: OscillatorType, f0: number, f1: number, dur: number, vol: number, at = 0) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t0 + at);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + at + dur);
      g.gain.setValueAtTime(vol, t0 + at);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
      o.connect(g).connect(ac.destination);
      o.start(t0 + at);
      o.stop(t0 + at + dur + 0.02);
    };
    switch (kind) {
      case 'bump': tone('triangle', 260, 150, 0.09, 0.22); break;
      case 'spike': tone('sawtooth', 190, 55, 0.16, 0.2); tone('square', 520, 120, 0.07, 0.08); break;
      case 'net': tone('square', 140, 90, 0.07, 0.1); break;
      case 'wall': tone('sine', 200, 160, 0.05, 0.08); break;
      case 'land': tone('sine', 110, 55, 0.18, 0.3); break;
      case 'serve': tone('triangle', 340, 480, 0.08, 0.12); break;
      case 'point': tone('triangle', 520, 520, 0.09, 0.16); tone('triangle', 660, 660, 0.09, 0.16, 0.1); tone('triangle', 800, 800, 0.14, 0.16, 0.2); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.16, 0.12, i * 0.13)); break;
    }
  }, []);

  const ensureAudio = useCallback(() => {
    if (audioRef.current) {
      if (audioRef.current.state === 'suspended') void audioRef.current.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) audioRef.current = new Ctor();
    } catch {
      // 소리 없이 진행
    }
  }, []);

  useEffect(() => {
    try {
      mutedRef.current = localStorage.getItem(MUTE_KEY) === '1';
      setMuted(mutedRef.current);
    } catch {
      // 저장소를 못 쓰는 브라우저
    }
  }, []);

  // 새 판 시작. 봇전은 바로, 온라인은 방장만 (손님은 방장이 보내 주는 상태를 따른다)
  const start = useCallback(() => {
    ensureAudio();
    const lk = linkRef.current;
    if (lk?.role === 'guest') {
      lk.send({ k: 'rematch' }, true);
      return;
    }
    simRef.current = newSim(lk ? lk.target : target, 0);
    aiRef.current = newAi();
    popup.current = null;
    setScore([0, 0]);
    setWinner(null);
    setStatusBoth('playing');
  }, [ensureAudio, setStatusBoth, target]);

  // 온라인: 연결되면 방장이 첫 판을 시작한다
  const linked = link?.linked ?? false;
  useEffect(() => {
    const lk = linkRef.current;
    if (!lk || !linked) return;
    if (lk.role === 'host' && (!simRef.current || simRef.current.phase === 'over')) start();
    if (lk.role === 'guest') {
      setStatusBoth('playing');
      ensureAudio();
    }
  }, [linked, start, setStatusBoth, ensureAudio]);

  // 온라인: 상대가 보내는 메시지
  useEffect(() => {
    if (!link) return;
    return link.subscribe((m) => {
      if (m.k === 'i') remoteIn.current = inputOf(m.v);
      else if (m.k === 'rematch') {
        if (linkRef.current?.role === 'host' && simRef.current?.phase === 'over') start();
      } else if (m.k === 's' && linkRef.current?.role === 'guest') {
        const sim = (simRef.current ??= newSim(m.s[6] || 11, 0));
        const prev: [number, number] = [sim.score[0], sim.score[1]];
        applySnap(sim, m.s);
        snapAt.current = performance.now();
        for (const e of m.e) sfx(e);
        if (m.e.includes('spike')) {
          fxRef.current.push({ x: sim.ball.x, y: sim.ball.y, age: 0 });
          shake.current = 12;
        }
        if (sim.score[0] !== prev[0] || sim.score[1] !== prev[1]) {
          setScore([sim.score[0], sim.score[1]]);
          const who = sim.score[0] !== prev[0] ? 0 : 1;
          popup.current = { text: `${namesRef.current[who]} 득점!`, t: 70 };
        }
        if (sim.phase === 'over' && statusRef.current !== 'over') {
          setWinner(sim.winner);
          setStatusBoth('over');
        } else if (sim.phase !== 'over' && statusRef.current === 'over') {
          setWinner(null);
          setStatusBoth('playing');
        }
      }
    });
  }, [link, sfx, start, setStatusBoth]);

  // 키보드
  useEffect(() => {
    const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);
    const down = (e: KeyboardEvent) => {
      const st = statusRef.current;
      const on = !!linkRef.current;
      if ((e.code === 'KeyP' || e.code === 'Escape') && !on) {
        if (st === 'playing') setStatusBoth('paused');
        else if (st === 'paused') setStatusBoth('playing');
        return;
      }
      if (st === 'playing' || st === 'paused' || on) {
        if (GAME_KEYS.has(e.code)) e.preventDefault();
      }
      if ((e.code === 'Enter' || e.code === 'Space') && (st === 'menu' || st === 'over')) {
        e.preventDefault();
        start();
        return;
      }
      if (e.code === 'Space' && st === 'paused') {
        setStatusBoth('playing');
        return;
      }
      keys.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const blur = () => {
      keys.current.clear();
      if (statusRef.current === 'playing' && !linkRef.current) setStatusBoth('paused');
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [setStatusBoth, start]);

  // 화면 크기에 맞춘 캔버스 + 배경 한 번 그리기
  useEffect(() => {
    const fit = () => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      const cssW = Math.min(wrap.clientWidth, 720);
      if (cssW < 10) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pxW = Math.round(cssW * dpr);
      const pxH = Math.round((pxW * H) / W);
      if (canvas.width !== pxW || canvas.height !== pxH) {
        canvas.width = pxW;
        canvas.height = pxH;
      }
      const bg = document.createElement('canvas');
      bg.width = pxW;
      bg.height = pxH;
      const bctx = bg.getContext('2d');
      if (bctx) {
        bctx.setTransform(pxW / W, 0, 0, pxW / W, 0, 0);
        drawBackground(bctx);
      }
      bgRef.current = bg;
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // 게임 루프
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let t = 0;

    // 이 기기에서 사람이 누르는 입력 (WASD와 방향키 모두 쓸 수 있다)
    const humanInput = (): Input => {
      const k = keys.current;
      const tc = touch.current;
      return {
        left: k.has('KeyA') || k.has('ArrowLeft') || tc.left,
        right: k.has('KeyD') || k.has('ArrowRight') || tc.right,
        jump: k.has('KeyW') || k.has('ArrowUp') || tc.jump,
        spike: k.has('Space') || k.has('KeyF') || k.has('KeyS') || k.has('KeyZ') || k.has('KeyX') || k.has('KeyL') || tc.spike,
      };
    };

    const onScore = (sim: Sim, prev0: number, prev1: number) => {
      if (sim.score[0] === prev0 && sim.score[1] === prev1) return;
      setScore([sim.score[0], sim.score[1]]);
      const who = sim.score[0] !== prev0 ? 0 : 1;
      popup.current = { text: linkRef.current ? `${namesRef.current[who]} 득점!` : who === 0 ? '득점!' : '봇 득점', t: 70 };
    };

    const tick = () => {
      const lk = linkRef.current;
      if (lk?.role === 'guest') {
        // 손님: 규칙은 방장이 계산한다. 입력이 바뀌면 바로, 아니면 가끔 알려 준다
        const bits = bitsOf(humanInput());
        sentTick.current++;
        if (lk.linked && (bits !== sentBits.current || sentTick.current % 8 === 0)) {
          sentBits.current = bits;
          lk.send({ k: 'i', v: bits });
        }
        return;
      }
      const sim = simRef.current;
      if (!sim || statusRef.current !== 'playing') return;
      if (lk && !lk.linked) return; // 상대가 끊기면 멈춘다
      if (freeze.current > 0) {
        freeze.current--; // 스파이크가 맞은 순간 잠깐 멈춰 임팩트를 준다
        return;
      }
      const in0 = humanInput();
      const in1 = lk ? remoteIn.current : cpuInput(sim, 1, levelRef.current, aiRef.current);
      const prev0 = sim.score[0];
      const prev1 = sim.score[1];
      step(sim, in0, in1);
      const events = sim.events.slice();
      for (const e of events) sfx(e);
      if (events.includes('spike')) {
        fxRef.current.push({ x: sim.ball.x, y: sim.ball.y, age: 0 });
        shake.current = 12;
        freeze.current = 4;
      }
      sim.events.length = 0;
      onScore(sim, prev0, prev1);
      if (lk) {
        sentTick.current++;
        if (sentTick.current % 2 === 0 || events.length) lk.send({ k: 's', s: encodeSim(sim), e: events });
      }
      if (sim.phase === 'over') {
        setWinner(sim.winner);
        setStatusBoth('over');
        if (lk) lk.send({ k: 's', s: encodeSim(sim), e: events }, true);
      }
    };

    const render = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const bg = bgRef.current;
      if (!canvas || !ctx || !bg || bg.width === 0 || canvas.width === 0) return;
      const k = canvas.width / W;
      const amp = shake.current > 0 ? (shake.current / 12) * 4 * k : 0;
      if (shake.current > 0) shake.current--;
      const ox = (Math.random() - 0.5) * 2 * amp;
      const oy = (Math.random() - 0.5) * 2 * amp;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#2a1b5c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(1, 0, 0, 1, ox, oy);
      ctx.drawImage(bg, 0, 0);
      ctx.setTransform(k, 0, 0, k, ox, oy);
      const sim = simRef.current ?? newSim(11, 0);
      let { players, ball } = sim;
      if (linkRef.current?.role === 'guest' && simRef.current) {
        const n = Math.min(6, (performance.now() - snapAt.current) / STEP_MS);
        ({ players, ball } = extrapolate(sim, Math.max(0, n)));
      }
      drawShadow(ctx, players[0].x, 26, 242 - players[0].y);
      drawShadow(ctx, players[1].x, 26, 242 - players[1].y);
      drawShadow(ctx, ball.x, 12, 258 - ball.y);
      drawNet(ctx);
      drawPlayer(ctx, players[0], 0, LOOK_1P, ball, t);
      drawPlayer(ctx, players[1], 1, LOOK_2P, ball, t);
      drawBall(ctx, ball);
      for (const fx of fxRef.current) drawSpikeFx(ctx, fx);
      fxRef.current = fxRef.current.filter((fx) => ++fx.age < SPIKE_FX_LIFE);

      ctx.save();
      ctx.textBaseline = 'alphabetic';
      ctx.lineJoin = 'round';
      const nm = namesRef.current;
      const mine = linkRef.current?.role === 'guest' ? 1 : 0;
      // 선수 머리 위 이름 (내 이름은 노랑)
      ctx.font = 'bold 10px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(30,15,60,0.8)';
      for (let i = 0; i < 2; i++) {
        const text = i === mine ? `▼ ${nm[i]}` : nm[i];
        const y = Math.max(14, players[i].y - NAME_LIFT);
        ctx.strokeText(text, players[i].x, y);
        ctx.fillStyle = i === mine ? '#ffe36b' : '#fff';
        ctx.fillText(text, players[i].x, y);
      }
      const label = (txt: string, x: number, align: CanvasTextAlign, color: string) => {
        ctx.textAlign = align;
        ctx.font = 'bold 10px Arial, sans-serif';
        ctx.fillStyle = color;
        ctx.fillText(txt, x, 20);
      };
      label(nm[0], 16, 'left', '#9fb8ff');
      label(nm[1], W - 16, 'right', '#ffc888');
      ctx.font = '900 30px "Arial Black", Arial, sans-serif';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#2a1b5c';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.strokeText(String(sim.score[0]), 16, 50);
      ctx.fillText(String(sim.score[0]), 16, 50);
      ctx.textAlign = 'right';
      ctx.strokeText(String(sim.score[1]), W - 16, 50);
      ctx.fillText(String(sim.score[1]), W - 16, 50);
      ctx.font = 'bold 9px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(`${sim.target}점 선취`, W / 2, 66);

      const pp = popup.current;
      if (pp && pp.t > 0) {
        pp.t--;
        ctx.globalAlpha = Math.min(1, pp.t / 20);
        ctx.font = '900 26px "Arial Black", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#2a1b5c';
        ctx.fillStyle = '#ffe36b';
        const y = 130 - (70 - pp.t) * 0.15;
        ctx.strokeText(pp.text, W / 2, y);
        ctx.fillText(pp.text, W / 2, y);
      }
      ctx.restore();
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const now = performance.now(); // rAF가 주는 시각은 기준이 달라 쓰지 않는다
      acc += Math.max(0, Math.min(now - last, 100));
      last = now;
      while (acc >= STEP_MS) {
        tick();
        acc -= STEP_MS;
        t++;
      }
      render();
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [setStatusBoth, sfx]);

  // 터치 버튼: 누르는 동안만 켜진다 (여러 손가락 동시 가능)
  const hold = (action: Action, on: boolean) => {
    touch.current[action] = on;
  };

  const toggleMute = () => {
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
    try {
      localStorage.setItem(MUTE_KEY, mutedRef.current ? '1' : '0');
    } catch {
      // 저장 못 해도 이번 방문엔 적용
    }
  };

  const seg = (on: boolean) =>
    `h-11 flex-1 rounded-[10px] border-2 px-2 text-[15px] font-bold ${on ? 'border-sticker bg-sticker text-ink' : 'border-white/40 bg-white/10 text-white'}`;
  const overTitle = online ? (winner === me ? '이겼다! 넙죽!' : `${names[winner ?? 0]} 승리!`) : winner === 0 ? '이겼다! 넙죽!' : '봇이 이겼어요…';

  return (
    <div ref={wrapRef} className="flex flex-col gap-3 select-none">
      <div className="relative mx-auto w-full max-w-[720px] overflow-hidden rounded-[12px] border-2 border-ink bg-[#2a1b5c]">
        <canvas ref={canvasRef} aria-label="넙죽이 배구 코트" className="block h-auto w-full" style={{ aspectRatio: `${W} / ${H}` }} />

        {status === 'playing' && !online && (
          <button
            type="button"
            onClick={() => setStatusBoth('paused')}
            aria-label="일시정지"
            className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/35 px-3 py-1 text-[12px] font-bold text-white"
          >
            ❚❚ 일시정지
          </button>
        )}
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? '소리 켜기' : '소리 끄기'}
          className="absolute right-2 bottom-2 grid h-8 w-8 place-items-center rounded-full bg-black/35 text-[14px] text-white"
        >
          {muted ? '🔇' : '🔊'}
        </button>

        {online && !linked && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-[rgba(27,18,51,0.78)] px-4 text-center text-[16px] font-bold text-white">
            상대와 연결이 끊겼어요. 다시 연결하는 중…
          </div>
        )}

        {(status === 'paused' || status === 'over') && (!online || linked) && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[rgba(27,18,51,0.78)] px-4 text-center text-white">
            {status === 'paused' && (
              <>
                <h2 className="text-[24px] font-black sm:text-[28px]">일시정지</h2>
                <button type="button" onClick={() => setStatusBoth('playing')} className="h-11 w-full max-w-[260px] rounded-[10px] border-2 border-ink bg-sticker text-[16px] font-black text-ink">
                  계속하기
                </button>
                <button type="button" onClick={() => setStatusBoth('menu')} className="min-h-[40px] text-[14px] font-bold underline underline-offset-4">
                  설정 바꾸기
                </button>
              </>
            )}
            {status === 'over' && (
              <>
                <p className="text-[12px] font-bold tracking-[0.2em] text-sticker">GAME SET</p>
                <h2 className="text-[22px] font-black leading-tight sm:text-[30px]">{overTitle}</h2>
                <p className="font-latin text-[20px] font-semibold sm:text-[24px]">
                  {score[0]} : {score[1]}
                </p>
                <button type="button" onClick={start} className="h-11 w-full max-w-[260px] rounded-[10px] border-2 border-ink bg-sticker text-[16px] font-black text-ink">
                  한 판 더 (Enter)
                </button>
                {!online && (
                  <button type="button" onClick={() => setStatusBoth('menu')} className="min-h-[40px] text-[14px] font-bold underline underline-offset-4">
                    설정 바꾸기
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {!online && status === 'menu' && (
        <div className="mx-auto flex w-full max-w-[720px] flex-col items-center gap-3 rounded-[12px] border-2 border-ink bg-[#1b1233] px-4 py-4 text-center text-white">
          <div>
            <p className="text-[12px] font-bold tracking-[0.2em] text-sticker">L.A. 1994 · SANTA MONICA</p>
            <h2 className="text-[30px] font-black leading-tight">봇과 대결</h2>
          </div>
          <div className="flex w-full max-w-[340px] flex-col gap-2">
            <div className="flex gap-2">
              {(['easy', 'normal', 'hard'] as Level[]).map((l) => (
                <button key={l} type="button" aria-pressed={level === l} onClick={() => setLevel(l)} className={seg(level === l)}>
                  {LEVEL_LABEL[l]}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {[7, 11, 15].map((n) => (
                <button key={n} type="button" aria-pressed={target === n} onClick={() => setTarget(n)} className={seg(target === n)}>
                  {n}점
                </button>
              ))}
            </div>
          </div>
          <button type="button" onClick={start} className="h-12 w-full max-w-[340px] rounded-[10px] border-2 border-ink bg-sticker text-[18px] font-black text-ink hover:bg-[#e3c900]">
            시작 (Enter)
          </button>
        </div>
      )}

      {/* 터치 조작 */}
      <div className="mx-auto flex w-full max-w-[720px] justify-between gap-3 md:hidden">
        <PadGroup actions={['left', 'right']} hold={hold} />
        <PadGroup actions={['jump', 'spike']} hold={hold} />
      </div>

      {/* 컴퓨터용 키 안내 */}
      <div className="mx-auto hidden w-full max-w-[720px] rounded-[10px] border-2 border-ink bg-white p-3 text-[13px] leading-relaxed md:block">
        <b>조작</b> · A D 또는 ← → 이동 · W 또는 ↑ 점프 · 점프 중 <b>스페이스(또는 F)</b> 스파이크
        {!online && ' · P 일시정지'}
        <br />
        <span className="text-inkMuted">공을 위로 띄워 상대 코트에 떨어뜨리면 1점. 점프해서 스파이크를 누르면 공을 내리꽂아요.</span>
      </div>
    </div>
  );
}

const PAD_LABEL: Record<Action, string> = { left: '◀', right: '▶', jump: '점프', spike: '스파이크' };

function PadGroup({ actions, hold }: { actions: Action[]; hold: (a: Action, on: boolean) => void }) {
  return (
    <div className="grid flex-1 grid-cols-2 gap-2">
      {actions.map((a) => (
        <button
          key={a}
          type="button"
          aria-label={PAD_LABEL[a]}
          onPointerDown={(e) => {
            e.preventDefault();
            hold(a, true);
          }}
          onPointerUp={() => hold(a, false)}
          onPointerLeave={() => hold(a, false)}
          onPointerCancel={() => hold(a, false)}
          onContextMenu={(e) => e.preventDefault()}
          className="grid h-[60px] touch-none select-none place-items-center rounded-[12px] border-2 border-ink bg-white text-[16px] font-black active:translate-y-[2px] active:bg-sticker"
        >
          {PAD_LABEL[a]}
        </button>
      ))}
    </div>
  );
}
