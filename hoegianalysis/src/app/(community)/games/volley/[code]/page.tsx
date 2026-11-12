import Link from 'next/link';
import { VolleyRoom } from '@/components/community/volley/VolleyRoom';

export const metadata = { title: '넙죽이 배구 방' };

export default function Page({ params }: { params: { code: string } }) {
  return (
    <div className="flex flex-col gap-4">
      <Link href="/games/volley" className="flex min-h-[44px] items-center gap-1.5 text-[14px] font-bold">
        <span aria-hidden>‹</span> 넙죽이 배구 홈
      </Link>
      <VolleyRoom code={params.code} />
    </div>
  );
}
