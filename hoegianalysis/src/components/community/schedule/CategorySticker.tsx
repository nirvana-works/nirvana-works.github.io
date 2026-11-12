// 분류 이름이 적힌 스티커. 모양마다 글씨 중심 높이가 달라 top으로 맞춘다 (기준 높이 46px)
const STICKER: Record<string, { w: number; top: string }> = {
  hoegi: { w: 62, top: '54%' },
  external: { w: 52, top: '56%' },
  planning: { w: 68, top: '50%' },
  value: { w: 48, top: '46%' },
  tf: { w: 46, top: '50%' },
  academic: { w: 72, top: '38%' },
  group: { w: 64, top: '50%' },
  birthday: { w: 46, top: '68%' },
};

export function hasSticker(k: string): boolean {
  return k in STICKER;
}

export function CategorySticker({ k, label, scale = 1, className = '' }: { k: string; label: string; scale?: number; className?: string }) {
  const st = STICKER[k];
  if (!st) return null;
  return (
    <span className={`relative inline-block ${className}`} style={{ width: st.w * scale, height: 46 * scale }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/hoegilab/schedule-sticker-${k}.webp`} alt="" aria-hidden className="h-full w-full select-none object-contain" />
      <span
        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-black leading-none tracking-[-0.03em] text-white [-webkit-text-stroke:3px_#14213D] [paint-order:stroke_fill]"
        style={{ top: st.top, fontSize: Math.round(12 * scale * 10) / 10 }}
      >
        {label}
      </span>
    </span>
  );
}
