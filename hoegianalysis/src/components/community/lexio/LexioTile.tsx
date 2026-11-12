import { SUITS, tileNum, tileSuit } from '@/lib/lexioCore';

// 무늬마다 일러스트 타일 (구름 초록, 별 보라, 달 파랑, 태양 빨강). 숫자는 모서리 배지로 따로 얹는다
const SUIT_LOOK = [
  { img: 'cloud', rim: '#1f7a3a', dark: '#12502a' },
  { img: 'star', rim: '#5a3aa0', dark: '#37216b' },
  { img: 'moon', rim: '#2a5db0', dark: '#173a76' },
  { img: 'sun', rim: '#c0392b', dark: '#85201a' },
] as const;

export function Tile({
  id,
  w = 52,
  selected,
  onClick,
  label,
  tileRef,
  invisible,
}: {
  id: number;
  w?: number;
  selected?: boolean;
  onClick?: () => void;
  label?: string;
  tileRef?: (el: HTMLElement | null) => void;
  invisible?: boolean;
}) {
  const suit = SUITS[tileSuit(id)];
  const look = SUIT_LOOK[tileSuit(id)];
  const num = tileNum(id);
  const line = Math.max(1, w * 0.03);
  const pad = Math.max(2, w * 0.05);
  const style: React.CSSProperties = {
    width: w,
    height: w * 1.42,
    padding: pad,
    borderRadius: w * 0.12,
    background: 'linear-gradient(160deg,#fbf3dc,#e9dcb8)',
    boxShadow: `0 ${w * 0.07}px 0 ${look.dark}, 0 ${w * 0.11}px ${w * 0.07}px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.75)${selected ? ', 0 0 0 3px #F2D80E' : ''}`,
    transform: selected ? `translateY(${-w * 0.26}px)` : undefined,
    opacity: invisible ? 0 : 1,
    transition: 'transform 140ms ease-out',
  };
  const body = (
    <span className="relative block h-full w-full">
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: `url(/hoegilab/lexio-tile-${look.img}.webp)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          border: `${line}px solid ${look.rim}`,
          borderRadius: w * 0.07,
        }}
      />
      <span
        aria-hidden
        className="absolute grid place-items-center font-latin font-semibold leading-none"
        style={{
          left: w * 0.035,
          top: w * 0.035,
          minWidth: w * 0.4,
          height: w * 0.34,
          padding: `0 ${w * 0.05}px`,
          background: '#fbf4de',
          border: `${line}px solid ${look.rim}`,
          borderRadius: w * 0.09,
          color: look.rim,
          fontSize: num >= 10 ? w * 0.22 : w * 0.3,
        }}
      >
        {num}
      </span>
    </span>
  );
  const aria = label ?? `${suit.name} ${num}`;
  return onClick ? (
    <button ref={tileRef} type="button" onClick={onClick} aria-pressed={selected} aria-label={aria} className="relative block shrink-0" style={style}>
      {body}
    </button>
  ) : (
    <span ref={tileRef} role="img" aria-label={aria} className="relative block shrink-0" style={style}>
      {body}
    </span>
  );
}
