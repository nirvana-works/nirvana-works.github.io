import { VolleyHome } from '@/components/community/volley/VolleyHome';

export const metadata = { title: '넙죽이 배구' };

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-[28px] font-black leading-tight">넙죽이 배구</h1>
        <p className="text-[14px] text-inkMuted">1994년 LA 해변에서 넙죽이끼리 한 판. 봇과 하거나, 방을 만들어 친구와 해요.</p>
      </header>
      <VolleyHome />
    </div>
  );
}
