import Link from 'next/link';
import { FaceHeader } from '@/components/community/FaceHeader';
import { OFFICE_PAGES } from '@/components/community/sections';
import { isAdmin } from '@/lib/adminAuth';
import { listMembers } from '@/lib/members';

export const metadata = { title: '교수님의 공간' };
export const dynamic = 'force-dynamic';

// 교수님의 공간: 교수 소개, 가입 승인으로 들어가는 문
export default async function OfficePage() {
  // 운영자에게만 승인 대기 인원을 보여준다
  const admin = isAdmin();
  const pending = admin ? (await listMembers()).filter((m) => m.status === 'pending').length : 0;

  return (
    <div className="flex flex-col gap-6">
      <FaceHeader href="/office" />

      <ul className="flex flex-col gap-4">
        {OFFICE_PAGES.map((p, i) => (
          <li key={p.href}>
            <Link
              href={p.href}
              className="group flex items-center gap-4 rounded-[14px] border-2 border-ink bg-white p-3 shadow-[0_4px_0_#000] transition-transform active:translate-y-[2px] active:shadow-[0_2px_0_#000] hover:bg-[#FFF6D6]"
            >
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt="" aria-hidden draggable={false} className="h-[84px] w-[84px] shrink-0 rounded-[10px] border-2 border-ink bg-[#EEF0F4] object-cover object-top" />
              ) : (
                // 가입 승인: 도장 찍힌 신청서 타일
                <div aria-hidden className="relative grid h-[84px] w-[84px] shrink-0 place-items-center rounded-[10px] border-2 border-ink bg-sticker">
                  <span className="text-[36px] leading-none">📝</span>
                  <span className="absolute bottom-1.5 right-1.5 grid h-7 w-7 -rotate-12 place-items-center rounded-full border-2 border-seal bg-white text-[10px] font-black text-seal">승인</span>
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
              <div className="flex shrink-0 flex-col items-end justify-center gap-2">
                {p.href === '/office/approvals' && pending > 0 && (
                  <p className="rounded-full border-2 border-ink bg-seal px-2.5 py-0.5 text-[12px] font-black text-white">대기 {pending}</p>
                )}
                {p.href === '/office/approvals' && !admin && <p className="text-[16px]" aria-label="운영자 전용">🔒</p>}
                <span aria-hidden className="text-[26px] font-black leading-none transition-transform group-hover:translate-x-1">
                  ›
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
