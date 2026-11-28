import Link from 'next/link';
import { isAdmin } from '@/lib/adminAuth';

// 아직 공개하지 않은 포트폴리오 글. 운영자(발표자)만 미리 들어가 보고, 나머지는 '추후 공개' 안내를 본다
export async function NotYetOpen({ children }: { children: React.ReactNode }) {
  if (isAdmin()) return <>{children}</>;
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-10 text-center">
      <span aria-hidden className="flex h-16 w-16 items-center justify-center rounded-[14px] border-2 border-ink bg-sticker text-[30px]">
        🔒
      </span>
      <h1 className="text-[24px] font-black">추후 공개</h1>
      <p className="text-[14px] leading-relaxed text-inkMuted">
        이 글은 아직 준비 중이에요.
        <br />
        공개되면 포트폴리오에서 열 수 있어요.
      </p>
      <Link href="/portfolio" className="flex h-12 w-full max-w-xs items-center justify-center rounded-[10px] border-2 border-ink bg-white text-[16px] font-bold hover:bg-lime">
        ‹ 포트폴리오로
      </Link>
    </div>
  );
}
