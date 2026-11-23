import { redirect } from 'next/navigation';
import { SubHeader } from '@/components/community/SubHeader';
import { AccountPanel } from '@/components/member/AccountPanel';
import { getMember } from '@/lib/members';

export const metadata = { title: '내 정보' };
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const m = await getMember();
  if (!m) redirect('/login?next=/account');
  return (
    <div className="space-y-6">
      <SubHeader title="내 정보" backHref="/" backLabel="홈" />
      <dl className="grid grid-cols-[72px_1fr] gap-y-2 rounded-[14px] border-2 border-ink bg-white p-4 text-[15px] shadow-[4px_4px_0_#000]">
        <dt className="font-bold">별명</dt>
        <dd>{m.nickname}</dd>
        <dt className="font-bold">이름</dt>
        <dd>
          {m.name} · {m.cohort}
        </dd>
        <dt className="font-bold">메일</dt>
        <dd className="break-all">{m.email}</dd>
      </dl>
      <AccountPanel />
    </div>
  );
}
