import { ChessHome } from '@/components/community/chess/ChessHome';

export const metadata = { title: '넙죽이 체스' };

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-[28px] font-black leading-tight">넙죽이 체스</h1>
        <p className="text-[14px] text-inkMuted">큐브 판 위에서 한 수 한 수. 넙죽이 봇과 두거나, 방을 만들어 친구와 해요.</p>
      </header>
      <ChessHome />
    </div>
  );
}
