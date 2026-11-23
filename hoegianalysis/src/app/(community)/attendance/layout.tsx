import { MembersOnly } from '@/components/member/MembersOnly';

// 학사포탈(출석 성적표)은 회원 전용
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <MembersOnly what="학사포탈" next="/attendance">
      {children}
    </MembersOnly>
  );
}
