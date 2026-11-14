import Link from 'next/link';

// 면 안의 세부 페이지 제목. 위로 올라가는 링크(예: ‹ 학사포탈)와 함께 쓴다
export function SubHeader({ title, blurb, backHref, backLabel }: { title: string; blurb?: string; backHref: string; backLabel: string }) {
  return (
    <section>
      <Link href={backHref} className="inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-bold">
        <span aria-hidden>‹</span> {backLabel}
      </Link>
      <h1 className="text-[32px] font-black leading-tight">{title}</h1>
      {blurb && <p className="mt-1 text-[14px] leading-snug text-inkMuted">{blurb}</p>}
      <div className="mt-5 border-t-2 border-ink" />
    </section>
  );
}
