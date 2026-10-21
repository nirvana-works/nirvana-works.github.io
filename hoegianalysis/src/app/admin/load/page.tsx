'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { todayLocal } from '@/lib/date';

// 날짜 + 관리자 비밀번호로 진행 중인 정산(세션)을 다시 여는 화면
export default function LoadSessionPage() {
  const router = useRouter();
  const [date, setDate] = useState(todayLocal);
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLoad(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !adminPassword) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/sessions/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, adminPassword }),
      });

      const data = await res.json() as { sessionId?: string; error?: string };

      if (res.ok && data.sessionId) {
        // 대시보드가 비밀번호를 다시 묻지 않도록 저장 (세션 생성 때와 같은 방식)
        sessionStorage.setItem(`admin_pw_${data.sessionId}`, adminPassword);
        router.push(`/admin/${data.sessionId}`);
      } else {
        setError(data.error ?? '정산을 불러오지 못했어요.');
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
        <h1 className="font-display text-4xl neon-text mb-2">정산 불러오기</h1>
        <p className="text-cream/50 text-sm">세션을 만들 때 입력한 날짜와 비밀번호를 넣으세요.</p>
      </div>

      <form
        onSubmit={handleLoad}
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
            placeholder="세션 만들 때 정한 비밀번호"
            className="w-full bg-bg border border-cream/20 rounded-xl px-4 py-3 text-cream text-base placeholder:text-cream/30 focus:outline-none focus:border-neon"
            required
            autoFocus
          />
        </div>

        {error && <p className="text-stamp text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-neon text-bg font-bold py-3 rounded-xl text-lg disabled:opacity-40 transition-opacity"
        >
          {loading ? '찾는 중...' : '불러오기'}
        </button>
      </form>

      <Link href="/" className="text-sm text-cream/40 underline">
        처음으로
      </Link>
    </main>
  );
}
