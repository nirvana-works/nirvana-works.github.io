import Link from 'next/link';
import { PokerRoom } from '@/components/community/poker/PokerRoom';

export const metadata = { title: '인디언 포커 방' };

export default function Page({ params }: { params: { code: string } }) {
  return (
    <div className="flex flex-col gap-4">
      <Link href="/games/poker" className="flex min-h-[44px] items-center gap-1.5 text-[14px] font-bold">
        <span aria-hidden>‹</span> 인디언 포커 홈
      </Link>
      <PokerRoom code={params.code} />
    </div>
  );
}
