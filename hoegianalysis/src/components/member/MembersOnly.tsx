import Link from 'next/link';
import { yellowButtonClass } from '@/components/community/formStyles';
import { isAdmin } from '@/lib/adminAuth';
import { getMember } from '@/lib/members';

// 받침이 있으면 '은', 없으면 '는' (낙서 벽은 / 놀이터는)
function topic(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? '은' : '는';
}

// 회원(또는 운영자)만 보는 화면. 아니면 잠긴 화면과 로그인·가입 버튼을 보여준다
export async function MembersOnly({ what, next, children }: { what: string; next: string; children: React.ReactNode }) {
  if (isAdmin() || (await getMember())) return <>{children}</>;
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <span aria-hidden className="flex h-16 w-16 items-center justify-center rounded-[14px] border-2 border-ink bg-sticker text-[30px]">
        🔒
      </span>
      <h1 className="text-[24px] font-black">회원 전용이에요</h1>
      <p className="text-[14px] leading-relaxed text-inkMuted">
        {what}
        {topic(what)} 회기랩 회원만 볼 수 있어요.
        <br />
        로그인하거나, 카이스트 메일로 가입 신청해 주세요.
      </p>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link href={`/login?next=${encodeURIComponent(next)}`} className={`${yellowButtonClass} flex items-center justify-center`}>
          로그인
        </Link>
        <Link href="/signup" className="flex h-12 items-center justify-center rounded-[10px] border-2 border-ink bg-white text-[16px] font-bold hover:bg-lime">
          회원가입
        </Link>
      </div>
    </div>
  );
}
