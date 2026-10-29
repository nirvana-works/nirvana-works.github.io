'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { todayLocal } from '@/lib/date';
import { BIRTHDAY_STYLE, HOEGI, categoryOf } from '@/lib/eventCategories';
import type { SchoolEvent } from '@/lib/schoolEvents';
import { EventList, shortDate } from './EventList';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function MonthCalendar({ month, events }: { month: string; events: SchoolEvent[] }) {
  const [y, m] = month.split('-').map(Number);
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const dayCount = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const dates = Array.from({ length: dayCount }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);

  // 오늘 표시는 보는 사람 기기 시간 기준 (서버 렌더와 어긋나지 않게 마운트 후 계산)
  const [today, setToday] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => setToday(todayLocal()), []);
  useEffect(() => setSelected(null), [month]);

  const eventsOn = (date: string) => events.filter((e) => e.start_date <= date && e.end_date >= date);
  const shown = selected ? eventsOn(selected) : events;

  return (
    <div className="flex flex-col gap-6">
      <section aria-label={`${y}년 ${m}월 달력`}>
        <div className="flex items-center justify-between">
          <Link
            href={`/schedule?month=${shiftMonth(month, -1)}`}
            scroll={false}
            aria-label="이전 달"
            className="grid h-11 w-11 place-items-center rounded-full border-2 border-ink text-[20px]"
          >
            ‹
          </Link>
          <h2 className="text-[20px] font-black">
            {y}년 {m}월
          </h2>
          <Link
            href={`/schedule?month=${shiftMonth(month, 1)}`}
            scroll={false}
            aria-label="다음 달"
            className="grid h-11 w-11 place-items-center rounded-full border-2 border-ink text-[20px]"
          >
            ›
          </Link>
        </div>

        <div className="mt-2 grid grid-cols-7 border-b-2 border-ink text-center text-[12px] font-bold text-inkMuted">
          {WEEKDAYS.map((w, i) => (
            <span key={w} className={`py-1.5 ${i === 0 ? 'text-seal' : ''}`}>
              {w}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({ length: firstWeekday }, (_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {dates.map((date, i) => {
            const dayEvents = eventsOn(date);
            const hoegi = dayEvents.filter((ev) => ev.category === HOEGI);
            const birthdays = dayEvents.filter((ev) => ev.category === BIRTHDAY_STYLE.key);
            const others = dayEvents.filter((ev) => ev.category !== HOEGI && ev.category !== BIRTHDAY_STYLE.key);
            const isSelected = selected === date;
            const isToday = today === date;
            const isSunday = (firstWeekday + i) % 7 === 0;
            const label = [
              `${m}월 ${i + 1}일`,
              hoegi.length ? `회기분석 ${hoegi.map((ev) => ev.title).join(', ')}` : '',
              birthdays.length ? birthdays.map((ev) => ev.title).join(', ') : '',
              others.length ? `일정 ${others.length}개` : '',
              isToday ? '오늘' : '',
            ]
              .filter(Boolean)
              .join(', ');
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelected(isSelected ? null : date)}
                aria-pressed={isSelected}
                aria-label={label}
                className="flex h-[74px] min-w-0 flex-col items-center justify-start gap-[3px] pt-1"
              >
                {hoegi.length > 0 ? (
                  // 회기분석 날은 날짜가 빨간 별 안에 들어간다 (고른 날은 파란 별)
                  <span className="relative grid h-[36px] w-[36px] place-items-center">
                    <svg aria-hidden viewBox="0 0 24 24" className="absolute inset-0 h-full w-full">
                      <path
                        d="M12 1.6l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.7l-6.4 3.5 1.4-7.1-5.3-5 7.2-.9z"
                        fill={isSelected ? '#2B50E6' : '#C8322B'}
                        stroke={isToday ? '#F2D80E' : 'none'}
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="relative mt-[3px] font-latin text-[12px] font-semibold text-white">{i + 1}</span>
                  </span>
                ) : (
                  <span
                    className={`grid h-[32px] w-[32px] place-items-center rounded-[8px] font-latin text-[14px] font-medium ${
                      isSelected ? 'bg-cube text-white' : isToday ? 'bg-sticker' : isSunday ? 'text-seal' : ''
                    }`}
                  >
                    {i + 1}
                  </span>
                )}
                {hoegi.length > 0 && (
                  <span aria-hidden className="whitespace-nowrap text-[10px] font-black leading-none tracking-[-0.04em] text-seal">
                    회기분석
                  </span>
                )}
                {/* 생일은 날짜 아래에 이름을 바로 적는다 (여러 명이면 첫 사람 + 인원) */}
                {birthdays.length > 0 && (
                  <span
                    aria-hidden
                    className="block max-w-full truncate px-0.5 text-[10px] font-bold leading-none"
                    style={{ color: BIRTHDAY_STYLE.text }}
                  >
                    🎂{birthdays[0].title.replace(/ 생일$/, '')}
                    {birthdays.length > 1 ? ` +${birthdays.length - 1}` : ''}
                  </span>
                )}
                {/* 다른 일정은 분류 색 점 (최대 3개) */}
                {others.length > 0 && (
                  <span aria-hidden className="flex h-[6px] items-center gap-[3px]">
                    {others.slice(0, 3).map((ev) => (
                      <span
                        key={ev.id}
                        className="h-[6px] w-[6px] rounded-full"
                        style={{ background: categoryOf(ev.category)?.dot ?? '#2B50E6' }}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-live="polite">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-[18px] font-black">{selected ? `${shortDate(selected)} 일정` : '이달의 일정'}</h3>
          {selected && (
            <button type="button" onClick={() => setSelected(null)} className="min-h-[44px] text-[13px] font-bold underline underline-offset-4">
              이달 전체 보기
            </button>
          )}
        </div>
        {shown.length > 0 ? (
          <EventList events={shown} />
        ) : (
          <p className="border-y-2 border-ink py-6 text-center text-[14px] text-inkMuted">
            {selected ? '이날은 학교 행사가 없어요.' : '이달에 등록된 학교 행사가 없어요.'}
          </p>
        )}
      </section>
    </div>
  );
}
