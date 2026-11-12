'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// 운영자(교수님)가 중요한 일정을 눌러 공지 게시판에 바로 올린다. 한 일정에 공지는 하나
export function PostNoticeButton({ eventId, posted }: { eventId: string; posted: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(posted);
  const [error, setError] = useState('');

  if (done) {
    return (
      <Link href="/notice" className="shrink-0 self-center rounded-[8px] border-2 border-ink bg-white px-2 py-1 text-[12px] font-bold">
        공지 올라감 ›
      </Link>
    );
  }

  async function post() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/notice/from-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? '공지로 올리지 못했어요.');
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError('네트워크 오류로 올리지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex shrink-0 flex-col items-end self-center">
      <button
        type="button"
        onClick={post}
        disabled={busy}
        className="min-h-[36px] rounded-[8px] border-2 border-ink bg-sticker px-2 text-[12px] font-bold disabled:opacity-50"
      >
        {busy ? '올리는 중…' : '📌 공지로'}
      </button>
      {error && <span className="mt-0.5 text-[11px] text-seal">{error}</span>}
    </span>
  );
}
