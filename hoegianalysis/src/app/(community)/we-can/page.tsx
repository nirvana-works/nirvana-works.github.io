import Link from 'next/link';
import { WeCanPoster } from '@/components/community/imagine/WeCanPoster';

export const metadata = { title: 'We can do it' };

export default function WeCanPage() {
  return (
    <div className="flex flex-col gap-4">
      <Link href="/" className="inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-bold">
        <span aria-hidden>‹</span> Hoegilab
      </Link>
      <WeCanPoster />
    </div>
  );
}
