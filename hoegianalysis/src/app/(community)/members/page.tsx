import { AdminLogin, LogoutButton } from '@/components/community/AdminLogin';
import { SubHeader } from '@/components/community/SubHeader';
import { MemberAdmin } from '@/components/member/MemberAdmin';
import { adminConfigured, isAdmin } from '@/lib/adminAuth';
import { listMembers } from '@/lib/members';

export const metadata = { title: '회원 관리' };
export const dynamic = 'force-dynamic';

// 운영자 전용: 가입 신청 승인, 정지, 비밀번호 초기화
export default async function MembersPage() {
  if (!isAdmin())
    return (
      <div className="space-y-6">
        <SubHeader title="회원 관리" blurb="운영자만 들어올 수 있어요." backHref="/" backLabel="홈" />
        {adminConfigured() ? <AdminLogin /> : <p className="text-[14px]">운영자 비밀번호(ADMIN_PASSWORD)가 아직 설정되지 않았어요.</p>}
      </div>
    );

  const members = await listMembers();
  return (
    <div className="space-y-6">
      <SubHeader title="회원 관리" blurb="가입 신청을 확인하고 승인해 주세요." backHref="/" backLabel="홈" />
      <MemberAdmin members={members} />
      <div className="text-center">
        <LogoutButton />
      </div>
    </div>
  );
}
