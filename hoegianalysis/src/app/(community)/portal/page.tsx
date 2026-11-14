import Link from 'next/link';
import { FaceHeader } from '@/components/community/FaceHeader';
import { PORTAL_PAGES } from '@/components/community/sections';
import { COURSES } from '@/lib/courses/winter2026';

export const metadata = { title: '학사포탈' };

// 학사포탈: 교수 소개, 개설과목 같은 학사 정보 페이지로 들어가는 문
export default function PortalPage() {
  const counts: Record<string, string> = { '/courses': `${COURSES.length}개 과목` };

  return (
    <div className="flex flex-col gap-6">
      <FaceHeader href="/portal" />

      <ul className="flex flex-col gap-4">
        {PORTAL_PAGES.map((p, i) => (
          <li key={p.href}>
            <Link
              href={p.href}
              className="group flex items-center gap-4 rounded-[14px] border-2 border-ink bg-white p-3 shadow-[0_4px_0_#000] transition-transform active:translate-y-[2px] active:shadow-[0_2px_0_#000] hover:bg-[#FFF6D6]"
            >
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt="" aria-hidden draggable={false} className="h-[84px] w-[84px] shrink-0 rounded-[10px] border-2 border-ink bg-[#EEF0F4] object-cover object-top" />
              ) : (
                // 모토 페이지: 포스터의 파랑 바탕에 문구를 그대로 옮긴 타일
                <div aria-hidden className="grid h-[84px] w-[84px] shrink-0 place-items-center rounded-[10px] border-2 border-ink bg-cube text-center text-[19px] font-black leading-[1.05] tracking-[-0.03em] text-white">
                  <p>
                    We can
                    <br />
                    <span className="text-sticker [text-shadow:1.5px_1.5px_0_#000]">do it.</span>
                  </p>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-ink bg-sticker font-latin text-[12px] font-black">{i + 1}</span>
                  <span className="font-latin text-[12px] font-semibold tracking-[0.15em] text-inkMuted">{p.en.toUpperCase()}</span>
                </p>
                <h2 className="mt-1 text-[21px] font-black leading-tight">{p.name}</h2>
                <p className="mt-1 text-[13px] leading-snug text-inkMuted">{p.blurb}</p>
              </div>
              {/* 오른쪽 열: 개수 배지(있으면)와 화살표 */}
              <div className="flex shrink-0 flex-col items-end justify-center gap-2">
                {counts[p.href] && <p className="rounded-full border-2 border-ink bg-cube px-2.5 py-0.5 text-[12px] font-black text-white">{counts[p.href]}</p>}
                <span aria-hidden className="text-[26px] font-black leading-none transition-transform group-hover:translate-x-1">
                  ›
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <p className="rounded-[10px] border-2 border-dashed border-ink/40 px-4 py-3 text-center text-[13px] text-inkMuted">앞으로 학사 정보 페이지가 여기에 하나씩 늘어납니다.</p>
    </div>
  );
}
