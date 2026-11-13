'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { questionsFor, reasons, rxText, topCandidates, weightedPick, type Answers } from '@/lib/lunch/engine';
import type { Menu } from '@/lib/lunch/menus';
import { isMuted, setMuted, sfx, unlockAudio } from '@/lib/lunch/sound';
import { Confetti, type ConfettiHandle } from './Confetti';
import { LunchScene, type Bubble } from './LunchScene';

type Stage = 'intro' | 'quiz' | 'writing' | 'sheet' | 'signed' | 'refusing' | 'refused';

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

// 거절했을 때의 컷신. 탭하면 다음 컷으로 넘어간다
interface Cut {
  doc: number | null;
  nurse?: number | null;
  nurseMode?: 'stand' | 'wheel';
  bubble?: Bubble;
  anger?: boolean;
  throwing?: boolean;
  shake?: boolean;
  caption?: string;
  ms: number;
  sound?: () => void;
}

const CUTS: Cut[] = [
  { doc: 6, shake: true, bubble: { kind: 'burst', from: 'doc', text: '야이 색희야\n이럴꺼면 왜 물어봤어!!!' }, ms: 2800, sound: sfx.shout },
  {
    doc: 7,
    throwing: true,
    ms: 1600,
    sound: () => {
      sfx.whoosh();
      window.setTimeout(() => sfx.thud(), 700);
    },
  },
  { doc: 8, anger: true, bubble: { kind: 'burst', from: 'doc', text: '그냥 굶어!!!' }, ms: 2300, sound: sfx.shout },
  { doc: 9, bubble: { kind: 'round', from: 'doc', text: '…' }, ms: 1400, sound: sfx.sigh },
  { doc: 9, nurse: 1, bubble: { kind: 'round', from: 'doc', text: '이 색희 중증 결정장애다.\n정신과로 트랜스퍼해' }, ms: 3600, sound: sfx.paper },
  { doc: 9, nurse: 3, bubble: { kind: 'round', from: 'nurse', text: '…네.' }, ms: 1800 },
  { doc: null, nurse: 5, nurseMode: 'wheel', caption: '🚑 정신과로 이송 중…', ms: 2800, sound: sfx.wheel },
];

