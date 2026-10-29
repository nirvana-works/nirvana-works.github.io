'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SchoolEvent } from '@/lib/schoolEvents';
import { EventList } from './EventList';

// 추가 화면의 일정 목록. 삭제는 운영자에게만 보이고, 한 번 더 눌러야 실행된다
export function ManageEventList({ events, canDelete }: { events: SchoolEvent[]; canDelete: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function remove(id: string) {
    setBusy(id);
    setError('');
    try {
      const res = await fetch(`/api/schedule/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? '일정을 지우지 못했어요.');
        return;
      }
      setConfirming(null);
      router.refresh();
    } catch {
      setError('네트워크 오류로 지우지 못했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(null);
    }
  }

  if (events.length === 0) {
    return <p className="border-y-2 border-ink py-6 text-center text-[14px] text-inkMuted">등록된 일정이 없어요.</p>;
  }

  return (
    <>
      {error && <p className="mb-2 text-[14px] text-seal">{error}</p>}
      <EventList
        events={events}
        action={(e) =>
          !canDelete ? null : confirming === e.id ? (
            <span className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => remove(e.id)}
                disabled={busy === e.id}
                className="h-11 rounded-[6px] bg-seal px-3 text-[13px] font-bold text-white"
              >
                {busy === e.id ? '삭제 중…' : '삭제'}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="h-11 px-2 text-[13px] font-bold text-inkMuted"
              >
                취소
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(e.id)}
              aria-label={`${e.title} 삭제`}
              className="h-11 shrink-0 px-2 text-[13px] font-bold text-inkMuted hover:text-seal"
            >
              삭제
            </button>
          )
        }
      />
    </>
  );
}
