import { MembersOnly } from '@/components/member/MembersOnly';

// 포트폴리오도 학사포탈 안이라 회원 전용
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <MembersOnly what="학사포탈" next="/portfolio">
      {children}
    </MembersOnly>
  );
}
