import Link from 'next/link';
import { ChessRoom } from '@/components/community/chess/ChessRoom';

export const metadata = { title: '넙죽이 체스 방' };

export default function Page({ params }: { params: { code: string } }) {
  return (
    <div className="flex flex-col gap-4">
      <Link href="/games/chess" className="flex min-h-[44px] items-center gap-1.5 text-[14px] font-bold">
        <span aria-hidden>‹</span> 넙죽이 체스 홈
      </Link>
      <ChessRoom code={params.code} />
    </div>
  );
}
