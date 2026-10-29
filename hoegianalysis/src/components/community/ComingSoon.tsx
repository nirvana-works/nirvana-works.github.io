import { FaceHeader } from './FaceHeader';
import type { MenuHref } from './sections';

// 아직 만들지 않은 게시판 자리 (단계별로 실제 페이지로 교체)
export function ComingSoon({ href, note }: { href: MenuHref; note: string }) {
  return (
    <div className="flex flex-col gap-6">
      <FaceHeader href={href} />
      <p className="rounded-[10px] bg-cube px-5 py-4 text-[15px] font-bold leading-relaxed text-white">
        이 면은 아직 맞추는 중입니다. {note}
      </p>
    </div>
  );
}
