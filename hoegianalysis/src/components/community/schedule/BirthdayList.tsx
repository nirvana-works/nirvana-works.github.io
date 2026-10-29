'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Birthday } from '@/lib/birthdays';

// 등록된 멤버 생일. 지우기는 운영자에게만 보이고, 한 번 더 눌러야 실행된다
export function BirthdayList({ birthdays, canDelete }: { birthdays: Birthday[]; canDelete: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function remove(id: string) {
    setError('');
    const res = await fetch(`/api/birthdays/${id}`, { method: 'DELETE' }).catch(() => null);
    if (res && (res.ok || res.status === 404)) {
      setConfirming(null);
      router.refresh();
    } else {
      setError('생일을 지우지 못했어요. 다시 시도해 주세요.');
    }
  }

  if (birthdays.length === 0) {
    return <p className="border-y-2 border-ink py-6 text-center text-[14px] text-inkMuted">아직 등록된 생일이 없어요.</p>;
  }

  return (
    <>
      {error && <p className="mb-2 text-[14px] text-seal">{error}</p>}
      <ul className="divide-y divide-ink/15 border-y-2 border-ink">
        {birthdays.map((b) => (
          <li key={b.id} className="flex min-h-[48px] items-center gap-3 py-2">
            <span className="w-[76px] shrink-0 font-latin text-[13px] font-semibold">
              {b.month}/{b.day}
            </span>
            <span className="min-w-0 flex-1 truncate text-[16px] font-bold">
              <span aria-hidden>🎂 </span>
              {b.name}
            </span>
            {canDelete &&
              (confirming === b.id ? (
                <span className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => remove(b.id)} className="h-11 rounded-[6px] bg-seal px-3 text-[13px] font-bold text-white">
                    삭제
                  </button>
                  <button type="button" onClick={() => setConfirming(null)} className="h-11 px-2 text-[13px] font-bold text-inkMuted">
                    취소
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(b.id)}
                  aria-label={`${b.name} 생일 삭제`}
                  className="h-11 shrink-0 px-2 text-[13px] font-bold text-inkMuted hover:text-seal"
                >
                  삭제
                </button>
              ))}
          </li>
        ))}
      </ul>
    </>
  );
}
