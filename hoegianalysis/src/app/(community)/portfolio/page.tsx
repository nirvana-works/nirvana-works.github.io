import Link from 'next/link';
import { SubHeader } from '@/components/community/SubHeader';
import { CASHFLOW_DECK, CASHFLOW_SLIDES } from '@/components/community/lecture/cashflowDeck';
import { isAdmin } from '@/lib/adminAuth';

export const metadata = { title: '포트폴리오' };

// 포트폴리오: 관심사와 연구 과제를 글 한 편씩 쌓아 두는 곳.
// 아직 공개하지 않은 글은 목록에 '추후 공개'로만 보이고, 운영자만 눌러서 미리 볼 수 있다
export default function PortfolioPage() {
  const preview = isAdmin();
  const box = 'group flex items-center gap-4 rounded-[14px] border-2 border-ink p-3';

  const inner = (
    <>
      <div aria-hidden className="relative grid h-[84px] w-[84px] shrink-0 place-items-center rounded-[10px] border-2 border-ink bg-sticker">
        <span className="absolute left-1.5 top-1.5 rounded-[4px] border-2 border-ink bg-white px-1 font-latin text-[9px] font-semibold leading-tight">16:9</span>
        <span className="text-[38px] leading-none">🐄</span>
        <span className="absolute bottom-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-ink bg-white text-[12px]">🔒</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-latin text-[12px] font-semibold tracking-[0.15em] text-inkMuted">LECTURE · {CASHFLOW_SLIDES.length} SLIDES</p>
        <h2 className="mt-1 text-[19px] font-black leading-tight">{CASHFLOW_DECK.title}</h2>
        <p className="mt-1 text-[13px] leading-snug text-inkMuted">{CASHFLOW_DECK.subtitle}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-center gap-2">
        <p className="rounded-full border-2 border-ink bg-sticker px-2.5 py-0.5 text-[12px] font-black">추후 공개</p>
        {preview && <p className="text-[11px] font-bold text-inkMuted">운영자 미리 보기 ›</p>}
      </div>
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <SubHeader title="포트폴리오" blurb="관심사와 연구 과제를 하나씩 쌓아 두는 곳" backHref="/portal" backLabel="학사포탈" />
      {preview ? (
        <Link href="/portfolio/cashflow" className={`${box} border-dashed bg-white/60 transition-transform hover:bg-[#FFF6D6] active:translate-y-[2px]`}>
          {inner}
        </Link>
      ) : (
        <div aria-disabled="true" className={`${box} border-dashed bg-white/60`}>
          {inner}
        </div>
      )}
    </div>
  );
}
