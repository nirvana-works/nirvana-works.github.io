'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaceHeader } from '../FaceHeader';

// 게임 탭. 게임이 늘면 여기에 한 줄씩 추가한다
export const GAMES = [
  { href: '/games/mafia', label: '마피아' },
  { href: '/games/poker', label: '인디언 포커' },
  { href: '/games/lexio', label: '렉시오' },
  { href: '/games/hwatu', label: '화투점' },
  { href: '/games/blocks', label: '넙죽이 블록' },
  { href: '/games/volley', label: '넙죽이 배구' },
] as const;

// 방 안(/games/<게임>/<코드>)에서는 제목·탭을 숨겨 게임 화면에 집중하게 한다
export function GamesChrome() {
  const pathname = usePathname();
  if (/^\/games\/[^/]+\/[^/]+/.test(pathname)) return null;

  return (
    <>
      <FaceHeader href="/games" />
      <nav aria-label="게임 목록" className="-mt-2 flex flex-wrap gap-2">
        {GAMES.map((g) => {
          const on = pathname === g.href || pathname.startsWith(`${g.href}/`);
          return (
            <Link
              key={g.href}
              href={g.href}
              aria-current={on ? 'page' : undefined}
              className={`rounded-full border-2 border-ink px-4 py-1.5 text-[15px] font-bold ${on ? 'bg-ink text-white' : 'bg-white'}`}
            >
              {g.label}
            </Link>
          );
        })}
        <span className="rounded-full border-2 border-dashed border-ink/30 px-4 py-1.5 text-[15px] font-bold text-ink/40">
          + 게임 준비 중
        </span>
      </nav>
    </>
  );
}
