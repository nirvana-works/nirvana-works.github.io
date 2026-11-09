import { categoryOf } from '@/lib/eventCategories';
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
    <ul className="divide-y divide-ink/15 border-y-2 border-ink">
      {events.map((e) => (
        <li key={e.id} className="flex items-start gap-3 py-3">
          <span className="w-[76px] shrink-0 pt-0.5 font-latin text-[13px] font-semibold leading-[1.45]">{dateRange(e)}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-bold leading-snug">
              <CategoryBadge category={e.category} />
              {e.title}
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
  // 생일은 제목에 이미 '생일'이 있어 케이크만
  if (c.key === 'birthday') return <span aria-hidden className="mr-1">🎂</span>;
  return (
    <span
      className="mr-1.5 inline-block rounded-[5px] px-1.5 py-[1px] align-[2px] text-[12px] font-bold"
      style={{ background: c.bg, color: c.text }}
    >
      {c.key === 'hoegi' && <span aria-hidden>★ </span>}
      {c.label}
    </span>
  );
}
