import { MembersOnly } from '@/components/member/MembersOnly';

// 출석 성적표은 회원 전용
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <MembersOnly what="출석 성적표" next="/attendance">
      {children}
    </MembersOnly>
  );
}
