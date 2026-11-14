'use client';

import { useMemo, useState } from 'react';
import { COURSES, type Course } from '@/lib/courses/winter2026';
import { courseKey } from '@/lib/courses/courseKey';
import type { CoursePlan } from '@/lib/coursePlanTypes';

const AMBER = '#FFC83D';
const glow = { textShadow: '0 0 8px rgba(255,200,61,0.5)' } as const;
const courseByKey = new Map<string, Course>(COURSES.map((c) => [courseKey(c), c]));
const label = (c: Course) => (c.sub ? `${c.name} · ${c.sub}` : c.name);

type Tab = 'course' | 'people';

function Tag({ on, children, onClick }: { on?: boolean; children: React.ReactNode; onClick?: () => void }) {
  const cls = `rounded-[4px] border px-2 py-0.5 text-[13px] font-bold leading-tight ${on ? 'border-transparent bg-[#FFC83D] text-black' : 'border-[#FFC83D]/45 text-[#FFC83D]'}`;
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={on} className={`${cls} min-h-[32px]`}>
      {children}
    </button>
  ) : (
    <span className={cls}>{children}</span>
  );
}

// 수강 예정 전광판: 과목별로 누가 듣는지, 사람별로 누가 나와 같은 수업을 듣는지
export function FriendsBoard({ plans, me, onMe }: { plans: CoursePlan[]; me: string; onMe: (name: string) => void }) {
  const [tab, setTab] = useState<Tab>('course');
  const [q, setQ] = useState('');

  const { byCourse, people } = useMemo(() => {
    const byCourse = new Map<string, string[]>();
    const people = new Map<string, { name: string; keys: string[] }>();
    for (const p of plans) {
      if (!courseByKey.has(p.key)) continue;
      const names = byCourse.get(p.key) ?? [];
      names.push(p.name);
      byCourse.set(p.key, names);
      const id = p.name.toLowerCase();
      const person = people.get(id) ?? { name: p.name, keys: [] };
      person.keys.push(p.key);
      people.set(id, person);
    }
    return { byCourse, people };
  }, [plans]);

  const meId = me.trim().toLowerCase();
  const mine = people.get(meId);
  const rows = COURSES.map((c) => ({ c, key: courseKey(c), names: byCourse.get(courseKey(c)) ?? [] }))
    .filter((r) => r.names.length > 0)
    .sort((a, b) => b.names.length - a.names.length);
  const sortedPeople = Array.from(people.values())
    .filter((p) => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => b.keys.length - a.keys.length || a.name.localeCompare(b.name, 'ko'));

  return (
    <section
      aria-label="수강 예정 전광판"
      className="rounded-[14px] border-2 border-ink bg-[#0d0d0d] p-4 text-[#FFC83D] shadow-[0_4px_0_#000]"
      style={{ backgroundImage: 'radial-gradient(rgba(255,200,61,0.10) 1px, transparent 1px)', backgroundSize: '6px 6px' }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#FFC83D]/30 pb-3">
        <div>
          <p className="flex items-center gap-1.5 font-latin text-[11px] font-semibold tracking-[0.25em]">
            <span aria-hidden className="h-2 w-2 rounded-full bg-[#ff4d3d] [animation:cursor-blink_1.2s_steps(1)_infinite]" />
            ENROLLMENT BOARD
          </p>
          <h2 className="mt-1 text-[22px] font-black leading-tight" style={glow}>
            수강 예정 전광판
          </h2>
        </div>
        <p className="shrink-0 text-right font-latin text-[12px] font-semibold leading-tight opacity-80">
          <span className="text-[20px] font-black">{people.size}</span>명
          <br />
          <span className="text-[20px] font-black">{byCourse.size}</span>과목
        </p>
      </div>

      <div role="tablist" aria-label="보기 방식" className="mt-3 flex gap-2">
        {(
          [
            ['course', '과목별'],
            ['people', '사람별 · 같이 듣는 친구'],
          ] as const
        ).map(([t, text]) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-h-[40px] rounded-full border px-3.5 text-[13px] font-black ${tab === t ? 'border-transparent bg-[#FFC83D] text-black' : 'border-[#FFC83D]/50'}`}
          >
            {text}
          </button>
        ))}
      </div>

      {plans.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-5 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hoegilab/course-nup-7.webp" alt="" aria-hidden draggable={false} className="h-[170px] w-auto rounded-[10px] border-2 border-[#FFC83D]/40" />
          <p className="text-[14px] opacity-80">아직 올린 사람이 없어요. 과목 카드에서 &lsquo;나는 이 과목 들을 예정이에요&rsquo;를 눌러 첫 번째가 되어 보세요.</p>
        </div>
      ) : tab === 'course' ? (
        <ul className="mt-2">
          {rows.map(({ c, key, names }) => {
            const takes = !!mine?.keys.includes(key);
            return (
              <li key={key} className="border-t border-dashed border-[#FFC83D]/25 py-3 first:border-t-0">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 text-[16px] font-black leading-snug" style={glow}>
                    {takes && <span aria-label="내가 듣는 과목">★ </span>}
                    {label(c)}
                  </span>
                  <span className="shrink-0 font-latin text-[13px] font-semibold">{names.length}명</span>
                </p>
                <p className="mb-1.5 text-[12px] opacity-70">{c.professor} 교수 · {c.days.length ? c.days.join('·') : '일정 별도'}</p>
                <div className="flex flex-wrap gap-1.5">
                  {names.map((n, i) => (
                    <Tag key={`${n}${i}`} on={n.toLowerCase() === meId}>
                      {n}
                    </Tag>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <div>
            <div className="mb-1.5 flex items-end justify-between gap-3">
              <label htmlFor="friends-q" className="block text-[13px] font-black">
                내 이름을 골라 보세요
              </label>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hoegilab/course-nup-5.webp" alt="" aria-hidden draggable={false} className="-mt-3 h-[72px] w-auto select-none" />
            </div>
            <input
              id="friends-q"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="이름 검색"
              className="h-11 w-full rounded-[8px] border border-[#FFC83D]/60 bg-black px-3 text-[16px] text-[#FFC83D] placeholder:text-[#FFC83D]/40 focus:border-[#FFC83D] focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {sortedPeople.map((p) => (
                <Tag key={p.name} on={p.name.toLowerCase() === meId} onClick={() => onMe(p.name.toLowerCase() === meId ? '' : p.name)}>
                  {p.name} <span className="font-latin text-[11px] opacity-70">{p.keys.length}</span>
                </Tag>
              ))}
              {sortedPeople.length === 0 && <p className="text-[13px] opacity-70">찾는 이름이 없어요.</p>}
            </div>
          </div>

          {mine ? (
            <div className="rounded-[10px] border border-[#FFC83D]/45 p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[16px] font-black" style={glow}>
                  {mine.name}님이 듣는 과목 {mine.keys.length}개
                </p>
                {mine.keys.some((k) => (byCourse.get(k) ?? []).some((n) => n.toLowerCase() !== meId)) && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src="/hoegilab/course-nup-6.webp" alt="같이 듣는 친구와 하이파이브" draggable={false} className="h-[64px] w-auto shrink-0 rounded-[8px] border border-[#FFC83D]/50" />
                )}
              </div>
              <ul className="mt-2">
                {mine.keys.map((k) => {
                  const c = courseByKey.get(k)!;
                  const others = (byCourse.get(k) ?? []).filter((n) => n.toLowerCase() !== meId);
                  return (
                    <li key={k} className="border-t border-dashed border-[#FFC83D]/25 py-2.5 first:border-t-0">
                      <p className="text-[15px] font-black leading-snug">{label(c)}</p>
                      {others.length ? (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-[12px] opacity-75">같이 듣는 친구 {others.length}명</span>
                          {others.map((n, i) => (
                            <Tag key={`${n}${i}`}>{n}</Tag>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-[12px] opacity-70">아직 같이 듣는 친구가 없어요.</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="text-[13px] opacity-75">위에서 이름을 누르면, 그 사람과 같은 수업을 듣는 친구를 과목별로 보여 줘요.</p>
          )}
        </div>
      )}
    </section>
  );
}
