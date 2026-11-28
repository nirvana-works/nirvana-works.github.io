'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CASHFLOW_DECK, CASHFLOW_SLIDES } from './cashflowDeck';
import { SlideCanvas } from './SlideCanvas';

const NEXT_KEYS = ['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'];
const PREV_KEYS = ['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'];
const IDLE_MS = 2500; // 마우스가 멈추면 조작 막대를 숨긴다

// 발표 모드: 화면 가득 16:9 한 장씩. 키보드·클릭·스와이프로 넘기고, 주소 끝 #번호로 지금 장을 기억한다
export function Presenter({ backHref }: { backHref: string }) {
  const slides = CASHFLOW_SLIDES;
  const total = slides.length;
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [full, setFull] = useState(false);
  const [chrome, setChrome] = useState(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();
  const touch = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback(
    (n: number) => {
      setIdx((cur) => {
        const next = Math.max(0, Math.min(total - 1, n));
        if (next !== cur) setDir(next > cur ? 1 : -1);
        return next;
      });
    },
    [total],
  );

  // 주소의 #번호로 시작 장 정하기 (포털 썸네일에서 바로 그 장으로 들어온다)
  useEffect(() => {
    const read = () => {
      const n = parseInt(window.location.hash.slice(1), 10);
      if (n >= 1 && n <= total) setIdx(n - 1);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, [total]);

  // 첫 렌더(아직 #번호를 읽기 전)에는 주소를 덮어쓰지 않는다
  const synced = useRef(false);
  useEffect(() => {
    if (!synced.current) {
      synced.current = true;
      return;
    }
    const url = `${window.location.pathname}${window.location.search}#${idx + 1}`;
    window.history.replaceState(window.history.state, '', url);
  }, [idx]);

  const toggleFull = useCallback(() => {
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
    const root = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
    // 브라우저가 막으면(사용자 동작이 아니거나 iframe 안) 조용히 넘어간다
    const run = (fn?: () => unknown) => Promise.resolve(fn?.()).catch((e) => console.warn('fullscreen:', e));
    if (document.fullscreenElement || doc.webkitFullscreenElement) {
      run((document.exitFullscreen ?? doc.webkitExitFullscreen)?.bind(document));
    } else {
      run((root.requestFullscreen ?? root.webkitRequestFullscreen)?.bind(root));
    }
  }, []);

  useEffect(() => {
    const onChange = () => setFull(Boolean(document.fullscreenElement || (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  const wake = useCallback(() => {
    setChrome(true);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setChrome(false), IDLE_MS);
  }, []);

  useEffect(() => {
    wake();
    return () => clearTimeout(idleTimer.current);
  }, [wake]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement)?.closest('button, a') && (e.key === ' ' || e.key === 'Enter')) return; // 버튼 위에선 버튼이 받는다
      if (NEXT_KEYS.includes(e.key)) {
        e.preventDefault();
        go(idx + 1);
      } else if (PREV_KEYS.includes(e.key)) {
        e.preventDefault();
        go(idx - 1);
      } else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(total - 1);
      else if (e.key === 'f' || e.key === 'F') toggleFull();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, go, total, toggleFull]);

  // 화면 왼쪽 1/4을 누르면 이전, 나머지는 다음
  function onStageClick(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    go(e.clientX - r.left < r.width * 0.25 ? idx - 1 : idx + 1);
  }

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const s = touch.current;
    touch.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(t.clientY - s.y)) {
      e.preventDefault(); // 스와이프 뒤 따라오는 클릭으로 한 장 더 넘어가지 않게
      go(dx < 0 ? idx + 1 : idx - 1);
    }
  }

  const slide = slides[idx];
  const btn = 'grid h-11 min-w-11 place-items-center rounded-[10px] border-2 border-ink bg-white px-3 text-[15px] font-black shadow-[0_3px_0_#000] active:translate-y-[2px] active:shadow-[0_1px_0_#000] disabled:opacity-40';

  return (
    <div className={`fixed inset-0 select-none bg-ink ${chrome ? '' : 'cursor-none'}`} onMouseMove={wake}>
      <h1 className="sr-only">
        {CASHFLOW_DECK.title} — {idx + 1}번째 장: {slide.title}
      </h1>
      <div className="absolute inset-0" onClick={onStageClick} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div key={idx} className={`h-full w-full ${dir > 0 ? 'slide-turn-next' : 'slide-turn-prev'}`}>
          <SlideCanvas fit="contain" index={idx} total={total} deckTitle={CASHFLOW_DECK.title}>
            {slide.body}
          </SlideCanvas>
        </div>
      </div>

      {/* 맨 위 얇은 진행 막대: 조작 막대가 숨어 있어도 보인다 */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[4px] bg-ink/20">
        <div className="h-full bg-cube transition-[width] duration-300" style={{ width: `${((idx + 1) / total) * 100}%` }} />
      </div>

      {/* 조작 막대 */}
      <nav
        aria-label="발표 조작"
        className={`absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-[14px] border-2 border-ink bg-lime p-2 shadow-[0_4px_0_#000] transition-opacity duration-300 ${chrome ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onMouseMove={(e) => e.stopPropagation()}
        onMouseEnter={() => {
          setChrome(true);
          clearTimeout(idleTimer.current);
        }}
      >
        <Link href={backHref} className={btn} title="강의 자료로 돌아가기">
          ‹ 강의 자료
        </Link>
        <button type="button" className={btn} onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="이전 장">
          ←
        </button>
        <span className="min-w-[84px] text-center font-latin text-[15px] font-semibold" aria-live="polite">
          {idx + 1} / {total}
        </span>
        <button type="button" className={btn} onClick={() => go(idx + 1)} disabled={idx === total - 1} aria-label="다음 장">
          →
        </button>
        <button type="button" className={`${btn} bg-sticker`} onClick={toggleFull} aria-label={full ? '전체 화면 끝내기' : '전체 화면'} title="전체 화면 (F)">
          {full ? '전체 화면 끝' : '⛶ 전체 화면'}
        </button>
      </nav>
    </div>
  );
}
