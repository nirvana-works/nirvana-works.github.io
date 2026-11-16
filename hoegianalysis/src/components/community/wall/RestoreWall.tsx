'use client';

import { useRef, useState } from 'react';

interface Hidden {
  id: string;
  nickname: string;
  content: string;
  created_at: string;
  hidden_at: string | null;
}

const when = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// 운영자 전용: 지운 낙서를 보고 벽에 되살린다 (지운 낙서는 DB에 남아 있다)
export function RestoreWall() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [rows, setRows] = useState<Hidden[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  async function open() {
    setRows(null);
    setError('');
    setDone(null);
    dialogRef.current?.showModal();
    try {
      const res = await fetch('/api/wall/hidden', { cache: 'no-store' });
      const data = (await res.json()) as { posts?: Hidden[]; error?: string };
      if (!res.ok) throw new Error(data.error);
      setRows(data.posts ?? []);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error && e.message ? e.message : '지운 낙서를 불러오지 못했어요.');
    }
  }

  async function restore(body: { all: true } | { ids: string[] }) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/wall/hidden', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = (await res.json()) as { restored?: number; error?: string };
      if (!res.ok) throw new Error(data.error);
      setDone(data.restored ?? 0);
      // 벽을 다시 불러와 되살린 낙서가 보이게 한다
      window.setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : '되살리지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={open} className="h-11 rounded-[10px] border-2 border-ink bg-white px-3 text-[14px] font-bold">
        ↺ 지운 낙서
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
        className="m-auto max-h-[92vh] w-[min(94vw,460px)] overflow-y-auto rounded-[14px] border-2 border-ink bg-lime p-0 backdrop:bg-ink/55"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[12px] font-black text-seal">운영자 전용</p>
              <h2 className="text-[20px] font-black leading-tight">지운 낙서 되살리기</h2>
            </div>
            <button type="button" onClick={() => dialogRef.current?.close()} aria-label="닫기" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[22px]">
              ×
            </button>
          </div>

          {rows === null && <p className="py-4 text-center text-[14px] text-inkMuted">불러오는 중…</p>}

          {rows && rows.length === 0 && !error && <p className="rounded-[10px] border-2 border-dashed border-ink/40 py-6 text-center text-[14px] text-inkMuted">지운 낙서가 없어요.</p>}

          {rows && rows.length > 0 && (
            <>
              <button
                type="button"
                disabled={busy || done !== null}
                onClick={() => restore({ all: true })}
                className="h-12 rounded-[10px] border-2 border-ink bg-sticker text-[16px] font-bold hover:bg-[#e3c900] disabled:opacity-50"
              >
                {done !== null ? `${done}개 되살렸어요` : `지운 낙서 ${rows.length}개 모두 되살리기`}
              </button>
              <ul className="flex flex-col gap-2">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 rounded-[10px] border-2 border-ink bg-white px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-[15px] font-bold leading-snug">{r.content}</p>
                      <p className="mt-0.5 text-[12px] text-inkMuted">
                        {r.nickname} · 쓴 날 <span className="font-latin">{when(r.created_at)}</span>
                        {r.hidden_at && (
                          <>
                            {' '}
                            · 지운 날 <span className="font-latin">{when(r.hidden_at)}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy || done !== null}
                      onClick={() => restore({ ids: [r.id] })}
                      className="min-h-[40px] shrink-0 rounded-full border-2 border-ink bg-white px-3 text-[13px] font-black hover:bg-sticker disabled:opacity-50"
                    >
                      되살리기
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {error && (
            <p role="alert" className="text-[14px] text-seal">
              {error}
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}
