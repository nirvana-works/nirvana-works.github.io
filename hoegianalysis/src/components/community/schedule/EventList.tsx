import { categoryOf } from '@/lib/eventCategories';
import { CategorySticker, hasSticker } from './CategorySticker';
import type { SchoolEvent } from '@/lib/schoolEvents';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// "10/24(금)" 형식
export function shortDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}/${d}(${weekday})`;
}

export function dateRange(e: Pick<SchoolEvent, 'start_date' | 'end_date'>): string {
  return e.start_date === e.end_date ? shortDate(e.start_date) : `${shortDate(e.start_date)} ~ ${shortDate(e.end_date)}`;
}

// 일정 목록 한 줄씩. action 자리에 관리 화면의 삭제 버튼 등을 넣는다
export function EventList({
  events,
  action,
}: {
  events: SchoolEvent[];
  action?: (e: SchoolEvent) => React.ReactNode;
}) {
  return (
    <ul className="flex flex-col gap-2.5">
      {events.map((e) => (
        <li
          key={e.id}
          className="flex items-start gap-3 rounded-[10px] border-2 border-ink bg-[#FBF7EC] px-3 py-2.5 shadow-[2px_2px_0_rgba(20,33,61,0.18)]"
        >
          <span className="w-[76px] shrink-0 pt-0.5 font-latin text-[13px] font-semibold leading-[1.45]">{dateRange(e)}</span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center text-[16px] font-bold leading-snug">
              <CategoryBadge category={e.category} />
              <span className="min-w-0">{e.title}</span>
            </span>
            {e.place && <span className="mt-0.5 block text-[14px] text-inkMuted">{e.place}</span>}
            {e.memo && (
              <span className="mt-1 block whitespace-pre-line text-[14px] leading-relaxed text-inkMuted">{e.memo}</span>
            )}
          </span>
          {action?.(e)}
        </li>
      ))}
    </ul>
  );
}

// 캘린더 범례 색 그대로의 작은 분류 표시
export function CategoryBadge({ category }: { category: string | null }) {
  const c = categoryOf(category);
  if (!c) return null;
  if (hasSticker(c.key)) return (
      <span className="mr-1 inline-flex w-[58px] shrink-0 justify-center -my-1">
        <CategorySticker k={c.key} label={c.label} scale={0.8} />
      </span>
    );
  return null;
}
