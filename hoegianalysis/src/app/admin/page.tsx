'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { todayLocal } from '@/lib/date';
import { SessionPicker } from '@/components/SessionPicker';
import type { SessionMatch } from '@/lib/sessionLookup';

export default function AdminPage() {
  const router = useRouter();
  const [date, setDate] = useState(todayLocal);
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existing, setExisting] = useState<SessionMatch[] | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await create(false);
  }

  async function create(force: boolean) {
    if (!date || !adminPassword) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, adminPassword, force }),
      });

      const data = await res.json() as { sessionId?: string; error?: string; existing?: SessionMatch[] };

      // 같은 날짜·비밀번호의 정산이 이미 있음 → 기존 정산을 열지, 그래도 새로 만들지 고르게 함
      if (res.status === 409 && data.existing) {
        setExisting(data.existing);
        setLoading(false);
        return;
      }

      if (res.ok && data.sessionId) {
        sessionStorage.setItem(`admin_pw_${data.sessionId}`, adminPassword);
        router.push(`/admin/${data.sessionId}`);
      } else {
        setError(data.error ?? '세션 생성에 실패했습니다.');
        setLoading(false);
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 gap-8 font-body">
      <div className="text-center">
        <h1 className="font-display text-4xl neon-text mb-2">관리자</h1>
        <p className="text-cream/50 text-sm">새 회기분석 세션을 만들어 QR코드를 공유하세요.</p>
      </div>

      <form
        onSubmit={handleCreate}
        className="w-full max-w-sm flex flex-col gap-4 bg-bgAlt border border-cream/10 p-6 rounded-2xl"
      >
        <div>
          <label className="block text-xs font-medium text-cream/50 mb-1 tracking-widest uppercase">
            회기분석 날짜
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setExisting(null); }}
            className="w-full bg-bg border border-cream/20 rounded-xl px-4 py-3 text-cream text-base focus:outline-none focus:border-neon"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-cream/50 mb-1 tracking-widest uppercase">
            관리자 비밀번호
          </label>
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => { setAdminPassword(e.target.value); setExisting(null); }}
            placeholder="비밀번호 설정"
            className="w-full bg-bg border border-cream/20 rounded-xl px-4 py-3 text-cream text-base placeholder:text-cream/30 focus:outline-none focus:border-neon"
            required
          />
        </div>

        {error && <p className="text-stamp text-sm">{error}</p>}

        {existing && (
          <div className="flex flex-col gap-2 border border-neon/30 rounded-xl p-3">
            <p className="text-sm text-neon">
              이 날짜·비밀번호로 만든 정산이 이미 있어요. 이어서 하려면 아래에서 고르세요.
            </p>
            <SessionPicker sessions={existing} password={adminPassword} />
            <button
              type="button"
              onClick={() => create(true)}
              disabled={loading}
              className="mt-1 text-sm text-cream/50 underline disabled:opacity-40"
            >
              그래도 새로 만들기
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-neon text-bg font-bold py-3 rounded-xl text-lg disabled:opacity-40 transition-opacity"
        >
          {loading ? '생성 중...' : '새 세션 만들기'}
        </button>
      </form>
    </main>
  );
}
