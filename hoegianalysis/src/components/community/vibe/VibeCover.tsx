'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

// 이 사이트를 만들 때 실제로 AI에게 한 말들
const PROMPTS = ['의사 넙죽이가 엄근진하게 묻는 점심 앱 만들어줘', '큐브를 누르면 스스로 맞춰지게 해줘', '말풍선을 넙죽이 머리 쪽으로 내려줘'];

const rise = (delay: number) => ({ animation: `word-rise 0.7s cubic-bezier(.2,1.3,.4,1) ${delay}s both` });

// 프롬프트가 한 글자씩 쳐지고, 다 쳐지면 "만들었어요"가 뜨는 창
function PromptWindow() {
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const full = PROMPTS[i];
    let t: number;
    if (n < full.length) {
      t = window.setTimeout(() => setN(n + 1), 60 + Math.random() * 45);
    } else if (!done) {
      t = window.setTimeout(() => setDone(true), 450);
    } else {
      t = window.setTimeout(() => {
        setDone(false);
        setN(0);
        setI((i + 1) % PROMPTS.length);
      }, 2200);
    }
    return () => clearTimeout(t);
  }, [i, n, done]);

  return (
    <div aria-hidden className="overflow-hidden rounded-[14px] border-[3px] border-ink bg-white text-left shadow-[6px_6px_0_#000]">
      <div className="flex items-center gap-1.5 border-b-[3px] border-ink bg-[#EEF0F4] px-3 py-2">
        <span className="h-3 w-3 rounded-full border-2 border-ink bg-seal" />
        <span className="h-3 w-3 rounded-full border-2 border-ink bg-sticker" />
        <span className="h-3 w-3 rounded-full border-2 border-ink bg-[#2fbf6a]" />
        <span className="ml-2 font-latin text-[11px] font-semibold text-inkMuted">prompt</span>
      </div>
      <div className="min-h-[150px] p-4 sm:min-h-[180px] sm:p-5">
        <p className="font-latin text-[11px] font-semibold tracking-widest text-cube">YOU</p>
        <p className="mt-1 min-h-[3.4em] text-[17px] font-bold leading-snug sm:text-[20px]">
          {PROMPTS[i].slice(0, n)}
          <span className="ml-0.5 inline-block h-[1.05em] w-[3px] translate-y-[3px] bg-ink [animation:cursor-blink_0.9s_steps(1)_infinite]" />
        </p>
        <p className={`mt-3 inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-[#2fbf6a] px-3 py-1 text-[13px] font-black text-white transition-all duration-300 ${done ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>
          ✓ 만들었어요
        </p>
      </div>
    </div>
  );
}

const QUESTION = '중간고사의 추억 바이브 코딩이란 만든 사람은 누구일까요?';
const WIDE = 'relative left-1/2 w-[min(calc(100vw-32px),1100px)] -translate-x-1/2';

// 바이브 코딩 발표 표지. 버튼을 한 번 누르면 아래에 질문이 나온다
export function VibeCover() {
  const [asked, setAsked] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const answerCard = useRef<HTMLDivElement>(null);

  function ask() {
    if (asked) return;
    setAsked(true);
    window.setTimeout(() => card.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
  }

  function reveal() {
    if (revealed) return;
    setRevealed(true);
    window.setTimeout(() => answerCard.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
  }

  return (
    <>
    <section
      aria-label="바이브 코딩은 무엇일까?"
      className={`${WIDE} flex flex-col overflow-hidden md:min-h-[min(620px,calc(100vh-130px))] rounded-[22px] border-[3px] border-ink bg-sticker px-5 pb-8 pt-7 shadow-[0_8px_0_#000] sm:px-10 sm:pb-12 sm:pt-10`}
      style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.13) 1.6px, transparent 1.6px)', backgroundSize: '20px 20px' }}
    >
      <p className="self-start -rotate-1 rounded-full border-2 border-ink bg-white px-3 py-1 font-latin text-[12px] font-semibold tracking-[0.18em] [animation:word-rise_0.6s_ease-out_both]">VIBE CODING</p>

      <div className="my-auto grid items-center gap-8 py-6 md:grid-cols-[1.15fr_0.85fr] md:gap-10">
        <div>
          <h1 className="text-[clamp(44px,12vw,84px)] font-black leading-[1.02] tracking-[-0.035em]">
            <span className="block">
              <span className="inline-block" style={rise(0.15)}>바이브</span> <span className="inline-block" style={rise(0.3)}>코딩은</span>
            </span>
            <span className="block">
              <span className="inline-block" style={rise(0.5)}>무엇일까</span>
              <span
                className="ml-2 inline-grid h-[0.95em] w-[0.82em] -translate-y-[0.06em] -rotate-6 place-items-center rounded-[0.14em] border-[3px] border-ink bg-cube align-middle text-white shadow-[4px_4px_0_#000]"
                style={{ animation: 'sticker-pop 0.6s cubic-bezier(.3,1.7,.5,1) 0.85s both' }}
              >
                ?
              </span>
            </span>
          </h1>
          <p className="mt-5 font-latin text-[15px] font-semibold text-ink/75 sm:text-[17px] [animation:word-rise_0.7s_ease-out_1.1s_both]">What is Vibe Coding?</p>
          <p className="mt-2 text-[16px] font-bold leading-snug sm:text-[19px] [animation:word-rise_0.7s_ease-out_1.25s_both]">분위기(vibe)를 말하면, AI가 코드로 만든다.</p>
          <button
            type="button"
            onClick={ask}
            disabled={asked}
            className="mt-6 inline-flex min-h-[48px] items-center gap-2 rounded-full border-[3px] border-ink bg-white px-5 text-[15px] font-black shadow-[4px_4px_0_#000] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#000] disabled:bg-ink disabled:text-sticker disabled:shadow-none [animation:word-rise_0.7s_ease-out_1.5s_both]"
          >
            {asked ? '✓ 질문이 나왔어요 ↓' : '👆 질문 하나 있어요'}
          </button>
        </div>

        <div className="[animation:word-rise_0.8s_ease-out_1.4s_both]">
          <PromptWindow />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between border-t-[3px] border-ink pt-3 font-latin text-[12px] font-semibold sm:text-[13px] [animation:word-rise_0.6s_ease-out_1.7s_both]">
        <span>Hoegilab</span>
        <span>by JH</span>
      </div>
    </section>

      {asked && (
        <div ref={card} className={`${WIDE} mt-8`}>
        <div className="rounded-[22px] border-[3px] border-ink bg-cube px-5 py-8 text-white shadow-[0_8px_0_#000] sm:px-10 sm:py-12 [animation:pop-in_0.5s_cubic-bezier(.3,1.5,.5,1)_both]">
          <p className="inline-block -rotate-2 rounded-full border-2 border-ink bg-sticker px-3 py-1 font-latin text-[13px] font-semibold tracking-[0.2em] text-ink">QUESTION</p>
          <p className="mt-5 text-[clamp(28px,6.4vw,58px)] font-black leading-[1.18] tracking-[-0.03em]">{QUESTION}</p>
          <button
            type="button"
            onClick={reveal}
            disabled={revealed}
            className="mt-7 inline-flex min-h-[48px] items-center gap-2 rounded-full border-[3px] border-ink bg-sticker px-5 text-[15px] font-black text-ink shadow-[4px_4px_0_#000] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#000] disabled:bg-white disabled:shadow-none"
          >
            {revealed ? '✓ 답이 나왔어요 ↓' : '👀 답 보기'}
          </button>
        </div>
        </div>
      )}

      {revealed && (
        <div ref={answerCard} className={`${WIDE} mt-8`}>
        <div className="rounded-[22px] border-[3px] border-ink bg-sticker px-5 py-7 shadow-[0_8px_0_#000] sm:px-10 sm:py-10 [animation:pop-in_0.5s_cubic-bezier(.3,1.5,.5,1)_both]">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hoegilab/vibe-answer.webp"
              alt="안드레 카파시"
              width={720}
              height={714}
              className="w-full max-w-[320px] -rotate-2 rounded-[14px] border-[3px] border-ink object-cover shadow-[6px_6px_0_#000] sm:w-[320px] sm:shrink-0"
            />
            <div className="text-center sm:text-left">
              <p className="inline-block rotate-1 rounded-full border-2 border-ink bg-white px-3 py-1 font-latin text-[13px] font-semibold tracking-[0.2em]">ANSWER</p>
              <p className="mt-4 text-[clamp(36px,9vw,72px)] font-black leading-[1.05] tracking-[-0.03em]">안드레 카파시</p>
              <p className="mt-1 font-latin text-[clamp(18px,4vw,28px)] font-semibold">Andrej Karpathy</p>
              <p className="mt-4 text-[16px] font-bold leading-snug sm:text-[19px]">‘바이브 코딩’이라는 말을 처음 꺼낸 사람</p>
            </div>
          </div>
        </div>
        </div>
      )}

      <div className={`${WIDE} mt-10 flex justify-center sm:justify-end`}>
        <Link
          href="/ai-timeline"
          className="inline-flex min-h-[52px] items-center gap-2 rounded-full border-[3px] border-ink bg-white px-6 text-[16px] font-black shadow-[4px_4px_0_#000] transition-transform hover:bg-sticker active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#000]"
        >
          2026 AI 모델 진화 타임라인 <span aria-hidden>→</span>
        </Link>
      </div>
    </>
  );
}
