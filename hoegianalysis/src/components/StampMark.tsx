"use client";

import { useEffect, useState } from "react";

export function StampMark({
  label = "출석체크",
  name = "",
  onNext,
}: {
  label?: string;
  name?: string;
  onNext?: () => void;
}) {
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowText(true), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-bg z-50 select-none">
      {/* 도장 — .stamp 클래스로 애니메이션 */}
      <div className="stamp flex items-center justify-center rounded-2xl border-[6px] border-stamp px-10 py-6 relative">
        <span className="absolute inset-1 rounded-xl border-2 border-stamp/40 pointer-events-none" />
        <span className="font-display text-stamp text-4xl tracking-[0.2em]">{label}</span>
      </div>

      {/* 완료 메시지 */}
      <p
        className="mt-8 text-cream/70 text-lg transition-opacity duration-500"
        style={{ opacity: showText ? 1 : 0 }}
      >
        {name ? `${name}님, 출석체크 완료!` : "출석체크 완료!"}
      </p>

      {/* 다음 사람 버튼 */}
      {onNext && (
        <button
          onClick={onNext}
          className="mt-8 px-6 py-3 border border-cream/20 text-cream/50 rounded-xl text-sm hover:border-cream/40 hover:text-cream/80 transition-colors"
          style={{ opacity: showText ? 1 : 0, transition: "opacity 0.5s" }}
        >
          다음 사람 출석체크
        </button>
      )}
    </div>
  );
}
