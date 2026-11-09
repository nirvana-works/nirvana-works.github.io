'use client';

import { useState } from 'react';
import { BirthdayForm } from './BirthdayForm';
import { EventForm } from './EventForm';

const TABS = [
  { key: 'event', label: '일정' },
  { key: 'birthday', label: '🎂 멤버 생일' },
] as const;

// 일정 추가 / 생일 추가를 탭으로 오간다
export function AddPanel({ initialTab = 'event' }: { initialTab?: (typeof TABS)[number]['key'] }) {
  const [tab, setTab] = useState(initialTab);

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="추가할 항목" className="grid grid-cols-2 rounded-[10px] border-2 border-ink p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`h-10 rounded-[7px] text-[15px] font-bold ${tab === t.key ? 'bg-ink text-white' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{tab === 'event' ? <EventForm /> : <BirthdayForm />}</div>
    </div>
  );
}
