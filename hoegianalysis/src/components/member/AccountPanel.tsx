'use client';

import { useState } from 'react';
import { yellowButtonClass } from '@/components/community/formStyles';
import { Field } from './Field';

// 내 정보 화면의 비밀번호 바꾸기 + 로그아웃
export function AccountPanel() {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function change(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) return setMsg({ ok: false, text: '새 비밀번호 확인이 달라요.' });
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/member/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current: cur, next }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) setMsg({ ok: false, text: data.error ?? '바꾸지 못했어요.' });
      else {
        setMsg({ ok: true, text: '비밀번호를 바꿨어요. 다른 기기에서는 로그아웃됐어요.' });
        setCur('');
        setNext('');
        setConfirm('');
      }
    } catch {
      setMsg({ ok: false, text: '네트워크 오류로 바꾸지 못했어요.' });
    }
    setLoading(false);
  }

  async function logout() {
    await fetch('/api/member/login', { method: 'DELETE' }).catch(() => null);
    window.location.href = '/';
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={change} className="flex flex-col gap-4">
        <h2 className="text-[18px] font-black">비밀번호 바꾸기</h2>
        <Field label="지금 비밀번호" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} required />
        <Field label="새 비밀번호" type="password" autoComplete="new-password" hint="8자 이상" value={next} onChange={(e) => setNext(e.target.value)} required />
        <Field label="새 비밀번호 확인" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        {msg && <p className={`text-[14px] font-bold ${msg.ok ? 'text-cube' : 'text-seal'}`}>{msg.text}</p>}
        <button type="submit" disabled={loading} className={yellowButtonClass}>
          {loading ? '바꾸는 중…' : '비밀번호 바꾸기'}
        </button>
      </form>
      <button type="button" onClick={logout} className="h-12 rounded-[10px] border-2 border-ink bg-white text-[16px] font-bold hover:bg-lime">
        로그아웃
      </button>
    </div>
  );
}
