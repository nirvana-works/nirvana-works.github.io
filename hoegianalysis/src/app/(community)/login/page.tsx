import { redirect } from 'next/navigation';
import { SubHeader } from '@/components/community/SubHeader';
import { LoginForm } from '@/components/member/LoginForm';
import { safeNext } from '@/components/member/safeNext';
import { getMember } from '@/lib/members';

export const metadata = { title: '로그인' };
export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  if (await getMember()) redirect(safeNext(searchParams.next));
  return (
    <div className="space-y-6">
      <SubHeader title="로그인" blurb="회기랩 회원은 학회원 전용 메뉴를 볼 수 있어요." backHref="/" backLabel="홈" />
      <LoginForm next={searchParams.next} />
    </div>
  );
}
