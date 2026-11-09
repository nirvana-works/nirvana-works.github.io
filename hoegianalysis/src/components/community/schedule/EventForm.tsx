'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deviceId } from '@/lib/deviceId';
import { EVENT_CATEGORIES, HOEGI } from '@/lib/eventCategories';
import { fieldClass, stickerButtonClass } from '../formStyles';
import { shortDate } from './EventList';

// 모임 장소는 대부분 학교라 기본값으로 채워 둔다
const INITIAL = { title: '', start_date: '', end_date: '', place: 'KAIST 경영대학', memo: '', category: '' };
const LIMITS = { title: 40, place: 40, memo: 200 };

export function EventForm() {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL);
  const [error, setError] = useState('');
  const [added, setAdded] = useState('');
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof INITIAL>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setError('');
    setAdded('');
  }

  const isHoegi = form.category === HOEGI;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return setError('행사 이름을 입력하세요.');
    if (!form.start_date) return setError('시작 날짜를 골라 주세요.');
    if (form.end_date && form.end_date < form.start_date) return setError('끝나는 날짜가 시작 날짜보다 빨라요.');

    setLoading(true);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, deviceId: deviceId() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? '일정을 추가하지 못했어요.');
        return;
      }
      setAdded(`${shortDate(form.start_date)} '${form.title.trim()}' 일정을 추가했어요.`);
      setForm(INITIAL);
      router.refresh();
    } catch {
      setError('네트워크 오류로 추가하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[14px] font-bold">
          분류<span className="ml-1.5 text-[12px] font-normal text-inkMuted">선택</span>
        </legend>
        {/* 가장 중요한 회기분석은 맨 앞에 크게 */}
        <button
          type="button"
          aria-pressed={isHoegi}
          onClick={() => set('category', isHoegi ? '' : HOEGI)}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border-2 border-seal text-[17px] font-black ${
            isHoegi ? 'bg-seal text-white' : 'bg-white text-seal'
          }`}
        >
          <span aria-hidden>★</span>회기분석 수업
        </button>
        <div className="flex flex-wrap gap-2">
          {EVENT_CATEGORIES.filter((c) => c.key !== HOEGI).map((c) => {
            const on = form.category === c.key;
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={on}
                onClick={() => set('category', on ? '' : c.key)}
                className="h-10 rounded-[8px] border-2 px-3.5 text-[14px] font-bold"
                style={{ background: c.bg, color: c.text, borderColor: on ? '#000' : 'transparent' }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </fieldset>
      <Field label="행사 이름" htmlFor="ev-title" count={`${form.title.length}/${LIMITS.title}`}>
        <input
          id="ev-title"
          value={form.title}
          maxLength={LIMITS.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder={isHoegi ? '가게 이름 (소랑도)' : '경영경제 간담회'}
          className={fieldClass}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="시작 날짜" htmlFor="ev-start">
          <input
            id="ev-start"
            type="date"
            value={form.start_date}
            onChange={(e) => set('start_date', e.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="끝나는 날짜" htmlFor="ev-end" hint="선택">
          <input
            id="ev-end"
            type="date"
            value={form.end_date}
            min={form.start_date || undefined}
            onChange={(e) => set('end_date', e.target.value)}
            className={fieldClass}
          />
        </Field>
        <p className="col-span-2 -mt-1 text-[12px] text-inkMuted">하루짜리 행사는 끝나는 날짜를 비워 두세요.</p>
      </div>
      <Field label="장소" htmlFor="ev-place" hint="선택">
        <input
          id="ev-place"
          value={form.place}
          maxLength={LIMITS.place}
          onChange={(e) => set('place', e.target.value)}
          placeholder="KAIST 경영대학"
          className={fieldClass}
        />
      </Field>
      <Field label="메모" htmlFor="ev-memo" hint="선택" count={`${form.memo.length}/${LIMITS.memo}`}>
        <textarea
          id="ev-memo"
          value={form.memo}
          maxLength={LIMITS.memo}
          rows={3}
          onChange={(e) => set('memo', e.target.value)}
          className={`${fieldClass} h-auto py-2.5 leading-relaxed`}
        />
      </Field>

      {error && <p className="text-[14px] text-seal">{error}</p>}
      {added && (
        <p role="status" className="rounded-[8px] bg-sticker px-4 py-3 text-[14px] font-bold">
          {added}
        </p>
      )}
      <div className="flex justify-end">
        <button type="submit" disabled={loading} className={stickerButtonClass}>
          {loading ? '추가하는 중…' : '일정 추가'}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  count,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  count?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[14px] font-bold">
          {label}
          {hint && <span className="ml-1.5 text-[12px] font-normal text-inkMuted">{hint}</span>}
        </label>
        {count && <span className="text-[12px] text-inkMuted">{count}</span>}
      </div>
      {children}
    </div>
  );
}
