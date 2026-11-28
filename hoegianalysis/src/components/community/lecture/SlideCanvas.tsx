'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export const SLIDE_W = 1600;
export const SLIDE_H = 900;

// 1600×900 포스터 한 장. 감싼 상자 너비(또는 높이)에 맞춰 통째로 확대·축소한다 (16:9 고정)
export function SlideCanvas({
  index,
  total,
  deckTitle,
  fit = 'width',
  children,
}: {
  index: number;
  total: number;
  deckTitle: string;
  fit?: 'width' | 'contain' | 'none'; // none: 1600×900 그대로 (인쇄·PDF용, 크기 재기·변환 없음)
  children: ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el || fit === 'none') return;
    const measure = () => {
      // 넘김 애니메이션의 회전·이동에 흔들리지 않도록 변환 전 레이아웃 크기로 잰다
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      setScale(fit === 'contain' ? Math.min(width / SLIDE_W, height / SLIDE_H) : width / SLIDE_W);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  if (fit === 'none') {
    return (
      <div className="relative overflow-hidden bg-lime text-ink" style={{ width: SLIDE_W, height: SLIDE_H }}>
        <SlideChrome index={index} total={total} deckTitle={deckTitle} />
        <div className="absolute inset-x-[96px] bottom-[92px] top-[112px] flex flex-col justify-center">{children}</div>
      </div>
    );
  }

  return (
    <div ref={boxRef} className={fit === 'contain' ? 'relative h-full w-full' : 'relative aspect-video w-full'}>
      <div
        className="absolute left-1/2 top-1/2 overflow-hidden bg-lime text-ink"
        style={{
          width: SLIDE_W,
          height: SLIDE_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
          visibility: scale ? 'visible' : 'hidden',
        }}
      >
        <SlideChrome index={index} total={total} deckTitle={deckTitle} />
        <div className="absolute inset-x-[96px] bottom-[92px] top-[112px] flex flex-col justify-center">{children}</div>
      </div>
    </div>
  );
}

// 포스터 테두리: 워드마크, 모서리 괄호, 점 무리, 아래쪽 진행 스티커
function SlideChrome({ index, total, deckTitle }: { index: number; total: number; deckTitle: string }) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <>
      <div className="absolute left-[96px] top-[40px]">
        <p className="font-latin text-[26px] font-semibold leading-none tracking-[-0.01em]">Hoegilab.</p>
        <span className="mt-3 block h-[3px] w-[128px] bg-ink" />
      </div>

      {/* 오른쪽 위 모서리 괄호 + 장 번호 */}
      <div className="absolute right-[88px] top-[30px] h-[64px] w-[64px]">
        <span className="absolute left-0 top-0 h-[16px] w-[16px] border-l-[3px] border-t-[3px] border-ink" />
        <span className="absolute right-0 top-0 h-[16px] w-[16px] border-r-[3px] border-t-[3px] border-ink" />
        <span className="absolute bottom-0 left-0 h-[16px] w-[16px] border-b-[3px] border-l-[3px] border-ink" />
        <span className="absolute bottom-0 right-0 h-[16px] w-[16px] border-b-[3px] border-r-[3px] border-ink" />
        <span className="absolute inset-0 grid place-items-center font-latin text-[22px] font-semibold">{pad(index + 1)}</span>
      </div>

      <div aria-hidden className="dot-cluster absolute left-[30px] top-[300px] h-[54px] w-[36px] opacity-70" />
      <div aria-hidden className="dot-cluster absolute right-[30px] top-[520px] h-[54px] w-[36px] opacity-70" />

      {/* 아래쪽: 강의 제목 + 큐브 스티커 진행 표시 */}
      <div className="absolute inset-x-[96px] bottom-[30px] flex items-center justify-between gap-8 border-t-[3px] border-ink pt-[14px]">
        <p className="truncate text-[15px] font-bold text-inkMuted">{deckTitle}</p>
        <div className="flex shrink-0 items-center gap-4">
          <div className="flex gap-[5px]">
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={`h-[14px] w-[14px] rounded-[4px] border-[2px] border-ink ${i === index ? 'bg-sticker' : i < index ? 'bg-cube' : 'bg-white'}`}
              />
            ))}
          </div>
          <span className="font-latin text-[16px] font-semibold">
            {pad(index + 1)} / {pad(total)}
          </span>
        </div>
      </div>
    </>
  );
}
