'use client';

import { useState } from 'react';

// QR을 찍지 못한 참가자를 관리자가 직접 출석 처리하는 입력칸 (차수마다 하나)
export function ManualCheckinForm({
  onAdd,
  suggestionsListId,
}: {
  // 실패하면 오류 메시지, 성공하면 null
  onAdd: (name: string) => Promise<string | null>;
  suggestionsListId?: string;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setError('');
    const err = await onAdd(trimmed);
    setSaving(false);
    if (err) {
      setError(err);
    } else {
      setName('');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); setError(''); }}
          placeholder="QR 못 찍은 사람 이름 직접 추가"
          list={suggestionsListId}
          className="flex-1 min-w-0 bg-bg border border-dashed border-cream/25 rounded-lg px-3 py-2 text-sm text-cream placeholder:text-cream/30 focus:outline-none focus:border-neon"
        />
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="shrink-0 border border-neon/50 text-neon text-sm font-bold px-3 py-2 rounded-lg hover:bg-neon/10 disabled:opacity-40"
        >
          {saving ? '...' : '추가'}
        </button>
      </div>
      {error && <p className="text-xs text-stamp">{error}</p>}
    </form>
  );
}
