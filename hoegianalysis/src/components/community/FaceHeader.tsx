import Link from 'next/link';
import { MENUS, menuIndex, type MenuHref } from './sections';

// 페이지 제목. 큐브처럼 면은 돌아가며 이어진다(마지막 다음은 처음)
export function FaceHeader({ href }: { href: MenuHref }) {
  const i = menuIndex(href);
  const menu = MENUS[i];
  const prev = MENUS[(i - 1 + MENUS.length) % MENUS.length];
  const next = MENUS[(i + 1) % MENUS.length];

  return (
    <section>
      <h1 className="text-[32px] font-black leading-tight">{menu.name}</h1>
      <p className="mt-1 text-[14px] leading-snug text-inkMuted">{menu.blurb}</p>
      <div className="mt-5 flex items-center justify-between border-t-2 border-ink text-[14px] font-bold">
        <Link href={prev.href} className="flex min-h-[44px] items-center gap-1.5">
          <span aria-hidden>‹</span>
          <span>
            <span className="sr-only">이전 면 </span>
            {prev.name}
          </span>
        </Link>
        <Link href={next.href} className="flex min-h-[44px] items-center gap-1.5">
          <span>
            <span className="sr-only">다음 면 </span>
            {next.name}
          </span>
          <span aria-hidden>›</span>
        </Link>
      </div>
    </section>
  );
}
