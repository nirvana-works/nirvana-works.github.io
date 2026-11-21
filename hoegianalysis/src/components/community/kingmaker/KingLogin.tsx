'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { fieldClass, yellowButtonClass } from '../formStyles';

// 킹메이커 입구: 암호를 넣어야 안쪽이 보인다
export function KingLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return setError('암호를 입력하세요.');
    setBusy(true);
    setError('');
    const res = await fetch('/api/kingmaker/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    setBusy(false);
    if (!res) return setError('네트워크 오류예요. 다시 시도해 주세요.');
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return setError(data.error ?? '들어가지 못했어요.');
    router.refresh();
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto mt-6 flex w-full max-w-[380px] flex-col gap-3 rounded-[14px] border-2 border-ink bg-white p-5">
      <p className="text-[13px] font-bold text-inkMuted">🔒 비밀 페이지</p>
      <label htmlFor="king-pw" className="text-[15px] font-bold">
        암호
      </label>
      <input
        id="king-pw"
        type="password"
        autoComplete="off"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError('');
        }}
        className={fieldClass}
        autoFocus
      />
      {!configured && (
        <p role="alert" className="text-[13px] text-seal">
          서버에 암호가 아직 설정되지 않았어요 (KINGMAKER_PASSWORD).
        </p>
      )}
      {error && (
        <p role="alert" className="text-[14px] text-seal">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className={yellowButtonClass}>
        {busy ? '확인 중…' : '들어가기'}
      </button>
    </form>
  );
}
