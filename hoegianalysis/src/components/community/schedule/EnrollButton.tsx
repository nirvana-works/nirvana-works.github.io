'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { deviceId } from '@/lib/deviceId';
import { ENROLL_NAME_LIMIT } from '@/lib/enrollmentTypes';
import { fieldClass, yellowButtonClass } from '../formStyles';

interface Row {
  id: string;
  name: string;
  mine: boolean;
}

// 회기분석 수업 옆 수강신청 버튼. 누르면 이름을 적고, 지금까지 신청한 사람들을 이름표로 볼 수 있다
export function EnrollButton({ eventId, title, count, isAdmin }: { eventId: string; title: string; count: number; isAdmin: boolean }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [justDone, setJustDone] = useState(false);

  async function load() {
    try {
      const res = await fetch(`/api/schedule/${eventId}/enroll?device=${encodeURIComponent(deviceId())}`, { cache: 'no-store' });
      const data = (await res.json()) as { enrollments?: Row[]; error?: string };
      if (!res.ok) throw new Error(data.error);
      setRows(data.enrollments ?? []);
    } catch {
      setRows([]);
      setError('신청자를 불러오지 못했어요.');
    }
  }

  function open() {
    setRows(null);
    setError('');
    setJustDone(false);
    dialogRef.current?.showModal();
    void load();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/schedule/${eventId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, deviceId: deviceId() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? '신청하지 못했어요.');
        return;
      }
      setName('');
      setJustDone(true);
      await load();
      router.refresh();
    } catch {
      setError('네트워크 오류로 신청하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    setError('');
    try {
      const res = await fetch(`/api/schedule/${eventId}/enroll/${id}?device=${encodeURIComponent(deviceId())}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? '취소하지 못했어요.');
        return;
      }
      setJustDone(false);
      await load();
      router.refresh();
    } catch {
      setError('네트워크 오류로 취소하지 못했어요.');
    }
  }

  const total = rows ? rows.length : count;

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="flex shrink-0 flex-col items-center self-center rounded-[8px] border-2 border-ink bg-sticker px-2.5 py-1 text-[12px] font-black leading-tight hover:bg-[#e3c900]"
      >
        <span>✍ 수강신청</span>
        <span className="font-latin text-[11px] font-semibold">{count}명</span>
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
        className="m-auto max-h-[92vh] w-[min(94vw,440px)] overflow-y-auto rounded-[14px] border-2 border-ink bg-lime p-0 backdrop:bg-ink/55"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[12px] font-black text-seal">★ 회기분석 수강신청</p>
              <h2 className="text-[20px] font-black leading-tight">{title}</h2>
            </div>
            <button type="button" onClick={() => dialogRef.current?.close()} aria-label="닫기" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[22px]">
              ×
            </button>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
            <label htmlFor={`enroll-name-${eventId}`} className="text-[14px] font-bold">
              내 이름
            </label>
            <div className="flex gap-2">
              <input
                id={`enroll-name-${eventId}`}
                value={name}
                maxLength={ENROLL_NAME_LIMIT}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                  setJustDone(false);
                }}
                placeholder="이름 또는 별명"
                className={fieldClass}
              />
              <button type="submit" disabled={busy || !name.trim()} className={`${yellowButtonClass} !w-auto shrink-0 px-5`}>
                {busy ? '…' : '신청'}
              </button>
            </div>
            {error && (
              <p role="alert" className="text-[14px] text-seal">
                {error}
              </p>
            )}
            {justDone && <p className="text-[14px] font-bold">신청됐어요! 수업에서 만나요 🎉</p>}
          </form>

          {/* 신청한 사람들: 이름표 */}
          <div>
            <h3 className="mb-2 text-[15px] font-black">
              신청한 사람 <span className="font-latin">{total}</span>명
            </h3>
            {rows === null ? (
              <p className="py-3 text-center text-[13px] text-inkMuted">불러오는 중…</p>
            ) : rows.length === 0 ? (
              <p className="rounded-[10px] border-2 border-dashed border-ink/40 py-5 text-center text-[14px] text-inkMuted">아직 아무도 없어요. 첫 번째로 신청해 보세요!</p>
            ) : (
              <ul className="grid grid-cols-2 gap-2">
                {rows.map((r, i) => (
                  <li key={r.id} className="relative overflow-hidden rounded-[8px] border-2 border-ink bg-[#FBF7EC]">
                    <p className="flex items-center justify-between bg-seal px-2 py-[1px] text-[10px] font-black text-white">
                      <span>수강생</span>
                      <span className="font-latin">No.{i + 1}</span>
                    </p>
                    <p className="truncate px-2 py-1.5 text-center text-[16px] font-bold">{r.name}</p>
                    {(r.mine || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => cancel(r.id)}
                        aria-label={`${r.name} 신청 취소`}
                        className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center text-[14px] font-black text-seal"
                      >
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {rows && rows.some((r) => r.mine) && <p className="mt-2 text-[12px] text-inkMuted">✕를 누르면 내가 신청한 이름을 취소할 수 있어요.</p>}
          </div>
        </div>
      </dialog>
    </>
  );
}
