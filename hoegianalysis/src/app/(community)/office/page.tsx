import Link from 'next/link';
import { FaceHeader } from '@/components/community/FaceHeader';
import { OFFICE_PAGES } from '@/components/community/sections';
import { isAdmin } from '@/lib/adminAuth';
import { listMembers } from '@/lib/members';

export const metadata = { title: '교수님의 공간' };
export const dynamic = 'force-dynamic';

// 교수님의 공간: 교수 소개, 포트폴리오로 들어가는 문. 가입 승인은 운영자에게만 오른쪽 아래 작은 링크로
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
                // 포트폴리오: 관심사·연구 과제를 묶어 두는 서류철
                <div aria-hidden className="grid h-[84px] w-[84px] shrink-0 place-items-center rounded-[10px] border-2 border-ink bg-sticker">
                  <span className="text-[40px] leading-none">📁</span>
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
                <span aria-hidden className="text-[26px] font-black leading-none transition-transform group-hover:translate-x-1">
                  ›
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {admin && (
        <Link href="/office/approvals" className="inline-flex min-h-[44px] items-center gap-1.5 self-end text-[13px] font-bold text-inkMuted hover:text-ink">
          가입 승인
          {pending > 0 && <span className="rounded-full border-2 border-ink bg-seal px-2 py-[1px] text-[11px] font-black text-white">대기 {pending}</span>}
          <span aria-hidden>›</span>
        </Link>
      )}
    </div>
  );
}
