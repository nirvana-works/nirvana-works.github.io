import { MembersOnly } from '@/components/member/MembersOnly';

// 낙서 벽은 회원 전용
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <MembersOnly what="낙서 벽" next="/wall">
      {children}
    </MembersOnly>
  );
}
