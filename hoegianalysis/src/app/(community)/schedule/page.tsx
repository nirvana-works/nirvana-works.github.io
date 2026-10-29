import Link from 'next/link';
import { FaceHeader } from '@/components/community/FaceHeader';
import { stickerButtonClass } from '@/components/community/formStyles';
import { MonthCalendar } from '@/components/community/schedule/MonthCalendar';
import { birthdaysAsEvents, listBirthdays } from '@/lib/birthdays';
import { BIRTHDAY_STYLE, EVENT_CATEGORIES, HOEGI } from '@/lib/eventCategories';
import { daysInMonth, isValidMonth, listEventsBetween, todayKST } from '@/lib/schoolEvents';

export const metadata = { title: '학교 일정' };
export const dynamic = 'force-dynamic';

export default async function SchedulePage({ searchParams }: { searchParams: { month?: string } }) {
  const month = isValidMonth(searchParams.month) ? searchParams.month : todayKST().slice(0, 7);
  const [year, monthNumber] = month.split('-').map(Number);
  const [schoolEvents, birthdays] = await Promise.all([
    listEventsBetween(`${month}-01`, `${month}-${daysInMonth(month)}`),
    listBirthdays(monthNumber),
  ]);
  // 생일은 해마다 반복되니 보고 있는 해의 날짜로 얹는다. 같은 날이면 회기분석 → 생일 → 나머지 순
  const rank = (c: string | null) => (c === HOEGI ? 0 : c === BIRTHDAY_STYLE.key ? 1 : 2);
  const events = [...schoolEvents, ...birthdaysAsEvents(birthdays, year)].sort(
    (a, b) => a.start_date.localeCompare(b.start_date) || rank(a.category) - rank(b.category),
  );

  return (
    <div className="flex flex-col gap-6">
      <FaceHeader href="/schedule" />

      {/* 캘린더 포스터 머리: 분류 범례 + 확성기 든 넙죽이 */}
      <div className="flex items-end justify-between gap-3">
        <ul aria-label="분류" className="flex flex-wrap gap-x-3 gap-y-2 pb-1">
          {EVENT_CATEGORIES.map((c) => (
            <li key={c.key} className={`flex items-center gap-1.5 text-[13px] font-bold ${c.key === HOEGI ? 'text-seal' : ''}`}>
              {c.key === HOEGI ? (
                <span aria-hidden className="text-[15px] leading-none">★</span>
              ) : (
                <span aria-hidden className="h-3.5 w-5 rounded-[4px]" style={{ background: c.dot }} />
              )}
              {c.label}
            </li>
          ))}
          <li className="flex items-center gap-1.5 text-[13px] font-bold">
            <span aria-hidden className="text-[13px] leading-none">🎂</span>
            {BIRTHDAY_STYLE.label}
          </li>
        </ul>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hoegilab/nupjuk-megaphone.webp"
          alt="확성기와 일정표를 든 넙죽이"
          width={130}
          height={100}
          className="-mb-2 shrink-0 select-none"
        />
      </div>

      <MonthCalendar month={month} events={events} />

      <div className="flex justify-end">
        <Link href="/schedule/manage" className={stickerButtonClass}>
          <span aria-hidden>+</span>
          일정·생일 추가하기
        </Link>
      </div>
    </div>
  );
}
