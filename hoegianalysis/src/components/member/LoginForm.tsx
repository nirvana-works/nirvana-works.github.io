'use client';

import Link from 'next/link';
import { useState } from 'react';
import { yellowButtonClass } from '@/components/community/formStyles';
import { Field } from './Field';
import { safeNext } from './safeNext';

// 회원 로그인. 성공하면 원래 보려던 페이지로 (새로고침해서 위쪽 로그인 표시까지 바뀌게)
export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/member/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? '로그인하지 못했어요.');
        setLoading(false);
        return;
      }
      window.location.href = safeNext(next);
    } catch {
      setError('네트워크 오류로 로그인하지 못했어요. 다시 시도해 주세요.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="카이스트 메일" type="email" inputMode="email" autoComplete="username" placeholder="you@kaist.ac.kr" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} required />
      <Field label="비밀번호" type="password" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} required />
      {error && <p className="text-[14px] font-bold text-seal">{error}</p>}
      <button type="submit" disabled={loading} className={yellowButtonClass}>
        {loading ? '확인 중…' : '로그인'}
      </button>
      <div className="flex justify-between text-[14px]">
        <Link href="/signup" className="font-bold underline underline-offset-4">
          회원가입
        </Link>
        <span className="text-inkMuted">비밀번호를 잊었으면 운영자에게 말해 주세요</span>
      </div>
    </form>
  );
}
