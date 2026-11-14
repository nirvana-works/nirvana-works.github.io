'use client';

import { useRef, useState } from 'react';
import { deviceId } from '@/lib/deviceId';
import { PLAN_NAME_LIMIT, type CoursePlan } from '@/lib/coursePlanTypes';
import { fieldClass, yellowButtonClass } from '../formStyles';

const NAME_KEY = 'hl_plan_name';

// 과목마다 붙는 "들을 예정이에요" 버튼. 누르면 이름을 적는 팝업이 뜨고, 같이 듣는 사람들도 볼 수 있다
export function CoursePlans({
  courseKey,
  title,
  plans,
  isAdmin,
  onChanged,
  tone = 'default',
}: {
  courseKey: string;
  title: string;
  plans: CoursePlan[]; // 이 과목을 들을 예정인 사람들
  isAdmin: boolean;
  onChanged: (name?: string) => void;
  tone?: 'default' | 'onYellow'; // 노란 바탕 카드 위에서는 흰 버튼
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [justDone, setJustDone] = useState(false);

  function open() {
    setError('');
    setJustDone(false);
    try {
      setName((n) => n || localStorage.getItem(NAME_KEY) || '');
    } catch {
      /* 저장소를 못 쓰면 매번 입력 */
    }
    dialogRef.current?.showModal();
    onChanged(); // 열 때 최신 목록으로
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/course-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: courseKey, name, deviceId: deviceId() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? '올리지 못했어요.');
        return;
      }
      const clean = name.trim().replace(/\s+/g, ' ');
      try {
        localStorage.setItem(NAME_KEY, clean);
      } catch {
        /* ignore */
      }
      setJustDone(true);
      onChanged(clean);
    } catch {
      setError('네트워크 오류로 올리지 못했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    setError('');
    setJustDone(false);
    try {
      const res = await fetch(`/api/course-plans/${id}?device=${encodeURIComponent(deviceId())}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? '취소하지 못했어요.');
        return;
      }
      onChanged();
    } catch {
      setError('네트워크 오류로 취소하지 못했어요.');
    }
  }

  const hasMine = plans.some((p) => p.mine);

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={`inline-flex min-h-[44px] items-center gap-1.5 self-start rounded-full border-2 border-ink px-4 text-[14px] font-black hover:bg-[#e3c900] ${hasMine ? 'bg-ink text-sticker' : tone === 'onYellow' ? 'bg-white hover:bg-white' : 'bg-sticker'}`}
      >
        <span aria-hidden>{hasMine ? '✓' : '✋'}</span> 나는 이 과목 들을 예정이에요 <span className="font-latin">{plans.length}</span>
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
        className="m-auto max-h-[92vh] w-[min(94vw,440px)] overflow-y-auto rounded-[14px] border-2 border-ink bg-lime p-0 backdrop:bg-ink/55"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-black text-seal">✋ 수강 예정</p>
              <h2 className="text-[20px] font-black leading-tight">{title}</h2>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hoegilab/course-nup-1.webp" alt="" aria-hidden draggable={false} className="-mb-1 h-[86px] w-auto shrink-0 select-none" />
            <button type="button" onClick={() => dialogRef.current?.close()} aria-label="닫기" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[22px]">
              ×
            </button>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
            <label htmlFor={`plan-name-${courseKey}`} className="text-[14px] font-bold">
              내 이름
            </label>
            <div className="flex gap-2">
              <input
                id={`plan-name-${courseKey}`}
                value={name}
                maxLength={PLAN_NAME_LIMIT}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                  setJustDone(false);
                }}
                placeholder="이름 또는 별명"
                className={fieldClass}
              />
              <button type="submit" disabled={busy || !name.trim()} className={`${yellowButtonClass} !w-auto shrink-0 px-4`}>
                {busy ? '…' : '들을게요'}
              </button>
            </div>
            <p className="text-[12px] leading-snug text-inkMuted">전광판에서 친구들이 보는 이름이에요. 다른 과목에도 같은 이름으로 올려야 한 사람으로 묶여요.</p>
            {error && (
              <p role="alert" className="text-[14px] text-seal">
                {error}
              </p>
            )}
            {justDone && (
              <div className="flex items-center gap-3 [animation:pop-in_0.4s_ease-out_both]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/hoegilab/course-nup-9.webp" alt="" aria-hidden draggable={false} className="h-[84px] w-auto shrink-0 select-none" />
                <p className="text-[14px] font-bold">올렸어요! 같이 듣는 친구를 확인해 보세요.</p>
              </div>
            )}
          </form>

          <div>
            <h3 className="mb-2 text-[15px] font-black">
              이 과목 들을 예정 <span className="font-latin">{plans.length}</span>명
            </h3>
            {plans.length === 0 ? (
              <p className="rounded-[10px] border-2 border-dashed border-ink/40 py-5 text-center text-[14px] text-inkMuted">아직 아무도 없어요. 첫 번째로 올려 보세요!</p>
            ) : (
              <ul className="grid grid-cols-2 gap-2">
                {plans.map((p) => (
                  <li key={p.id} className="relative overflow-hidden rounded-[8px] border-2 border-ink bg-[#FBF7EC]">
                    <p className="bg-cube px-2 py-[1px] text-[10px] font-black text-white">수강 예정</p>
                    <p className="truncate px-2 py-1.5 text-center text-[16px] font-bold">{p.name}</p>
                    {(p.mine || isAdmin) && (
                      <button type="button" onClick={() => cancel(p.id)} aria-label={`${p.name} 취소`} className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center text-[14px] font-black text-seal">
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {plans.some((p) => p.mine) && <p className="mt-2 text-[12px] text-inkMuted">✕를 누르면 내가 올린 이름을 취소할 수 있어요.</p>}
          </div>
        </div>
      </dialog>
    </>
  );
}
