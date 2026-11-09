import { CUBE_BODY, FACE_COLORS, faceArtUrl } from './cubeArt';
import type { Menu } from './sections';

// 큐브 한 면: 파란 몸체 위 3×3 스티커. 그림 하나를 아홉 칸에 나눠 붙인다
export function CubeFace({ menu, size, className = '' }: { menu: Menu; size: number; className?: string }) {
  const gap = Math.max(1, Math.round(size * 0.028));
  const radius = Math.max(1, Math.round(size * 0.04));
  const art = faceArtUrl(menu.art, menu.color);
  const bg = FACE_COLORS[menu.color].bg;

  return (
    <span
      aria-hidden
      className={`grid shrink-0 grid-cols-3 ${className}`}
      style={{
        width: size,
        height: size,
        padding: gap,
        gap,
        background: CUBE_BODY,
        borderRadius: radius * 1.8,
      }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          style={{
            background: `${art} ${(i % 3) * 50}% ${Math.floor(i / 3) * 50}% / 300% 300% no-repeat, ${bg}`,
            borderRadius: radius,
            imageRendering: 'pixelated',
          }}
        />
      ))}
    </span>
  );
}