// 오늘의 점심 처방전: 엄근진 의사 넙죽이의 문진 → 진단서 → 서명 또는 거절
export function LunchRx() {
  const [stage, setStage] = useState<Stage>('intro');
  const [step, setStep] = useState(0);
  const [full, setFull] = useState(false);
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [picked, setPicked] = useState<Menu | null>(null);
  const [docPose, setDocPose] = useState(1);
  const [locked, setLocked] = useState(false);
  const [ink, setInk] = useState(false);
  const [cut, setCut] = useState(0);
  const [copied, setCopied] = useState(false);
  const [muted, setMutedState] = useState(false);
  const [today, setToday] = useState('');
  const confetti = useRef<ConfettiHandle>(null);
  const root = useRef<HTMLElement>(null);
  const padRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const timers = useRef<number[]>([]);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    setMutedState(isMuted());
    const d = new Date();
    setToday(`${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`);
    return clearTimers;
  }, []);

  const qs = useMemo(() => questionsFor(full, answers), [full, answers]);
  const q = qs[step];
  const a = answers as Answers;

  function focusTop() {
    window.setTimeout(() => root.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 60);
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) {
      unlockAudio();
      sfx.click();
    }
  }

  function start(precise: boolean) {
    unlockAudio();
    sfx.click();
    clearTimers();
    setFull(precise);
    setAnswers({});
    setStep(0);
    setPicked(null);
    setInk(false);
    setLocked(false);
    setDocPose(2);
    setStage('quiz');
  }

  function answer(value: string) {
    if (locked || !q) return;
    setLocked(true);
    const next = { ...answers, [q.key]: value } as Partial<Answers>;
    setAnswers(next);
    setDocPose(3); // 받아 적는다
    sfx.scribble();
    later(() => sfx.scribble(), 120);
    later(() => {
      setLocked(false);
      if (step < qs.length - 1) {
        setStep(step + 1);
        setDocPose(2);
        sfx.next();
      } else {
        writeSheet(next as Answers);
      }
    }, 520);
  }

  function writeSheet(final: Answers) {
    const list = topCandidates(final, 6);
    setPicked(list[weightedPick(list)].menu);
    setStage('writing');
    focusTop();
    for (let i = 0; i < 6; i++) later(() => sfx.scribble(), i * 260);
    later(() => {
      sfx.paper();
      setStage('sheet');
    }, 1900);
  }

  // 서명 패드
  function padPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = padRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height };
  }
  function padDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (stage !== 'sheet') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = padPos(e);
    padStroke(last.current, last.current);
  }
  function padMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !last.current) return;
    const p = padPos(e);
    padStroke(last.current, p);
    last.current = p;
    if (Math.random() < 0.25) sfx.scribble();
  }
  function padUp() {
    drawing.current = false;
    last.current = null;
  }
  function padStroke(from: { x: number; y: number }, to: { x: number; y: number }) {
    const c = padRef.current;
    const g = c?.getContext('2d');
    if (!c || !g) return;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.lineWidth = 6;
    g.strokeStyle = '#1b2a5e';
    g.beginPath();
    g.moveTo(from.x, from.y);
    g.lineTo(to.x + 0.01, to.y + 0.01);
    g.stroke();
    setInk(true);
  }
  function padClear() {
    const c = padRef.current;
    c?.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    setInk(false);
    sfx.click();
  }

  function accept() {
    if (!ink) return;
    setStage('signed');
    focusTop();
    sfx.stamp();
    later(() => {
      sfx.fanfare();
      confetti.current?.burst(window.innerWidth * 0.5, window.innerHeight * 0.4);
      confetti.current?.burst(window.innerWidth * 0.2, window.innerHeight * 0.55);
      confetti.current?.burst(window.innerWidth * 0.8, window.innerHeight * 0.55);
    }, 350);
  }

  function refuse() {
    sfx.click();
    setCut(0);
    setStage('refusing');
    focusTop();
  }

  // 컷신 진행: 시간이 지나거나 탭하면 다음 컷
  useEffect(() => {
    if (stage !== 'refusing') return;
    const c = CUTS[cut];
    c.sound?.();
    const t = window.setTimeout(() => nextCut(), c.ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, cut]);

  function nextCut() {
    if (cut < CUTS.length - 1) setCut(cut + 1);
    else {
      setStage('refused');
      sfx.stamp();
    }
  }

  async function copy() {
    if (!picked) return;
    sfx.click();
    const text = rxText(picked, a);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        /* ignore */
      }
      ta.remove();
    }
    setCopied(true);
    later(() => setCopied(false), 1800);
  }

  // 단계별 장면
  const scene = (() => {
    switch (stage) {
      case 'intro':
        return <LunchScene doc={1} bubble={{ kind: 'round', from: 'doc', text: '초진이십니까.\n앉으십시오. 문진을 시작하겠습니다.' }} />;
      case 'quiz':
        return <LunchScene doc={docPose} bubble={{ kind: 'round', from: 'doc', text: locked ? '…음.' : q?.title ?? '' }} />;
      case 'writing':
        return <LunchScene doc={3} bubble={{ kind: 'round', from: 'doc', text: '…진단서를 작성하겠습니다.' }} />;
      case 'sheet':
        return <LunchScene doc={4} bubble={{ kind: 'round', from: 'doc', text: '진단서입니다.\n확인 후 서명해 주십시오.' }} />;
      case 'signed':
        return <LunchScene doc={5} sparkle bubble={{ kind: 'round', from: 'doc', text: '서명 확인했습니다.\n처방을 승인합니다. 드십시오.' }} />;
      case 'refusing': {
        const c = CUTS[cut];
        return <LunchScene doc={c.doc} nurse={c.nurse} nurseMode={c.nurseMode} bubble={c.bubble} anger={c.anger} throwing={c.throwing} shake={c.shake} caption={c.caption} onClick={nextCut} />;
      }
      case 'refused':
        return <LunchScene doc={null} nurse={6} bubble={{ kind: 'round', from: 'nurse', text: '정신과 접수는 제가 할게요.\n점심은… 일단 굶으세요.' }} />;
    }
  })();

  return (
    <section
      ref={root}
      aria-label="오늘의 점심 처방전"
      className="relative mx-auto w-full max-w-[460px] overflow-hidden rounded-[22px] border-[3px] border-ink bg-[#FFF1D6] p-4 shadow-[0_6px_0_#000] sm:p-6"
      style={{ backgroundImage: 'radial-gradient(#ffd9b8 1.6px, transparent 1.6px)', backgroundSize: '18px 18px' }}
    >
      <Confetti ref={confetti} />

      {/* 상단 바: 진행 상황 + 음소거 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5" aria-hidden>
          {(stage === 'intro' ? [0, 1, 2, 3, 4] : qs.map((_, i) => i)).map((i) => (
            <span
              key={i}
              className={`${qs.length > 4 ? 'h-2.5 w-2.5' : 'h-3 w-3'} rounded-full border-2 border-ink transition-colors ${stage === 'quiz' ? (i <= step ? 'bg-[#FF8F9C]' : 'bg-white') : stage === 'intro' ? 'bg-white' : 'bg-[#FF8F9C]'}`}
            />
          ))}
        </div>
        <button type="button" onClick={toggleMute} aria-label={muted ? '소리 켜기' : '소리 끄기'} aria-pressed={muted} className="grid h-11 w-11 place-items-center rounded-full border-2 border-ink bg-white text-[20px]">
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      {scene}

      {stage === 'refusing' && <p className="mt-2 text-center text-[13px] font-bold text-[#5b4636]">화면을 탭하면 다음 장면으로 넘어가요</p>}

      {stage === 'intro' && (
        <div className="mt-4 flex flex-col items-center gap-3 text-center">
          <div>
            <p className="font-latin text-[12px] font-bold tracking-[0.2em] text-seal">NUPJUK INTERNAL MEDICINE</p>
            <h2 className="mt-1 text-[24px] font-black leading-tight">오늘의 점심 처방전</h2>
            <p className="mt-1 text-[14px] leading-relaxed text-[#5b4636]">결정 장애 직장인을 위한 문진. 답하면 진단서가 나옵니다.</p>
          </div>
          <div className="flex w-full flex-col gap-3">
            <button type="button" onClick={() => start(false)} className="flex h-16 flex-col items-center justify-center rounded-[14px] border-2 border-ink bg-sticker text-[17px] font-black leading-tight shadow-[0_4px_0_#000] active:translate-y-[2px] active:shadow-[0_2px_0_#000]">
              <span>⚡ 빠른 문진</span>
              <span className="text-[12px] font-bold">5문항 · 40초</span>
            </button>
            <button type="button" onClick={() => start(true)} className="flex h-16 flex-col items-center justify-center rounded-[14px] border-2 border-ink bg-white text-[17px] font-black leading-tight shadow-[0_4px_0_#000] active:translate-y-[2px] active:shadow-[0_2px_0_#000]">
              <span>🩺 정밀 문진</span>
              <span className="text-[12px] font-bold">최대 13문항 · 시간·동행·날씨·저녁 약속까지</span>
            </button>
          </div>
        </div>
      )}

      {stage === 'quiz' && q && (
        <div key={step} className="mt-4 flex flex-col gap-3 [animation:slide-up_0.3s_ease-out_both]">
          <p className="font-latin text-[13px] font-bold text-seal">
            Q{step + 1} / {qs.length}
          </p>
          <div className={`grid gap-3 ${q.options.length >= 4 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {q.options.map((o) => (
              <button
                key={o.value}
                type="button"
                disabled={locked}
                onClick={() => answer(o.value)}
                className={`flex items-center gap-3 rounded-[14px] border-2 border-ink bg-white p-3 text-left shadow-[0_4px_0_#000] transition-transform hover:bg-[#FFF6D6] active:translate-y-[2px] active:shadow-[0_2px_0_#000] disabled:opacity-60 ${q.options.length >= 4 ? 'min-h-[92px] flex-col justify-center text-center' : 'min-h-[64px]'}`}
              >
                <span className="text-[32px] leading-none">{o.emoji}</span>
                <span className="text-[16px] font-black leading-snug">{o.label}</span>
              </button>
            ))}
          </div>
          {step > 0 && (
            <button
              type="button"
              onClick={() => {
                sfx.click();
                setStep(step - 1);
                setDocPose(2);
              }}
              className="self-start py-2 text-[14px] font-bold text-[#5b4636] underline"
            >
              ‹ 이전 질문
            </button>
          )}
        </div>
      )}

      {(stage === 'sheet' || stage === 'signed') && picked && (
        <div className="mt-4 flex flex-col gap-4 [animation:slide-up_0.5s_ease-out_both]">
          <article className="relative rounded-[6px] border-2 border-ink bg-[#FFFDF6] px-4 pb-5 pt-4 shadow-[0_5px_0_rgba(0,0,0,0.9)]">
            <header className="flex items-end justify-between border-b-2 border-dashed border-ink/50 pb-2">
              <div>
                <p className="text-[12px] font-black text-seal">✚ 넙죽이 내과</p>
                <h3 className="text-[20px] font-black leading-tight tracking-[0.3em]">진 단 서</h3>
              </div>
              <p className="font-latin text-[12px] font-semibold text-[#6a5a48]">{today}</p>
            </header>

            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[14px]">
              <dt className="font-bold text-[#6a5a48]">진단명</dt>
              <dd className="font-black">급성 점심 선택 불능증</dd>
              <dt className="font-bold text-[#6a5a48]">환자</dt>
              <dd className="font-black">결정 장애 직장인 귀하</dd>
            </dl>

            <div className="my-4 rounded-[10px] border-2 border-dashed border-ink/40 bg-[#FFF8E5] py-3 text-center">
              <p className="text-[13px] font-bold text-[#6a5a48]">처방 메뉴</p>
              <p className="text-[56px] leading-none">{picked.emoji}</p>
              <p className="mt-1 text-[30px] font-black leading-tight">{picked.name}</p>
              <p className="mt-1 text-[13px] font-bold text-[#6a5a48]">
                {picked.cat === '양분' ? '양식 · 분식' : picked.cat} · 약 {picked.kcal}kcal
              </p>
            </div>

            <div className="border-y-2 border-dashed border-ink/50 py-3">
              <p className="mb-1.5 text-[13px] font-black">소견</p>
              <ul className="flex flex-col gap-1">
                {reasons(picked, a).map((r, i) => (
                  <li key={i} className="flex gap-1.5 text-[14px] leading-snug">
                    <span aria-hidden>•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 py-3 text-[14px]">
              {(
                [
                  ['해장', picked.hangover],
                  ['포만감', picked.fill],
                  ['가성비', picked.value],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="font-bold">{k}</dt>
                  <dd className="font-latin tracking-wider text-[#E58A1F]" aria-label={`${v}점`}>
                    {stars(v)}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="rounded-[8px] bg-[#FFF1D6] px-3 py-2 text-[14px] leading-snug">
              <span className="font-black">복용법 </span>
              {picked.note}
            </p>

            {/* 서명란 */}
            <div className="mt-4">
              <div className="mb-1 flex items-end justify-between">
                <p className="text-[13px] font-black">위 처방대로 점심을 먹겠습니다.</p>
                {stage === 'sheet' && ink && (
                  <button type="button" onClick={padClear} className="text-[12px] font-bold text-[#5b4636] underline">
                    지우기
                  </button>
                )}
              </div>
              <div className="relative">
                <canvas
                  ref={padRef}
                  width={600}
                  height={180}
                  aria-label="서명란"
                  onPointerDown={padDown}
                  onPointerMove={padMove}
                  onPointerUp={padUp}
                  onPointerCancel={padUp}
                  className={`block aspect-[10/3] w-full touch-none rounded-[8px] border-2 border-ink bg-white ${stage === 'sheet' ? 'cursor-crosshair' : ''}`}
                />
                {!ink && stage === 'sheet' && <span className="pointer-events-none absolute inset-0 grid place-items-center text-[15px] font-bold text-ink/35">✍ 여기에 서명해 주세요</span>}
                <span className="pointer-events-none absolute bottom-1 right-2 text-[11px] font-bold text-ink/40">(서명)</span>
                {stage === 'signed' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/hoegilab/lunch-seal.webp" alt="처방 승인 도장" draggable={false} className="pointer-events-none absolute right-0 -top-5 h-20 w-auto rotate-[-10deg] [animation:stamp-in_0.35s_cubic-bezier(.3,1.6,.5,1)_both]" />
                )}
              </div>
            </div>
          </article>

          {stage === 'sheet' ? (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={accept}
                disabled={!ink}
                className="h-14 rounded-[12px] border-2 border-ink bg-sticker text-[16px] font-black shadow-[0_4px_0_#000] active:translate-y-[2px] active:shadow-[0_2px_0_#000] disabled:opacity-45"
              >
                ✍ 이 메뉴를 먹겠습니다
              </button>
              <button type="button" onClick={refuse} className="h-12 rounded-[12px] border-2 border-ink bg-white text-[15px] font-black shadow-[0_4px_0_#000] active:translate-y-[2px] active:shadow-[0_2px_0_#000]">
                🙅 거절합니다
              </button>
              {!ink && <p className="text-center text-[12px] text-[#5b4636]">서명해야 &lsquo;먹겠습니다&rsquo; 버튼이 켜져요</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={copy} className="h-12 rounded-[12px] border-2 border-ink bg-sticker text-[15px] font-black shadow-[0_4px_0_#000] active:translate-y-[2px] active:shadow-[0_2px_0_#000]">
                {copied ? '✅ 복사됐어요' : '📋 진단서 복사'}
              </button>
              <button type="button" onClick={() => start(full)} className="h-12 rounded-[12px] border-2 border-ink bg-white text-[15px] font-black shadow-[0_4px_0_#000] active:translate-y-[2px] active:shadow-[0_2px_0_#000]">
                🔄 다시 진료받기
              </button>
            </div>
          )}
        </div>
      )}

      {stage === 'refused' && (
        <div className="mt-4 flex flex-col gap-4 [animation:slide-up_0.5s_ease-out_both]">
          <article className="relative rounded-[6px] border-2 border-ink bg-[#FFFDF6] px-4 pb-5 pt-4 shadow-[0_5px_0_rgba(0,0,0,0.9)]">
            <header className="flex items-end justify-between border-b-2 border-dashed border-ink/50 pb-2">
              <div>
                <p className="text-[12px] font-black text-seal">✚ 넙죽이 내과 → 정신건강의학과</p>
                <h3 className="text-[20px] font-black leading-tight tracking-[0.3em]">진 단 서</h3>
              </div>
              <p className="font-latin text-[12px] font-semibold text-[#6a5a48]">{today}</p>
            </header>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[14px]">
              <dt className="font-bold text-[#6a5a48]">진단명</dt>
              <dd className="font-black text-seal">중증 결정장애</dd>
              <dt className="font-bold text-[#6a5a48]">경과</dt>
              <dd>문진 완료 후 처방 거부, 의사에게 차트 투척을 유발함</dd>
              <dt className="font-bold text-[#6a5a48]">처방</dt>
              <dd className="font-black">점심 굶기 · 정신과 협진 의뢰</dd>
            </dl>
            <span className="absolute right-3 top-14 -rotate-12 rounded-[8px] border-[3px] border-seal px-2 py-0.5 text-[15px] font-black tracking-widest text-seal [animation:stamp-in_0.35s_cubic-bezier(.3,1.6,.5,1)_0.2s_both]">이송 완료</span>
          </article>
          <button type="button" onClick={() => start(full)} className="h-14 rounded-[12px] border-2 border-ink bg-sticker text-[16px] font-black shadow-[0_4px_0_#000] active:translate-y-[2px] active:shadow-[0_2px_0_#000]">
            🩺 다시 진료받기 (이번엔 결정하세요)
          </button>
        </div>
      )}
    </section>
  );
}
