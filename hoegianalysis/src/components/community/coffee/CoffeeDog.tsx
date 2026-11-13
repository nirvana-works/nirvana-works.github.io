'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { detectCardLike, type Found } from '@/lib/cardDetect';
import { fieldClass, yellowButtonClass } from '../formStyles';

type Step = 'setup' | 'register' | 'pick' | 'result';
type Mode = 'camera' | 'names';
type Reg = { kind: 'photo'; src: string } | { kind: 'name'; text: string };

// 찍을 때마다 멍멍이가 한마디 한다
const DOG_LINES = ['킁킁… 이 카드, 커피 냄새가 나는데?', '음… 지갑이 두둑한 냄새가 나요!', '꼬리가 살랑살랑… 기억해 둘게요!', '멍! 수상한 향기… 일단 접수!', '킁킁킁… 오늘 얻어먹을 상인가?'];

const MIN_PEOPLE = 2;
const MAX_PEOPLE = 12;
const HOLD_MS = 1300; // 카드나 폰을 이만큼 가만히 보여 주면 등록된다
const ANALYZE_W = 160;
const ANALYZE_EVERY_MS = 90;

// 공정한 무작위: 0 이상 n 미만
function randomIndex(n: number): number {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / n) * n;
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % n;
}

export function CoffeeDog() {
  const [step, setStep] = useState<Step>('setup');
  const [count, setCount] = useState(4);
  const [mode, setMode] = useState<Mode>('camera');
  const [regs, setRegs] = useState<Reg[]>([]);
  const [camState, setCamState] = useState<'idle' | 'starting' | 'on' | 'error'>('idle');
  const [camError, setCamError] = useState('');
  const [attempt, setAttempt] = useState(0); // 다시 시도 누를 때마다 올라간다
  const [progress, setProgress] = useState(0);
  const [hint, setHint] = useState('카드나 핸드폰을 화면 가운데에 보여 주세요');
  const [flash, setFlash] = useState(false);
  const [last, setLast] = useState<{ src: string; n: number; line: string } | null>(null); // 방금 찍은 것 바로 보여 주기
  const capturedAt = useRef(0);
  const [nameInput, setNameInput] = useState('');
  const [cursor, setCursor] = useState(-1); // 킁킁 중인 칸
  const [picked, setPicked] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const foundRef = useRef<Found | null>(null);
  const armedRef = useRef(true); // 다음 사람 차례: 앞 물건이 화면에서 사라져야 다시 인식한다
  const absentSince = useRef(0);
  const stableRef = useRef<{ cx: number; cy: number; w: number; start: number } | null>(null);
  const regsRef = useRef<Reg[]>([]);
  const audioRef = useRef<AudioContext | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  regsRef.current = regs;

  const bark = useCallback((kind: 'sniff' | 'bark') => {
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ac = (audioRef.current ??= new Ctor());
      if (ac.state === 'suspended') void ac.resume();
      const t0 = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = kind === 'bark' ? 'sawtooth' : 'triangle';
      const f0 = kind === 'bark' ? 420 : 260;
      const f1 = kind === 'bark' ? 140 : 200;
      o.frequency.setValueAtTime(f0, t0);
      o.frequency.exponentialRampToValueAtTime(f1, t0 + (kind === 'bark' ? 0.18 : 0.05));
      g.gain.setValueAtTime(kind === 'bark' ? 0.28 : 0.07, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + (kind === 'bark' ? 0.2 : 0.06));
      o.connect(g).connect(ac.destination);
      o.start(t0);
      o.stop(t0 + 0.22);
    } catch {
      // 소리 없이 진행
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // 사진처럼 잘라 담기: 기울어진 물건을 바로 세워서 잘라낸다
  const capture = useCallback((f: Found | null): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    // 인식이 없으면 화면 가운데 가로로 긴 부분을 그대로 담는다
    const cx = (f ? f.cx : 0.5) * vw;
    const cy = (f ? f.cy : 0.5) * vh;
    const long = (f ? f.w : 0.6) * vw * 1.07;
    const short = (f ? f.h : 0.38) * vw * 1.07;
    let a = f ? f.angle : 0;
    while (a > Math.PI / 2) a -= Math.PI;
    while (a <= -Math.PI / 2) a += Math.PI;
    const vertical = Math.abs(a) > Math.PI / 4;
    const rot = vertical ? a - Math.sign(a) * (Math.PI / 2) : a;
    const outW = vertical ? short : long;
    const outH = vertical ? long : short;
    const scale = Math.min(1, 360 / Math.max(outW, outH));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(40, Math.round(outW * scale));
    canvas.height = Math.max(40, Math.round(outH * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(-rot);
    ctx.scale(scale, scale);
    ctx.drawImage(video, -cx, -cy);
    return canvas.toDataURL('image/jpeg', 0.82);
  }, []);

  const addReg = useCallback((reg: Reg) => {
    if (reg.kind === 'photo') {
      setLast({ src: reg.src, n: regsRef.current.length + 1, line: DOG_LINES[Math.floor(Math.random() * DOG_LINES.length)] });
      capturedAt.current = performance.now();
    }
    setRegs((r) => [...r, reg]);
    setProgress(0);
    stableRef.current = null;
    armedRef.current = false;
    absentSince.current = 0;
    setFlash(true);
    setTimeout(() => setFlash(false), 220);
  }, []);

  const registerNow = useCallback(
    (f: Found | null) => {
      const src = capture(f);
      if (src) addReg({ kind: 'photo', src });
    },
    [addReg, capture],
  );

  // 카메라 켜기 / 끄기
  useEffect(() => {
    if (step !== 'register' || mode !== 'camera') return;
    let cancelled = false;
    (async () => {
      setCamError('');
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        // 폰에서 http://192.168… 같은 주소로 열면 브라우저가 카메라를 막는다 (https 또는 localhost만 가능)
        setCamError('이 주소로는 카메라를 쓸 수 없어요. 보안 연결(https) 주소로 열어 주세요. 컴퓨터에서는 localhost로 열면 돼요.');
        setCamState('error');
        return;
      }
      setCamState('starting');
      const ask = (video: MediaTrackConstraints | boolean) => navigator.mediaDevices.getUserMedia({ video, audio: false });
      try {
        let stream: MediaStream;
        try {
          stream = await ask({ facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 960 } });
        } catch (first) {
          // 뒷 카메라나 해상도 조건 때문에 안 되면 조건 없이 한 번 더
          const name = (first as DOMException)?.name;
          if (name === 'NotAllowedError' || name === 'SecurityError') throw first;
          stream = await ask(true);
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.muted = true;
          video.setAttribute('playsinline', '');
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        setCamState('on');
      } catch (err) {
        if (cancelled) return;
        const name = (err as DOMException)?.name;
        setCamError(
          name === 'NotAllowedError' || name === 'SecurityError'
            ? '카메라 사용이 막혀 있어요. 주소창 옆 자물쇠(또는 카메라 아이콘)에서 카메라를 "허용"으로 바꾼 뒤 다시 시도해 주세요.'
            : name === 'NotFoundError' || name === 'OverconstrainedError'
              ? '카메라를 찾지 못했어요. 카메라가 달린 기기인지 확인해 주세요.'
              : name === 'NotReadableError' || name === 'AbortError'
                ? '다른 앱이 카메라를 쓰고 있는 것 같아요. 그 앱을 닫고 다시 시도해 주세요.'
                : '카메라를 켜지 못했어요. 다시 시도해 주세요.',
        );
        setCamState('error');
      }
    })();
    return () => {
      cancelled = true;
      stopCamera();
      setCamState('idle');
    };
  }, [step, mode, stopCamera, attempt]);

  // 인식 루프: 카드·핸드폰 모양을 찾아 박스를 그리고, 가만히 있으면 등록한다
  useEffect(() => {
    if (step !== 'register' || mode !== 'camera' || camState !== 'on') return;
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video || !overlay) return;
    const small = document.createElement('canvas');
    const sctx = small.getContext('2d', { willReadFrequently: true });
    if (!sctx) return;
    let raf = 0;
    let lastAnalyze = 0;

    const draw = () => {
      const w = overlay.clientWidth;
      const h = overlay.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (overlay.width !== Math.round(w * dpr)) {
        overlay.width = Math.round(w * dpr);
        overlay.height = Math.round(h * dpr);
      }
      const ctx = overlay.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const f = foundRef.current;
      if (!f) return;
      const hw = (f.w * w) / 2;
      const hh = (f.h * w) / 2; // h는 가로 기준으로 정규화했다
      ctx.save();
      ctx.translate(f.cx * w, f.cy * h);
      ctx.rotate(f.angle);
      ctx.lineWidth = 4;
      ctx.strokeStyle = armedRef.current ? '#F2D80E' : 'rgba(255,255,255,0.6)';
      ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
      ctx.restore();
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - lastAnalyze >= ANALYZE_EVERY_MS && video.videoWidth) {
        lastAnalyze = now;
        const aw = ANALYZE_W;
        const ah = Math.round((ANALYZE_W * video.videoHeight) / video.videoWidth);
        small.width = aw;
        small.height = ah;
        sctx.drawImage(video, 0, 0, aw, ah);
        const f = detectCardLike(sctx.getImageData(0, 0, aw, ah).data, aw, ah);
        foundRef.current = f;

        if (!f) {
          stableRef.current = null;
          setProgress(0);
          if (!armedRef.current) {
            if (!absentSince.current) absentSince.current = now;
            if (now - absentSince.current > 700) {
              armedRef.current = true;
              if (now - capturedAt.current > 1200) setLast(null);
              setHint(`${regsRef.current.length + 1}번째 카드나 핸드폰을 보여 주세요`);
            }
          }
        } else {
          absentSince.current = 0;
          if (armedRef.current) {
            const st = stableRef.current;
            const same = st && Math.hypot(f.cx - st.cx, f.cy - st.cy) < 0.07 && Math.abs(f.w - st.w) / st.w < 0.25;
            if (!same) stableRef.current = { cx: f.cx, cy: f.cy, w: f.w, start: now };
            const p = Math.min(1, (now - (stableRef.current?.start ?? now)) / HOLD_MS);
            setProgress(p);
            setHint('잠깐만 가만히…');
            if (p >= 1) registerNow(f);
          } else {
            setHint('등록됐어요! 다음 분께 넘겨 주세요 (물건을 화면에서 치워 주세요)');
          }
        }
      }
      draw();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [step, mode, camState, registerNow]);

  // 모두 등록되면 멍멍이에게 넘어간다
  useEffect(() => {
    if (step === 'register' && regs.length >= count) {
      stopCamera();
      const t = setTimeout(() => (setLast(null), startSniff()), last ? 2200 : 600);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regs.length, step, count]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function startSniff() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const n = regsRef.current.length;
    const target = randomIndex(n);
    const laps = n <= 4 ? 4 : n <= 8 ? 3 : 2;
    const total = n * laps + target; // 0번부터 돌다가 target에서 멈춘다
    let elapsed = 400;
    setStep('pick');
    setPicked(null);
    setCursor(-1);
    for (let j = 0; j <= total; j++) {
      const slow = Math.pow(j / total, 3); // 갈수록 느려진다
      elapsed += 70 + slow * 420;
      const idx = j % n;
      timers.current.push(
        setTimeout(() => {
          setCursor(idx);
          bark('sniff');
        }, elapsed),
      );
    }
    timers.current.push(
      setTimeout(() => {
        setPicked(target);
        setStep('result');
        bark('bark');
        setTimeout(() => bark('bark'), 260);
      }, elapsed + 700),
    );
  }

  function reset() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    stopCamera();
    setRegs([]);
    setPicked(null);
    setCursor(-1);
    setProgress(0);
    setNameInput('');
    setLast(null);
    armedRef.current = true;
    stableRef.current = null;
    foundRef.current = null;
    setStep('setup');
  }

  function begin() {
    setRegs([]);
    setLast(null);
    armedRef.current = true;
    setHint('카드나 핸드폰을 화면 가운데에 보여 주세요');
    setStep('register');
  }

  const total = count;
  const current = regs.length + 1;

  // ───── 화면 ─────
  if (step === 'setup')
    return (
      <section className="mx-auto flex w-full max-w-[520px] flex-col items-center gap-5 rounded-[14px] border-2 border-ink bg-white p-6 text-center">
        <div className="text-[72px] leading-none" aria-hidden>
          🐶
        </div>
        <div>
          <h2 className="text-[22px] font-black">오늘 커피 얻어먹을 카드는?</h2>
          <p className="mt-1 text-[14px] leading-snug text-inkMuted">
            참가자가 한 명씩 카드나 핸드폰을 카메라에 보여 주면 멍멍이가 냄새를 맡고 한 명을 골라요.
          </p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-[14px] font-bold">참가 인원</p>
          <div className="flex items-center gap-4">
            <button type="button" aria-label="인원 줄이기" onClick={() => setCount((c) => Math.max(MIN_PEOPLE, c - 1))} className="grid h-12 w-12 place-items-center rounded-full border-2 border-ink text-[24px] font-black">
              −
            </button>
            <span className="w-16 font-latin text-[44px] font-semibold leading-none">{count}</span>
            <button type="button" aria-label="인원 늘리기" onClick={() => setCount((c) => Math.min(MAX_PEOPLE, c + 1))} className="grid h-12 w-12 place-items-center rounded-full border-2 border-ink text-[24px] font-black">
              +
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setMode('camera');
            begin();
          }}
          className={yellowButtonClass}
        >
          📷 카메라로 시작
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('names');
            begin();
          }}
          className="min-h-[44px] text-[14px] font-bold underline underline-offset-4"
        >
          카메라 없이 이름으로 하기
        </button>
        <p className="text-[12px] leading-snug text-inkMuted">카메라 영상은 이 기기 안에서만 쓰이고 저장하거나 올리지 않아요.</p>
      </section>
    );

  if (step === 'register')
    return (
      <section className="mx-auto flex w-full max-w-[560px] flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-black">
            {current > total ? '다 모였어요!' : `${current}번째 ${mode === 'camera' ? '카드 또는 핸드폰을 인식시켜 주세요' : '분 이름을 적어 주세요'}`}
          </h2>
          <span className="font-latin text-[14px] font-semibold text-inkMuted">
            {Math.min(regs.length, total)} / {total}
          </span>
        </div>

        {mode === 'camera' ? (
          <>
            <div className="relative overflow-hidden rounded-[12px] border-2 border-ink bg-black" style={{ aspectRatio: '4 / 3' }}>
              <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
              <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />
              {flash && <div className="pointer-events-none absolute inset-0 bg-white/80" />}
              {last && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/70 p-3 text-center text-white">
                  <p className="text-[13px] font-black text-sticker">✓ {last.n}번째 등록 완료!</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={last.src} alt={`${last.n}번째로 찍힌 것`} className="max-h-[52%] max-w-[70%] rounded-[8px] border-2 border-white object-contain" />
                  <p className="text-[14px] font-bold leading-snug">🐶 {last.line}</p>
                  <div className="mt-1 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRegs((r) => r.slice(0, -1));
                        setLast(null);
                        armedRef.current = true;
                      }}
                      className="h-10 rounded-[10px] border-2 border-ink bg-white px-4 text-[13px] font-black text-ink"
                    >
                      다시 찍기
                    </button>
                    {regs.length < total && (
                      <button type="button" onClick={() => setLast(null)} className="h-10 rounded-[10px] border-2 border-ink bg-sticker px-4 text-[13px] font-black text-ink">
                        다음 사람 ›
                      </button>
                    )}
                  </div>
                </div>
              )}
              {camState !== 'on' && camState !== 'error' && <p className="absolute inset-0 grid place-items-center text-[14px] font-bold text-white">카메라를 켜는 중…</p>}
              {camState === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-4 text-center text-white">
                  <p className="text-[14px] font-bold leading-snug">{camError || '카메라를 켜지 못했어요.'}</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setAttempt((n) => n + 1)} className="h-11 rounded-[10px] border-2 border-ink bg-white px-4 text-[14px] font-black text-ink">
                      다시 시도
                    </button>
                    <button type="button" onClick={() => setMode('names')} className="h-11 rounded-[10px] border-2 border-ink bg-sticker px-4 text-[14px] font-black text-ink">
                      이름으로 하기
                    </button>
                  </div>
                </div>
              )}
              {/* 가만히 있을수록 차오르는 고리 */}
              {progress > 0 && (
                <div className="pointer-events-none absolute bottom-3 left-1/2 h-2 w-40 -translate-x-1/2 overflow-hidden rounded-full bg-white/40">
                  <div className="h-full bg-sticker" style={{ width: `${progress * 100}%` }} />
                </div>
              )}
            </div>
            <p className="text-center text-[14px] font-bold">{hint}</p>
            <div className="flex gap-2">
              <button type="button" disabled={camState !== 'on'} onClick={() => registerNow(foundRef.current)} className="h-12 flex-1 rounded-[10px] border-2 border-ink bg-sticker text-[15px] font-black disabled:opacity-50">
                지금 이걸로 등록
              </button>
              {regs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setRegs((r) => r.slice(0, -1));
                    armedRef.current = true;
                  }}
                  className="h-12 rounded-[10px] border-2 border-ink bg-white px-4 text-[15px] font-bold"
                >
                  방금 것 취소
                </button>
              )}
            </div>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const t = nameInput.trim();
              if (!t) return;
              addReg({ kind: 'name', text: t });
              setNameInput('');
            }}
            className="flex gap-2"
          >
            <input value={nameInput} maxLength={10} onChange={(e) => setNameInput(e.target.value)} placeholder={`${current}번째 이름`} aria-label={`${current}번째 이름`} className={fieldClass} />
            <button type="submit" disabled={!nameInput.trim()} className="h-12 shrink-0 rounded-[10px] border-2 border-ink bg-sticker px-5 text-[16px] font-black disabled:opacity-50">
              등록
            </button>
          </form>
        )}

        {/* 등록된 것들 */}
        {regs.length > 0 && <RegGrid regs={regs} />}
        <button type="button" onClick={reset} className="min-h-[44px] self-center text-[13px] font-bold text-inkMuted underline underline-offset-4">
          처음으로
        </button>
      </section>
    );

  // 킁킁 / 결과
  return (
    <section className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-4 text-center">
      <h2 className="text-[20px] font-black">{step === 'pick' ? '멍멍이가 냄새를 맡는 중… 킁킁' : '멍멍이가 골랐어요!'}</h2>
      <RegGrid regs={regs} cursor={step === 'pick' ? cursor : (picked ?? -1)} final={step === 'result'} />
      {step === 'result' && picked !== null && (
        <div className="flex w-full flex-col items-center gap-3 rounded-[14px] border-2 border-ink bg-white p-5">
          <p className="text-[56px] leading-none" aria-hidden>
            🐶☕
          </p>
          <p className="text-[22px] font-black leading-tight">
            오늘 커피는 <span className="text-seal">{picked + 1}번째 {regs[picked].kind === 'name' ? regs[picked].text : '카드'}</span>!
          </p>
          <div className="w-44 overflow-hidden rounded-[8px] border-2 border-ink">
            {regs[picked].kind === 'photo' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={(regs[picked] as { src: string }).src} alt="멍멍이가 고른 카드" className="block w-full" />
            ) : (
              <p className="py-6 text-[24px] font-black">{(regs[picked] as { text: string }).text}</p>
            )}
          </div>
          <div className="flex w-full gap-2">
            <button type="button" onClick={startSniff} className="h-12 flex-1 rounded-[10px] border-2 border-ink bg-sticker text-[15px] font-black">
              다시 냄새 맡기
            </button>
            <button type="button" onClick={reset} className="h-12 flex-1 rounded-[10px] border-2 border-ink bg-white text-[15px] font-bold">
              처음부터
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function RegGrid({ regs, cursor = -1, final = false }: { regs: Reg[]; cursor?: number; final?: boolean }) {
  return (
    <ul className="grid w-full grid-cols-3 gap-2 sm:grid-cols-4">
      {regs.map((r, i) => {
        const on = i === cursor;
        return (
          <li key={i} className={`relative overflow-hidden rounded-[8px] border-2 bg-white transition-transform ${on ? 'z-10 scale-[1.06] border-seal shadow-[0_0_0_3px_#F2D80E]' : 'border-ink'} ${final && !on ? 'opacity-40' : ''}`}>
            <span className="absolute left-0 top-0 z-10 rounded-br-[6px] bg-ink px-1.5 font-latin text-[11px] font-semibold text-white">{i + 1}</span>
            {r.kind === 'photo' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.src} alt={`${i + 1}번째 등록`} className="block aspect-[3/2] w-full object-cover" />
            ) : (
              <p className="grid aspect-[3/2] place-items-center px-1 text-[15px] font-black">{r.text}</p>
            )}
            {on && (
              <span className="pointer-events-none absolute inset-0 grid place-items-center text-[40px]" aria-hidden>
                🐽
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
