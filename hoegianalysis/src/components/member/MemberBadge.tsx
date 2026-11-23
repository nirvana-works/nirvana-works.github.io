'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

// 화면 위 왼쪽, 워드마크 아래: 로그인했으면 별명(내 정보로), 아니면 '로그인'
export function MemberBadge() {
  const [state, setState] = useState<{ nickname: string; admin?: boolean } | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    fetch('/api/member/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { member: { nickname: string; admin?: boolean } | null }) => alive && setState(d.member))
      .catch(() => alive && setState(null));
    return () => {
      alive = false;
    };
  }, []);

  if (state === undefined) return <span className="mt-2 block h-[18px]" aria-hidden />;
  return (
    <Link
      href={state ? '/account' : '/login'}
      className="mt-2 inline-flex h-[18px] max-w-[180px] items-center gap-1 truncate text-[12px] font-bold underline-offset-2 hover:underline"
    >
      {state ? (
        <>
          <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-cube" />
          <span className="truncate">{state.nickname}</span>
          {state.admin && <span className="shrink-0 rounded-[4px] bg-ink px-1 text-[10px] leading-[14px] text-white">운영자</span>}
        </>
      ) : (
        <span className="text-inkMuted">로그인 · 회원가입</span>
      )}
    </Link>
  );
}
