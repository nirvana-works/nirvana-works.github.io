'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { fieldClass, primaryButtonClass } from './formStyles';

// 커뮤니티 운영자 로그인 (ADMIN_PASSWORD). 성공하면 같은 페이지를 다시 그리고 onSuccess를 부른다
export function AdminLogin({ onSuccess }: { onSuccess?: () => void } = {}) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setError('비밀번호를 입력하세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/community/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? '로그인하지 못했어요.');
        setLoading(false);
        return;
      }
      router.refresh();
      setPassword('');
      setLoading(false);
      onSuccess?.();
    } catch {
      setError('네트워크 오류로 로그인하지 못했어요. 다시 시도해 주세요.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-xs flex-col gap-3">
      <label htmlFor="admin-password" className="text-[14px] font-bold">
        운영자 비밀번호
      </label>
      <input
        id="admin-password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError('');
        }}
        className={fieldClass}
      />
      {error && <p className="text-[14px] text-seal">{error}</p>}
      <button type="submit" disabled={loading} className={primaryButtonClass}>
        {loading ? '확인 중…' : '로그인'}
      </button>
    </form>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch('/api/community/admin', { method: 'DELETE' });
        router.refresh();
      }}
      className="text-[13px] font-bold text-inkMuted underline underline-offset-4"
    >
      로그아웃
    </button>
  );
}
