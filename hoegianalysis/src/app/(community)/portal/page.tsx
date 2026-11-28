import Link from 'next/link';
import { FaceHeader } from '@/components/community/FaceHeader';
import { PORTAL_PAGES } from '@/components/community/sections';
import { COURSES } from '@/lib/courses/winter2026';

export const metadata = { title: '학사포탈' };

// 학사포탈: 출석 성적표, 개설과목 같은 학사 정보 페이지로 들어가는 문
export default function PortalPage() {
  const counts: Record<string, string> = { '/courses': `${COURSES.length}개 과목` };

  return (
    <div className="flex flex-col gap-6">
      <FaceHeader href="/portal" />

      <ul className="flex flex-col gap-4">
        {PORTAL_PAGES.map((p, i) => {
          // 추후 공개 항목은 목록에만 보이고 눌러도 열리지 않는다
          const soon = 'soon' in p && p.soon;
          const inner = (
            <>
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt="" aria-hidden draggable={false} className="h-[84px] w-[84px] shrink-0 rounded-[10px] border-2 border-ink bg-[#EEF0F4] object-cover object-top" />
              ) : p.href === '/attendance' ? (
                // 출석 성적표: 성적표 종이 위에 빨간 펜으로 동그라미 친 A+
                <div aria-hidden className="relative grid h-[84px] w-[84px] shrink-0 place-items-center overflow-hidden rounded-[10px] border-2 border-ink bg-white">
                  {/* 성적표 줄 */}
                  <span className="absolute inset-x-2 top-[14px] flex flex-col gap-[9px]">
                    {[0, 1, 2, 3, 4, 5].map((k) => (
                      <span key={k} className="block h-[2px] bg-ink/10" />
                    ))}
                  </span>
                  <span className="relative grid h-[60px] w-[66px] rotate-[-8deg] place-items-center rounded-[50%] border-[3px] border-seal">
                    <span className="font-sign text-[34px] font-black leading-none tracking-[-0.06em] text-seal">
                      A<span className="relative -top-[11px] text-[22px]">+</span>
                    </span>
                  </span>
                </div>
              ) : p.href === '/portfolio' ? (
                // 포트폴리오: 관심사·연구 과제를 묶어 두는 서류철
                <div aria-hidden className="grid h-[84px] w-[84px] shrink-0 place-items-center rounded-[10px] border-2 border-ink bg-sticker">
                  <span className="text-[40px] leading-none">📁</span>
                </div>
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
                {soon ? (
                  <p className="rounded-full border-2 border-ink bg-sticker px-2.5 py-0.5 text-[12px] font-black">추후 공개</p>
                ) : (
                  <span aria-hidden className="text-[26px] font-black leading-none transition-transform group-hover:translate-x-1">
                    ›
                  </span>
                )}
              </div>
            </>
          );
          const box = 'group flex items-center gap-4 rounded-[14px] border-2 border-ink p-3';
          return (
            <li key={p.href}>
              {soon ? (
                <div aria-disabled="true" className={`${box} border-dashed bg-white/60`}>
                  {inner}
                </div>
              ) : (
                <Link href={p.href} className={`${box} bg-white shadow-[0_4px_0_#000] transition-transform hover:bg-[#FFF6D6] active:translate-y-[2px] active:shadow-[0_2px_0_#000]`}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <p className="rounded-[10px] border-2 border-dashed border-ink/40 px-4 py-3 text-center text-[13px] text-inkMuted">앞으로 학사 정보 페이지가 여기에 하나씩 늘어납니다.</p>
    </div>
  );
}
