'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { detectCardLike, type Found } from '@/lib/cardDetect';
import { fieldClass, yellowButtonClass } from '../formStyles';

// 마약탐지견처럼: 한 명씩 카드(또는 핸드폰)를 비추면 멍멍이가 바로 냄새를 맡고 "이 카드다!" 또는 "아니에요"를 알려 준다.
// 정답은 시작할 때 몰래 정해 두고(모두 같은 확률), 그 순서의 카드에서 짖는다. 끝 순서까지 아무도 안 걸렸으면 마지막이 정답이다.

type Step = 'setup' | 'scan' | 'final';
type Mode = 'camera' | 'names';
type Phase = 'idle' | 'sniff' | 'result';
type Shot = { kind: 'photo'; src: string } | { kind: 'name'; text: string };

const NO_LINES = ['킁킁… 이 카드는 아니에요', '음… 커피 냄새가 안 나요', '꼬리가 안 움직여요… 아닌가 봐요', '킁킁킁… 이건 아니에요!', '멍… 다음 분!'];

const MIN_PEOPLE = 2;
const MAX_PEOPLE = 12;
const HOLD_MS = 1300; // 카드나 폰을 이만큼 가만히 보여 주면 자동으로 찍힌다
const SNIFF_MS = 1700;
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
  const [turn, setTurn] = useState(0); // 지금 몇 번째 사람 차례인지 (0부터)
  const [phase, setPhase] = useState<Phase>('idle');
  const [cur, setCur] = useState<Shot | null>(null); // 방금 찍힌 것
  const [verdict, setVerdict] = useState<boolean | null>(null); // 걸렸나?
  const [line, setLine] = useState('');
  const [history, setHistory] = useState<Shot[]>([]); // 앞서 "아니었던" 것들
  const [winnerShot, setWinnerShot] = useState<Shot | null>(null);
  const [camState, setCamState] = useState<'idle' | 'starting' | 'on' | 'error'>('idle');
  const [camError, setCamError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState(0);
  const [hint, setHint] = useState('카드나 핸드폰을 화면에 보여 주세요');
  const [flash, setFlash] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const foundRef = useRef<Found | null>(null);
  const armedRef = useRef(true); // 앞 물건이 화면에서 사라져야 다음 것을 인식한다
  const absentSince = useRef(0);
  const stableRef = useRef<{ cx: number; cy: number; w: number; start: number } | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const turnRef = useRef(0);
  const winnerRef = useRef(0); // 몰래 정한 정답 순서
  const countRef = useRef(4);
  const audioRef = useRef<AudioContext | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  phaseRef.current = phase;
  turnRef.current = turn;
  countRef.current = count;

  const sound = useCallback((kind: 'sniff' | 'bark' | 'no') => {
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ac = (audioRef.current ??= new Ctor());
      if (ac.state === 'suspended') void ac.resume();
      const t0 = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = kind === 'bark' ? 'sawtooth' : 'triangle';
      const [f0, f1, dur, vol] = kind === 'bark' ? [420, 140, 0.2, 0.28] : kind === 'no' ? [240, 120, 0.35, 0.12] : [260, 200, 0.06, 0.07];
      o.frequency.setValueAtTime(f0, t0);
      o.frequency.exponentialRampToValueAtTime(f1, t0 + dur * 0.9);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(ac.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    } catch {
      // 소리 없이 진행
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // 기울어진 물건을 바로 세워서 잘라 담는다. 인식이 없으면 화면 가운데를 그대로 담는다
  const capture = useCallback((f: Found | null): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
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

  // 한 번 찍으면 바로 냄새를 맡고 곧 결과가 나온다
  const shoot = useCallback(
    (shot: Shot) => {
      if (phaseRef.current !== 'idle') return;
      phaseRef.current = 'sniff';
      setCur(shot);
      setVerdict(null);
      setPhase('sniff');
      setProgress(0);
      stableRef.current = null;
      armedRef.current = false;
      absentSince.current = 0;
      setFlash(true);
      timers.current.push(setTimeout(() => setFlash(false), 200));
      // 킁킁 소리
      for (let i = 0; i < 6; i++) timers.current.push(setTimeout(() => sound('sniff'), 150 + i * 250));
      timers.current.push(
        setTimeout(() => {
          const yes = turnRef.current === winnerRef.current;
          setVerdict(yes);
          setPhase('result');
          phaseRef.current = 'result';
          if (yes) {
            setWinnerShot(shot);
            sound('bark');
            timers.current.push(setTimeout(() => sound('bark'), 260));
            timers.current.push(setTimeout(() => sound('bark'), 560));
            timers.current.push(
              setTimeout(() => {
                stopCamera();
                setStep('final');
              }, 2300),
            );
          } else {
            setLine(NO_LINES[Math.floor(Math.random() * NO_LINES.length)]);
            sound('no');
          }
        }, SNIFF_MS),
      );
    },
    [sound, stopCamera],
  );

  const shootCamera = useCallback(
    (f: Found | null) => {
      const src = capture(f);
      if (src) shoot({ kind: 'photo', src });
    },
    [capture, shoot],
  );

  // 아니었던 것: 다음 사람 차례로
  function nextPerson() {
    if (!cur) return;
    setHistory((h) => [...h, cur]);
    setCur(null);
    setVerdict(null);
    setPhase('idle');
    phaseRef.current = 'idle';
    setTurn((t) => t + 1);
    setNameInput('');
    stableRef.current = null;
    setHint('다음 분, 카드나 핸드폰을 보여 주세요');
  }

  // 같은 차례에서 다시 찍기 (정답 순서는 그대로라 결과가 바뀌지 않는다)
  function retake() {
    setCur(null);
    setVerdict(null);
    setPhase('idle');
    phaseRef.current = 'idle';
    stableRef.current = null;
    armedRef.current = true;
  }

  function begin() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    winnerRef.current = randomIndex(countRef.current);
    setTurn(0);
    turnRef.current = 0;
    setHistory([]);
    setCur(null);
    setVerdict(null);
    setWinnerShot(null);
    setPhase('idle');
    phaseRef.current = 'idle';
    setNameInput('');
    armedRef.current = true;
    stableRef.current = null;
    setHint('카드나 핸드폰을 화면에 보여 주세요');
    setStep('scan');
  }

  function reset() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    stopCamera();
    setStep('setup');
    setPhase('idle');
    phaseRef.current = 'idle';
  }

  // 카메라 켜기 / 끄기
  useEffect(() => {
    if (step !== 'scan' || mode !== 'camera') return;
    let cancelled = false;
    (async () => {
      setCamError('');
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
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

  // 인식 루프: 카드·핸드폰 모양을 찾아 박스를 그리고, 가만히 있으면 자동으로 찍는다
  useEffect(() => {
    if (step !== 'scan' || mode !== 'camera' || camState !== 'on') return;
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
      if (!f || phaseRef.current !== 'idle') return;
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

        if (phaseRef.current === 'idle') {
          if (!f) {
            stableRef.current = null;
            setProgress(0);
            if (!armedRef.current) {
              if (!absentSince.current) absentSince.current = now;
              if (now - absentSince.current > 700) armedRef.current = true;
            }
          } else {
            absentSince.current = 0;
            if (armedRef.current) {
              const st = stableRef.current;
              const same = st && Math.hypot(f.cx - st.cx, f.cy - st.cy) < 0.07 && Math.abs(f.w - st.w) / st.w < 0.25;
              if (!same) stableRef.current = { cx: f.cx, cy: f.cy, w: f.w, start: now };
              const p = Math.min(1, (now - (stableRef.current?.start ?? now)) / HOLD_MS);
              setProgress(p);
              if (p >= 1) shootCamera(f);
            } else {
              setHint('앞 카드를 치워 주세요');
            }
          }
        }
      }
      draw();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [step, mode, camState, shootCamera]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const total = count;

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
            한 명씩 카드나 핸드폰을 카메라에 비추면 멍멍이가 바로 냄새를 맡고, 커피 냄새가 나는 카드에서 짖어요.
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

  if (step === 'scan')
    return (
      <section className="mx-auto flex w-full max-w-[560px] flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-black">{turn + 1}번째 {mode === 'camera' ? '카드 또는 핸드폰을 비춰 주세요' : '분 이름을 적어 주세요'}</h2>
          <span className="font-latin text-[14px] font-semibold text-inkMuted">
            {turn + 1} / {total}
          </span>
        </div>

        {mode === 'camera' ? (
          <>
            <div className="relative overflow-hidden rounded-[12px] border-2 border-ink bg-black" style={{ aspectRatio: '4 / 3' }}>
              <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
              <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />
              {flash && <div className="pointer-events-none absolute inset-0 z-20 bg-white/80" />}
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
              {phase === 'idle' && progress > 0 && (
                <div className="pointer-events-none absolute bottom-3 left-1/2 h-2 w-40 -translate-x-1/2 overflow-hidden rounded-full bg-white/40">
                  <div className="h-full bg-sticker" style={{ width: `${progress * 100}%` }} />
                </div>
              )}
              <ResultOverlay phase={phase} cur={cur} verdict={verdict} line={line} turn={turn} onNext={nextPerson} onRetake={retake} />
            </div>

            {phase === 'idle' && (
              <>
                <p className="text-center text-[14px] font-bold">{hint}</p>
                <button
                  type="button"
                  disabled={camState !== 'on'}
                  onClick={() => shootCamera(foundRef.current)}
                  className="h-14 w-full rounded-[12px] border-2 border-ink bg-sticker text-[18px] font-black hover:bg-[#e3c900] disabled:opacity-50"
                >
                  📸 찍기
                </button>
                <p className="text-center text-[12px] text-inkMuted">카드를 가만히 들고 있으면 자동으로 찍혀요. 바로 냄새를 맡고 결과가 나와요.</p>
              </>
            )}
          </>
        ) : (
          <div className="relative overflow-hidden rounded-[12px] border-2 border-ink bg-white p-4" style={{ minHeight: 220 }}>
            {phase === 'idle' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = nameInput.trim();
                  if (!t) return;
                  shoot({ kind: 'name', text: t });
                }}
                className="flex flex-col gap-3"
              >
                <p className="text-[14px] font-bold">이름을 적고 멍멍이에게 맡겨요</p>
                <div className="flex gap-2">
                  <input value={nameInput} maxLength={10} onChange={(e) => setNameInput(e.target.value)} placeholder={`${turn + 1}번째 이름`} aria-label={`${turn + 1}번째 이름`} className={fieldClass} />
                  <button type="submit" disabled={!nameInput.trim()} className="h-12 shrink-0 rounded-[10px] border-2 border-ink bg-sticker px-5 text-[16px] font-black disabled:opacity-50">
                    킁킁!
                  </button>
                </div>
              </form>
            ) : null}
            <ResultOverlay phase={phase} cur={cur} verdict={verdict} line={line} turn={turn} onNext={nextPerson} onRetake={retake} light />
          </div>
        )}

        {/* 앞에서 "아니었던" 카드들 */}
        {history.length > 0 && (
          <div>
            <p className="mb-1 text-[12px] font-bold text-inkMuted">지나간 카드 (아니었어요)</p>
            <ul className="flex flex-wrap gap-2">
              {history.map((h, i) => (
                <li key={i} className="relative h-14 w-20 overflow-hidden rounded-[6px] border-2 border-ink bg-white opacity-70">
                  <span className="absolute left-0 top-0 z-10 rounded-br-[4px] bg-ink px-1 font-latin text-[10px] font-semibold text-white">{i + 1}</span>
                  {h.kind === 'photo' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={h.src} alt={`${i + 1}번째 지나간 카드`} className="h-full w-full object-cover" />
                  ) : (
                    <p className="grid h-full place-items-center px-1 text-[12px] font-black">{h.text}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        <button type="button" onClick={reset} className="min-h-[44px] self-center text-[13px] font-bold text-inkMuted underline underline-offset-4">
          처음으로
        </button>
      </section>
    );

  // 최종: 걸린 카드
  return (
    <section className="mx-auto flex w-full max-w-[520px] flex-col items-center gap-4 rounded-[14px] border-2 border-ink bg-white p-6 text-center">
      <p className="text-[56px] leading-none" aria-hidden>
        🐶☕
      </p>
      <p className="text-[24px] font-black leading-tight">
        멍멍멍! 오늘 커피는 <span className="text-seal">{turn + 1}번째 {winnerShot?.kind === 'name' ? winnerShot.text : '카드'}</span>!
      </p>
      <div className="w-52 overflow-hidden rounded-[8px] border-2 border-ink">
        {winnerShot?.kind === 'photo' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={winnerShot.src} alt="멍멍이가 고른 카드" className="block w-full" />
        ) : (
          <p className="py-8 text-[28px] font-black">{winnerShot?.kind === 'name' ? winnerShot.text : ''}</p>
        )}
      </div>
      <p className="text-[13px] text-inkMuted">
        {total}명 중 {turn + 1}번째에서 걸렸어요.
      </p>
      <div className="flex w-full gap-2">
        <button type="button" onClick={begin} className="h-12 flex-1 rounded-[10px] border-2 border-ink bg-sticker text-[15px] font-black">
          한 번 더 (같은 인원)
        </button>
        <button type="button" onClick={reset} className="h-12 flex-1 rounded-[10px] border-2 border-ink bg-white text-[15px] font-bold">
          처음부터
        </button>
      </div>
    </section>
  );
}

// 찍은 직후: 킁킁 → 결과 (걸렸다 / 아니다)
function ResultOverlay({
  phase,
  cur,
  verdict,
  line,
  turn,
  onNext,
  onRetake,
  light = false,
}: {
  phase: Phase;
  cur: Shot | null;
  verdict: boolean | null;
  line: string;
  turn: number;
  onNext: () => void;
  onRetake: () => void;
  light?: boolean;
}) {
  if (phase === 'idle' || !cur) return null;
  const yes = verdict === true;
  const bg = light ? 'bg-white' : yes ? 'bg-black/75' : 'bg-black/70';
  const fg = light ? 'text-ink' : 'text-white';
  return (
    <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 p-3 text-center ${bg} ${fg}`}>
      <div className={`relative max-h-[48%] max-w-[64%] overflow-hidden rounded-[8px] border-2 ${yes ? 'border-sticker shadow-[0_0_0_4px_#C8322B]' : 'border-white'} ${light ? '!border-ink' : ''}`}>
        {cur.kind === 'photo' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cur.src} alt="방금 찍힌 것" className="block max-h-[190px] object-contain" />
        ) : (
          <p className="px-6 py-4 text-[22px] font-black">{cur.text}</p>
        )}
        {phase === 'sniff' && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center text-[44px] [animation:wiggle_0.25s_ease-in-out_infinite_alternate]" aria-hidden>
            🐽
          </span>
        )}
      </div>
      {phase === 'sniff' && <p className="text-[18px] font-black">킁킁킁킁…</p>}
      {phase === 'result' && yes && (
        <p className="text-[24px] font-black leading-tight">
          🐶 멍멍멍! <span className="text-sticker">이 카드예요!</span>
        </p>
      )}
      {phase === 'result' && verdict === false && (
        <>
          <p className="text-[16px] font-black leading-snug">🐶 {line}</p>
          <div className="mt-1 flex gap-2">
            <button type="button" onClick={onRetake} className="h-10 rounded-[10px] border-2 border-ink bg-white px-4 text-[13px] font-black text-ink">
              다시 찍기
            </button>
            <button type="button" onClick={onNext} className="h-10 rounded-[10px] border-2 border-ink bg-sticker px-4 text-[13px] font-black text-ink">
              다음 사람 ›
            </button>
          </div>
        </>
      )}
      <span className="sr-only">{turn + 1}번째 결과</span>
    </div>
  );
}
