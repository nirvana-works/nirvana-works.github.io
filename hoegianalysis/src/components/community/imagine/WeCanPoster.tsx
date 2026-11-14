'use client';

import { useEffect, useRef, useState } from 'react';

const SCRAMBLED = ['#c8322b', '#FFFFFF', '#2fbf6a', '#FF8F2E', '#8fb0ff', '#c8322b', '#F2D80E', '#2fbf6a', '#FFFFFF'];
const SOLVED = '#F2D80E';

const rise = (delay: number) => ({ animation: `word-rise 0.7s cubic-bezier(.2,1.3,.4,1) ${delay}s both` });

type Phase = 'idle' | 'solving' | 'solved';

// "We can do it." 으로 시작해서, 큐브를 누르면 스스로 맞춰지고
// 맞춰진 큐브 면 위에 "We can make everything we imagine." 이 나타난다
export function WeCanPoster() {
  const [run, setRun] = useState(0); // 다시 하기: 값이 바뀌면 처음 상태로
  const [phase, setPhase] = useState<Phase>('idle');
  const timer = useRef<number>(0);

  useEffect(() => {
    setPhase('idle');
    return () => clearTimeout(timer.current);
  }, [run]);

  function solve() {
    if (phase !== 'idle') return;
    setPhase('solving');
    // 아홉 칸이 차례로 맞춰지는 시간(약 1.2초) 뒤에 문장을 띄운다
    timer.current = window.setTimeout(() => setPhase('solved'), 1300);
  }

  const solving = phase !== 'idle';

  return (
    <section
      key={run}
      aria-label="We can do it. We can make everything we imagine."
      className="relative overflow-hidden rounded-[22px] border-[3px] border-ink bg-cube px-5 pb-7 pt-8 text-white shadow-[0_8px_0_#000] sm:px-10 sm:pb-10 sm:pt-10"
      style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.16) 1.6px, transparent 1.6px)', backgroundSize: '20px 20px' }}
    >
      <h1 className="sr-only">We can do it. We can make everything we imagine.</h1>

      {/* 첫 문장 */}
      <div aria-hidden className="whitespace-nowrap text-[clamp(34px,12.6vw,88px)] font-black leading-[1] tracking-[-0.03em]">
        <p>
          <span className="inline-block" style={rise(0.1)}>We</span> <span className="inline-block" style={rise(0.3)}>can</span>{' '}
          <span className="inline-block text-sticker [text-shadow:4px_4px_0_#000]" style={rise(0.55)}>
            do
          </span>{' '}
          <span className="inline-block text-sticker [text-shadow:4px_4px_0_#000]" style={rise(0.75)}>
            it.
          </span>
        </p>
      </div>

      {/* 큐브: 누르면 스스로 맞춰지고, 그 위로 둘째 문장이 나온다 */}
      <div className="relative mx-auto mt-8 w-full max-w-[360px]">
        <button
          type="button"
          onClick={solve}
          disabled={solving}
          aria-label="큐브를 눌러 맞추기"
          className={`relative block aspect-square w-full -rotate-2 rounded-[18px] border-[3px] border-ink bg-ink p-[6px] shadow-[0_6px_0_rgba(0,0,0,0.55)] ${
            phase === 'idle' ? 'cursor-pointer [animation:cube-wiggle_2.4s_ease-in-out_2.2s_infinite]' : 'cursor-default'
          } ${phase === 'solving' ? '[animation:cube-spin_1.15s_ease-in-out_both]' : ''}`}
        >
          {/* 맞춰지면 칸 사이 틈이 닫혀 한 장의 면이 된다 */}
          <span className="grid h-full w-full grid-cols-3 grid-rows-3 overflow-hidden rounded-[11px]" style={{ gap: phase === 'solved' ? 0 : 6, transition: 'gap 0.4s ease-out' }}>
            {SCRAMBLED.map((c, i) => (
              <span
                key={i}
                style={{
                  backgroundColor: solving ? SOLVED : c,
                  borderRadius: phase === 'solved' ? 0 : 9,
                  boxShadow: phase === 'solved' ? 'inset 0 0 0 1px rgba(0,0,0,0.08)' : 'none',
                  transition: `background-color 0.35s ${solving ? i * 0.09 : 0}s, border-radius 0.4s`,
                  animation: `sticker-pop 0.45s cubic-bezier(.3,1.6,.5,1) ${1.0 + i * 0.09}s both`,
                }}
              />
            ))}
          </span>

          {/* 맞춰진 면 위의 문장 */}
          {phase === 'solved' && (
            <span aria-hidden className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center text-[clamp(30px,9.4vw,42px)] font-black leading-[1.12] tracking-[-0.02em] text-ink">
              <span className="block">
                <span className="inline-block" style={rise(0.05)}>We</span> <span className="inline-block" style={rise(0.17)}>can</span>
              </span>
              <span className="block">
                <span className="inline-block" style={rise(0.29)}>make</span>
              </span>
              <span className="relative my-1 block">
                <span className="relative inline-block" style={rise(0.45)}>
                  <span className="absolute inset-0 origin-left rounded-[6px] bg-ink [animation:swipe-in_0.45s_ease-out_0.6s_both]" />
                  <span className="relative px-2.5 text-sticker [animation:ink-flip_0.01s_linear_0.75s_both]">everything</span>
                </span>
              </span>
              <span className="block">
                <span className="inline-block" style={rise(0.75)}>we</span>{' '}
                <span className="inline-block border-b-[6px] border-seal" style={rise(0.87)}>
                  imagine.
                </span>
              </span>
            </span>
          )}
        </button>

        {/* 안내 스티커 (누르기 전에만) */}
        {phase === 'idle' && (
          <span aria-hidden className="pointer-events-none absolute -right-2 -top-4 rotate-6 rounded-full border-2 border-ink bg-white px-3 py-1 font-latin text-[13px] font-semibold text-ink [animation:word-rise_0.6s_ease-out_1.9s_both]">
            TAP ME 👆
          </span>
        )}
      </div>

      <div className="mt-6 flex min-h-[44px] justify-center">
        {phase === 'solved' && (
          <button
            type="button"
            onClick={() => setRun((n) => n + 1)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-2 border-ink bg-white px-4 text-[13px] font-black text-ink [animation:word-rise_0.6s_ease-out_1.7s_both]"
          >
            ↻ Replay
          </button>
        )}
      </div>
    </section>
  );
}
