import { MembersOnly } from '@/components/member/MembersOnly';

// 포트폴리오는 회원 전용
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <MembersOnly what="포트폴리오" next="/portfolio">
      {children}
    </MembersOnly>
  );
}
