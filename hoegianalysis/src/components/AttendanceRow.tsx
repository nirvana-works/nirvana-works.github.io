'use client';

import { useState } from 'react';

// 출석자 한 줄. onRename을 주면 이름을 눌러 수정, onDelete를 주면 ✕로 삭제할 수 있음 (관리자 대시보드)
export function AttendanceRow({
  name,
  time,
  onRename,
  onDelete,
  suggestionsListId,
}: {
  name: string;
  time: string;
  // 실패하면 오류 메시지, 성공하면 null
  onRename?: (newName: string) => Promise<string | null>;
  // 실패하면 오류 메시지, 성공하면 null
  onDelete?: () => Promise<string | null>;
  // 자동완성에 쓸 <datalist> id (세션의 다른 출석자 이름)
  suggestionsListId?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function startEdit() {
    setDraft(name);
    setError('');
    setEditing(true);
  }

  async function save() {
    if (!onRename) return;
    const next = draft.trim();
    if (!next || next === name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const err = await onRename(next);
    setSaving(false);
    if (err) {
      setError(err);
    } else {
      setEditing(false);
    }
  }

  async function remove() {
    if (!onDelete) return;
    setSaving(true);
    const err = await onDelete();
    setSaving(false);
    if (err) {
      setError(err);
      setConfirmingDelete(false);
    }
  }

  return (
    <li className="border-b border-cream/10 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="shrink-0 w-6 h-6 rounded-full border-2 border-stamp flex items-center justify-center text-stamp text-xs -rotate-6">
            ●
          </span>
          {editing ? (
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save();
                if (e.key === 'Escape') setEditing(false);
              }}
              list={suggestionsListId}
              autoFocus
              // 수정 시작하면 기존 이름 전체 선택 → 바로 새 이름 입력
              onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 bg-bg border border-neon/60 rounded-lg px-2 py-1 text-cream focus:outline-none"
            />
          ) : onRename ? (
            <button
              type="button"
              onClick={startEdit}
              className="text-cream text-left truncate hover:text-neon"
              aria-label={`${name} 이름 수정`}
            >
              {name}
              <span className="ml-1.5 text-xs text-cream/30">✎</span>
            </button>
          ) : (
            <span className="text-cream truncate">{name}</span>
          )}
        </div>

        {editing ? (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="bg-neon text-bg text-xs font-bold px-2.5 py-1 rounded disabled:opacity-40"
            >
              {saving ? '...' : '저장'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-xs text-cream/40 px-2 py-1"
            >
              취소
            </button>
          </div>
        ) : confirmingDelete ? (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-stamp">삭제할까요?</span>
            <button
              type="button"
              onClick={remove}
              disabled={saving}
              className="text-xs text-stamp border border-stamp/50 px-2 py-0.5 rounded disabled:opacity-40"
            >
              {saving ? '...' : '삭제'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="text-xs text-cream/40 px-2 py-0.5"
            >
              취소
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-cream/40 text-sm">{time}</span>
            {onDelete && (
              <button
                type="button"
                onClick={() => { setError(''); setConfirmingDelete(true); }}
                aria-label={`${name} 출석 삭제`}
                className="w-6 h-6 rounded text-cream/30 hover:text-stamp hover:bg-stamp/10 text-sm leading-none"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>
      {error && <p className="mt-1 ml-9 text-xs text-stamp">{error}</p>}
    </li>
  );
}
