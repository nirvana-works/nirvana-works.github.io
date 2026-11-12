import Link from 'next/link';
import { LexioRoom } from '@/components/community/lexio/LexioRoom';

export const metadata = { title: '렉시오 방' };

export default function Page({ params }: { params: { code: string } }) {
  return (
    <div className="flex flex-col gap-4">
      <Link href="/games/lexio" className="flex min-h-[44px] items-center gap-1.5 text-[14px] font-bold">
        <span aria-hidden>‹</span> 렉시오 홈
      </Link>
      <LexioRoom code={params.code} />
    </div>
  );
}
