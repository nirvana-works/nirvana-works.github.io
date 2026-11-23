import { AdminLogin, LogoutButton } from '@/components/community/AdminLogin';
import { SubHeader } from '@/components/community/SubHeader';
import { MemberAdmin } from '@/components/member/MemberAdmin';
import { adminConfigured, isAdmin } from '@/lib/adminAuth';
import { listMembers } from '@/lib/members';

export const metadata = { title: '가입 승인' };
export const dynamic = 'force-dynamic';

// 교수님의 공간 > 가입 승인. 운영자(ADMIN_EMAILS 회원 로그인 또는 운영자 비밀번호)만
export default async function ApprovalsPage() {
  if (!isAdmin())
    return (
      <div className="space-y-6">
        <SubHeader title="가입 승인" blurb="운영자만 들어올 수 있어요. 운영자 계정으로 로그인하거나 운영자 비밀번호를 넣어 주세요." backHref="/office" backLabel="교수님의 공간" />
        {adminConfigured() ? <AdminLogin /> : <p className="text-[14px]">운영자 비밀번호(ADMIN_PASSWORD)가 아직 설정되지 않았어요.</p>}
      </div>
    );

  const members = await listMembers();
  return (
    <div className="space-y-6">
      <SubHeader title="가입 승인" blurb="가입 신청을 확인하고 승인해 주세요." backHref="/office" backLabel="교수님의 공간" />
      <MemberAdmin members={members} />
      <div className="text-center">
        <LogoutButton />
      </div>
    </div>
  );
}
