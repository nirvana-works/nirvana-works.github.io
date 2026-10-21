'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { todayLocal } from '@/lib/date';

export default function AdminPage() {
  const router = useRouter();
  const [date, setDate] = useState(todayLocal);
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !adminPassword) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, adminPassword }),
      });

      const data = await res.json() as { sessionId?: string; error?: string };

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
            onChange={(e) => setDate(e.target.value)}
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
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="비밀번호 설정"
            className="w-full bg-bg border border-cream/20 rounded-xl px-4 py-3 text-cream text-base placeholder:text-cream/30 focus:outline-none focus:border-neon"
            required
          />
        </div>

        {error && <p className="text-stamp text-sm">{error}</p>}

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
