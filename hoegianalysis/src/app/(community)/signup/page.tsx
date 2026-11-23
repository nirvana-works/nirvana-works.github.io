import { redirect } from 'next/navigation';
import { SubHeader } from '@/components/community/SubHeader';
import { SignupForm } from '@/components/member/SignupForm';
import { getMember } from '@/lib/members';

export const metadata = { title: '회원가입' };
export const dynamic = 'force-dynamic';

export default async function SignupPage() {
  if (await getMember()) redirect('/account');
  return (
    <div className="space-y-6">
      <SubHeader title="회원가입" blurb="카이스트 메일로 신청하면, 운영자가 확인하고 승인해요." backHref="/" backLabel="홈" />
      <SignupForm />
    </div>
  );
}
