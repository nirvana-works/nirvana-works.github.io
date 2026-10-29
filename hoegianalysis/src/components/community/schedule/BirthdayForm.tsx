'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deviceId } from '@/lib/deviceId';
import { fieldClass, stickerButtonClass } from '../formStyles';

const NAME_LIMIT = 12;
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// 멤버 생일 추가: 해마다 반복되니 월·일만 받는다
export function BirthdayForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [error, setError] = useState('');
  const [added, setAdded] = useState('');
  const [loading, setLoading] = useState(false);

  const dayCount = month ? DAYS_IN_MONTH[Number(month) - 1] : 31;

  function clearMessages() {
    setError('');
    setAdded('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('이름(별명)을 입력하세요.');
    if (!month || !day) return setError('생일 월과 날짜를 골라 주세요.');

    setLoading(true);
    try {
      const res = await fetch('/api/birthdays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, month: Number(month), day: Number(day), deviceId: deviceId() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? '생일을 추가하지 못했어요.');
        return;
      }
      setAdded(`${month}월 ${day}일 '${name.trim()}' 생일을 달력에 올렸어요.`);
      setName('');
      setMonth('');
      setDay('');
      router.refresh();
    } catch {
      setError('네트워크 오류로 추가하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="bd-name" className="text-[14px] font-bold">
            이름(별명)
          </label>
          <span className="text-[12px] text-inkMuted">
            {[...name].length}/{NAME_LIMIT}
          </span>
        </div>
        <input
          id="bd-name"
          value={name}
          maxLength={NAME_LIMIT}
          onChange={(e) => {
            setName(e.target.value);
            clearMessages();
          }}
          placeholder="넙죽이"
          className={fieldClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bd-month" className="text-[14px] font-bold">
            월
          </label>
          <select
            id="bd-month"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              if (day && Number(day) > DAYS_IN_MONTH[Number(e.target.value) - 1]) setDay('');
              clearMessages();
            }}
            className={fieldClass}
          >
            <option value="">선택</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}월
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bd-day" className="text-[14px] font-bold">
            일
          </label>
          <select
            id="bd-day"
            value={day}
            onChange={(e) => {
              setDay(e.target.value);
              clearMessages();
            }}
            className={fieldClass}
          >
            <option value="">선택</option>
            {Array.from({ length: dayCount }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}일
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="-mt-1 text-[12px] text-inkMuted">태어난 해는 받지 않아요. 해마다 그날 달력에 🎂로 표시됩니다.</p>

      {error && <p className="text-[14px] text-seal">{error}</p>}
      {added && (
        <p role="status" className="rounded-[8px] bg-sticker px-4 py-3 text-[14px] font-bold">
          {added}
        </p>
      )}
      <div className="flex justify-end">
        <button type="submit" disabled={loading} className={stickerButtonClass}>
          {loading ? '추가하는 중…' : '생일 추가'}
        </button>
      </div>
    </form>
  );
}
