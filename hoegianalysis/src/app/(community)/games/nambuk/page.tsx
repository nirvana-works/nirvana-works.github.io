import { NambukGame } from '@/components/community/nambuk/NambukGame';

export const metadata = { title: '넙죽이 남북전쟁' };

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-[28px] font-black leading-tight">넙죽이 남북전쟁</h1>
        <p className="text-[14px] text-inkMuted">지도에서 땅을 차지하고, 맞붙으면 실시간으로. 열차도 털고 다리도 부수는 옛날 게임을 떠올리며.</p>
      </header>
      <NambukGame />
    </div>
  );
}
