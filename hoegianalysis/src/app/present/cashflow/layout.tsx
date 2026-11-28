import { MembersOnly } from '@/components/member/MembersOnly';

// 발표 모드·인쇄 화면도 학사포탈 강의 자료라서 회원 전용
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <MembersOnly what="학사포탈" next="/present/cashflow">
      {children}
    </MembersOnly>
  );
}
