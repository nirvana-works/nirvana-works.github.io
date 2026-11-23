import { GamesChrome } from '@/components/community/games/GamesChrome';
import { MembersOnly } from '@/components/member/MembersOnly';

// 놀이터는 회원 전용
export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return (
    <MembersOnly what="놀이터" next="/games">
      <div className="flex flex-col gap-6">
        <GamesChrome />
        {children}
      </div>
    </MembersOnly>
  );
}
