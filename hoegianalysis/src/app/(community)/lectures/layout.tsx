import { MembersOnly } from '@/components/member/MembersOnly';

// 학사포탈 강의 자료는 회원 전용
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <MembersOnly what="학사포탈" next="/lectures/cashflow">
      {children}
    </MembersOnly>
  );
}
