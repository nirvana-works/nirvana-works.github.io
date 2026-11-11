import Link from 'next/link';
import { MafiaRoom } from '@/components/community/mafia/MafiaRoom';

export const metadata = { title: '마피아 방' };

export default function Page({ params }: { params: { code: string } }) {
  return (
    <div className="flex flex-col gap-4">
      <Link href="/games/mafia" className="flex min-h-[44px] items-center gap-1.5 text-[14px] font-bold">
        <span aria-hidden>‹</span> 마피아 홈
      </Link>
      <MafiaRoom code={params.code} />
    </div>
  );
}
