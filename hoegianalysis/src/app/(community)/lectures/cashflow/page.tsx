import Link from 'next/link';
import { SubHeader } from '@/components/community/SubHeader';
import { CASHFLOW_DECK, CASHFLOW_SLIDES } from '@/components/community/lecture/cashflowDeck';
import { SlideCanvas } from '@/components/community/lecture/SlideCanvas';

export const metadata = { title: '강의 자료 · 현금흐름 파이프라인' };

const PRESENT_HREF = '/present/cashflow';

// 학사포탈 게시물: 강의 자료 한 편. 위에서 발표 모드로 들어가고, 아래에서 16장을 차례로 훑어본다
export default function CashflowLecturePage() {
  const total = CASHFLOW_SLIDES.length;

  return (
    <div className="flex flex-col gap-6">
      <SubHeader title={CASHFLOW_DECK.title} blurb={CASHFLOW_DECK.subtitle} backHref="/portal" backLabel="학사포탈" />

      {/* 게시물 정보 + 발표 모드 입구 */}
      <section className="rounded-[14px] border-2 border-ink bg-white p-4 shadow-[0_4px_0_#000]">
        <dl className="grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-1.5 text-[14px]">
          <dt className="font-bold text-inkMuted">분류</dt>
          <dd>
            <span className="rounded-full border-2 border-ink bg-sticker px-2 py-[1px] text-[12px] font-black">강의 자료</span>
          </dd>
          <dt className="font-bold text-inkMuted">발표</dt>
          <dd className="font-bold">{CASHFLOW_DECK.speaker}</dd>
          <dt className="font-bold text-inkMuted">분량</dt>
          <dd>슬라이드 {total}장 · 16:9</dd>
        </dl>
        <Link
          href={`${PRESENT_HREF}#1`}
          className="mt-4 flex min-h-[52px] items-center justify-center gap-2 rounded-[12px] border-2 border-ink bg-cube text-[17px] font-black text-white shadow-[0_4px_0_#000] transition-transform active:translate-y-[2px] active:shadow-[0_2px_0_#000]"
        >
          <span aria-hidden>▶</span> 발표 모드로 보기
        </Link>
        <p className="mt-2 text-center text-[12px] text-inkMuted">→ · 스페이스 · 클릭으로 넘기기, F로 전체 화면</p>
      </section>

      {/* 16장 미리 보기. 누르면 그 장부터 발표 모드 */}
      <ol className="flex flex-col gap-5">
        {CASHFLOW_SLIDES.map((s, i) => (
          <li key={i}>
            <p className="mb-1.5 flex items-baseline gap-2 text-[13px]">
              <span className="font-latin font-semibold">{String(i + 1).padStart(2, '0')}</span>
              <span className="font-bold">{s.title}</span>
            </p>
            <Link
              href={`${PRESENT_HREF}#${i + 1}`}
              aria-label={`${i + 1}번째 장부터 발표 모드로 보기`}
              className="block overflow-hidden rounded-[12px] border-2 border-ink shadow-[0_4px_0_#000] transition-transform hover:-translate-y-[2px] active:translate-y-[2px] active:shadow-[0_2px_0_#000]"
            >
              <SlideCanvas index={i} total={total} deckTitle={CASHFLOW_DECK.title}>
                {s.body}
              </SlideCanvas>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
