import Link from 'next/link';
import { SubHeader } from '@/components/community/SubHeader';

export const metadata = { title: '디자인 시안 보관함' };

// 디자인 시안 보관함: 회기랩과 다른 스타일을 견본으로 만들어 두고, 웹페이지·발표 자료를 만들 때 꺼내 쓴다
const DRAFTS = [
  {
    no: '01',
    href: '/designs/neo-brutalism',
    name: '네오 브루탈리즘',
    en: 'Neo Brutalism',
    concept: '크림 종이 위 두꺼운 먹선, 판마다 원색 하나, 레트로 만화 스티커',
    swatches: ['#F4EAD5', '#141414', '#F59BC3', '#F77B2E', '#55C3B5', '#F9D648', '#8EB2F2'],
  },
];

export default function DesignDraftsPage() {
  return (
    <div className="flex flex-col gap-6">
      <SubHeader title="디자인 시안 보관함" blurb="다른 스타일을 견본으로 만들어 두고 필요할 때 꺼내 씁니다" backHref="/portfolio" backLabel="포트폴리오" />
      <ul className="flex flex-col gap-4">
        {DRAFTS.map((d) => (
          <li key={d.href}>
            <Link
              href={d.href}
              className="group flex items-center gap-4 rounded-[14px] border-2 border-ink bg-white p-3 shadow-[0_4px_0_#000] transition-transform hover:bg-[#FFF6D6] active:translate-y-[2px] active:shadow-[0_2px_0_#000]"
            >
              {/* 색 견본 타일 */}
              <div aria-hidden className="grid h-[84px] w-[84px] shrink-0 grid-cols-2 overflow-hidden rounded-[10px] border-2 border-ink">
                {d.swatches.slice(2, 6).map((c) => (
                  <span key={c} style={{ background: c }} />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <span className="grid h-6 shrink-0 place-items-center rounded-full border-2 border-ink bg-sticker px-1.5 font-latin text-[12px] font-black">{d.no}</span>
                  <span className="font-latin text-[12px] font-semibold tracking-[0.15em] text-inkMuted">{d.en.toUpperCase()}</span>
                </p>
                <h2 className="mt-1 text-[21px] font-black leading-tight">{d.name}</h2>
                <p className="mt-1 text-[13px] leading-snug text-inkMuted">{d.concept}</p>
              </div>
              <span aria-hidden className="text-[26px] font-black leading-none transition-transform group-hover:translate-x-1">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="rounded-[10px] border-2 border-dashed border-ink/40 px-4 py-3 text-center text-[13px] text-inkMuted">시안이 하나씩 늘어납니다.</p>
    </div>
  );
}
