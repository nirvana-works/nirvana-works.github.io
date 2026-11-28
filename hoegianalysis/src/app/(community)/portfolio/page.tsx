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
      <SubHeader title="포트폴리오" blurb="관심사와 연구 과제를 하나씩 쌓아 두는 곳" backHref="/office" backLabel="교수님의 공간" />
      <Link
        href="/portfolio/designs"
        className={`${box} bg-white shadow-[0_4px_0_#000] transition-transform hover:bg-[#FFF6D6] active:translate-y-[2px] active:shadow-[0_2px_0_#000]`}
      >
        <div aria-hidden className="grid h-[84px] w-[84px] shrink-0 grid-cols-2 overflow-hidden rounded-[10px] border-2 border-ink">
          {['#F59BC3', '#F77B2E', '#55C3B5', '#F9D648'].map((c) => (
            <span key={c} style={{ background: c }} />
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-latin text-[12px] font-semibold tracking-[0.15em] text-inkMuted">DESIGN DRAFTS</p>
          <h2 className="mt-1 text-[19px] font-black leading-tight">디자인 시안 보관함</h2>
          <p className="mt-1 text-[13px] leading-snug text-inkMuted">다른 스타일을 견본으로 만들어 두고 필요할 때 꺼내 씁니다</p>
        </div>
        <span aria-hidden className="text-[26px] font-black leading-none transition-transform group-hover:translate-x-1">
          ›
        </span>
      </Link>
      {/* 바이브 코딩 발표. 표지 사진은 퀴즈의 답(카파시)이라 썸네일로 쓰지 않는다 */}
      <Link
        href="/vibe"
        className={`${box} bg-white shadow-[0_4px_0_#000] transition-transform hover:bg-[#FFF6D6] active:translate-y-[2px] active:shadow-[0_2px_0_#000]`}
      >
        <div aria-hidden className="flex h-[84px] w-[84px] shrink-0 flex-col overflow-hidden rounded-[10px] border-2 border-ink bg-white">
          <div className="flex items-center gap-1 border-b-2 border-ink bg-[#EEF0F4] px-1.5 py-1">
            <span className="h-2 w-2 rounded-full border border-ink bg-seal" />
            <span className="h-2 w-2 rounded-full border border-ink bg-sticker" />
            <span className="h-2 w-2 rounded-full border border-ink bg-[#2fbf6a]" />
          </div>
          <div className="grid flex-1 place-items-center bg-cube font-latin text-[22px] font-black leading-none text-white">
            {'>_'}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-latin text-[12px] font-semibold tracking-[0.15em] text-inkMuted">TALK · VIBE CODING</p>
          <h2 className="mt-1 text-[19px] font-black leading-tight">바이브 코딩은 무엇일까?</h2>
          <p className="mt-1 text-[13px] leading-snug text-inkMuted">이 사이트를 AI에게 말로 시켜 만든 이야기와 그 말을 처음 꺼낸 사람</p>
        </div>
        <span aria-hidden className="text-[26px] font-black leading-none transition-transform group-hover:translate-x-1">
          ›
        </span>
      </Link>
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
