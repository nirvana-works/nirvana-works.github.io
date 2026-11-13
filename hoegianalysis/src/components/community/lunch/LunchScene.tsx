/* eslint-disable @next/next/no-img-element */
'use client';

export interface Bubble {
  text: string;
  kind: 'round' | 'burst';
  from: 'doc' | 'nurse';
}

export interface SceneProps {
  doc: number | null; // 의사 넙죽이 포즈 1~9
  nurse?: number | null; // 간호사 넙죽이 포즈 1~6
  nurseMode?: 'stand' | 'wheel';
  bubble?: Bubble | null;
  anger?: boolean; // 💢
  throwing?: boolean; // 차트가 날아온다
  shake?: boolean;
  sparkle?: boolean;
  caption?: string;
  onClick?: () => void;
}

// 진찰실 장면: 배경 + 의사/간호사 넙죽이 + 말풍선 + 효과
export function LunchScene({ doc, nurse, nurseMode = 'stand', bubble, anger, throwing, shake, sparkle, caption, onClick }: SceneProps) {
  const both = doc !== null && nurse && nurseMode === 'stand';
  return (
    <div
      onClick={onClick}
      className={`relative aspect-[4/5] w-full select-none overflow-hidden rounded-[14px] border-[3px] border-ink bg-[#9fd3b8] ${shake ? '[animation:scene-shake_0.12s_linear_infinite]' : ''}`}
      style={{ backgroundImage: 'url(/hoegilab/lunch-bg.webp)', backgroundSize: 'cover', backgroundPosition: 'center bottom' }}
    >
      {/* 의사 */}
      {doc !== null && (
        <div className={`absolute bottom-0 z-10 flex h-[70%] justify-center ${both ? 'left-0 w-[60%]' : 'inset-x-0'}`}>
          <img key={`d${doc}`} src={`/hoegilab/lunch-doc-${doc}.webp`} alt="의사 넙죽이" draggable={false} className="h-full w-auto [animation:doc-pop_0.22s_ease-out_both]" />
        </div>
      )}

      {/* 간호사 */}
      {nurse && nurseMode === 'stand' && (
        <div className={`absolute bottom-0 z-20 flex h-[54%] ${doc === null ? 'inset-x-0 justify-center' : 'right-0 w-[46%] justify-end'}`}>
          <img key={`n${nurse}`} src={`/hoegilab/lunch-nurse-${nurse}.webp`} alt="간호사 넙죽이" draggable={false} className="h-full w-auto [animation:nurse-in_0.4s_ease-out_both]" />
        </div>
      )}
      {nurse && nurseMode === 'wheel' && (
        <img src={`/hoegilab/lunch-nurse-${nurse}.webp`} alt="간호사 넙죽이가 휠체어를 밀고 간다" draggable={false} className="absolute bottom-0 left-0 z-20 h-[64%] w-auto [animation:wheel-across_2.6s_linear_forwards]" />
      )}

      {/* 효과 */}
      {anger && <img src="/hoegilab/lunch-anger.webp" alt="" aria-hidden draggable={false} className="absolute right-[24%] top-[34%] z-30 h-[16%] w-auto [animation:anger-pulse_0.5s_ease-in-out_infinite_alternate]" />}
      {sparkle && (
        <>
          <img src="/hoegilab/lunch-spark.webp" alt="" aria-hidden draggable={false} className="absolute left-[22%] top-[40%] z-30 h-[12%] w-auto [animation:pop-in_0.4s_ease-out_both]" />
          <img src="/hoegilab/lunch-spark.webp" alt="" aria-hidden draggable={false} className="absolute right-[20%] top-[34%] z-30 h-[9%] w-auto [animation:pop-in_0.4s_ease-out_0.15s_both]" />
        </>
      )}
      {throwing && (
        <>
          <img src="/hoegilab/lunch-clipboard-fly.webp" alt="" aria-hidden draggable={false} className="absolute left-1/2 top-[58%] z-40 w-[44%] [animation:clip-fly_0.8s_ease-in_forwards]" />
          <div aria-hidden className="pointer-events-none absolute inset-0 z-40 bg-white [animation:impact-flash_0.5s_ease-out_0.72s_both]" />
        </>
      )}

      {/* 말풍선: 말하는 넙죽이 머리 위에서 꼬리가 머리를 가리킨다 */}
      {bubble && (
        <div
          key={bubble.text}
          className={`absolute z-30 [animation:pop-in_0.3s_cubic-bezier(.3,1.5,.5,1)_both] ${
            bubble.kind === 'burst'
              ? 'inset-x-2 bottom-[50%]'
              : bubble.from === 'nurse'
                ? both
                  ? 'bottom-[42%] right-[1%] w-[56%]'
                  : 'bottom-[50%] left-[6%] w-[88%]'
                : both
                  ? 'bottom-[58%] left-[3%] w-[90%]'
                  : 'bottom-[58%] left-[8%] w-[88%]'
          }`}
        >
          <div className="relative">
            <img
              src={bubble.kind === 'burst' ? '/hoegilab/lunch-burst.webp' : '/hoegilab/lunch-bubble.webp'}
              alt=""
              aria-hidden
              draggable={false}
              className={`absolute inset-0 h-full w-full object-fill ${bubble.from === 'nurse' && both && bubble.kind === 'round' ? '[transform:scaleX(-1)]' : ''}`}
            />
            <p
              className={`relative whitespace-pre-line text-center font-black leading-snug text-[#17130f] ${
                bubble.kind === 'burst' ? 'px-12 pb-9 pt-10 text-[22px]' : bubble.from === 'nurse' && both ? 'px-5 pb-8 pt-4 text-[16px]' : 'px-8 pb-9 pt-6 text-[17px]'
              }`}
            >
              {bubble.text}
            </p>
          </div>
        </div>
      )}

      {caption && <p className="absolute inset-x-0 top-4 z-30 mx-auto w-fit rounded-full border-2 border-ink bg-white px-4 py-1.5 text-[16px] font-black">{caption}</p>}
    </div>
  );
}
