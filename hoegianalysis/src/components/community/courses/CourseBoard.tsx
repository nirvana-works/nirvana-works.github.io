'use client';

import { useEffect, useMemo, useState } from 'react';
import { COURSES, type Course, type Day, type FieldKey } from '@/lib/courses/winter2026';
import { courseKey } from '@/lib/courses/courseKey';
import { deviceId } from '@/lib/deviceId';
import type { CoursePlan } from '@/lib/coursePlanTypes';
import { fieldClass } from '../formStyles';
import { CourseComments } from './CourseComments';
import { CoursePlans } from './CoursePlans';
import { FriendsBoard } from './FriendsBoard';

const DAYS: Day[] = ['월', '화', '수', '목', '금', '토'];

// 분야: 이름과 색 (포스터 색: 큐브 파랑 / 스티커 노랑 / 도장 빨강 / 초록)
const FIELDS: { key: FieldKey; label: string; bg: string; fg: string }[] = [
  { key: '금융', label: '금융', bg: '#2B50E6', fg: '#fff' },
  { key: 'IT경영', label: 'IT경영', bg: '#F2D80E', fg: '#000' },
  { key: '기술/조직/전략', label: '기술·조직·전략', bg: '#c8322b', fg: '#fff' },
  { key: '기타(연수/연구)', label: '기타(연수·연구)', bg: '#1f9d6b', fg: '#fff' },
];
const fieldOf = (k: FieldKey) => FIELDS.find((f) => f.key === k)!;

const NO_TARGET = '__none__';

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`min-h-[40px] rounded-full border-2 border-ink px-3.5 py-1 text-[14px] font-bold leading-tight transition-colors ${on ? 'bg-ink text-white' : 'bg-white hover:bg-sticker'}`}
    >
      {children}
    </button>
  );
}

// 큐브 스티커처럼 월~토를 여섯 칸으로: 수업 있는 날만 파랗게
function WeekStrip({ days }: { days: Day[] }) {
  return (
    <div className="flex shrink-0 gap-[3px]" role="img" aria-label={days.length ? `수업 요일 ${days.join(', ')}` : '수업 요일 없음'}>
      {DAYS.map((d) => {
        const on = days.includes(d);
        return (
          <span
            key={d}
            aria-hidden
            className={`grid h-7 w-7 place-items-center rounded-[6px] border-2 text-[12px] font-black ${on ? 'border-ink bg-cube text-white' : 'border-ink/20 text-ink/30'}`}
          >
            {d}
          </span>
        );
      })}
    </div>
  );
}

function CourseCard({ c, count, isAdmin, onCount, plans, onPlansChanged }: { c: Course; count: number; isAdmin: boolean; onCount: (n: number) => void; plans: CoursePlan[]; onPlansChanged: (name?: string) => void }) {
  const f = fieldOf(c.field);
  return (
    <li className="flex flex-col gap-3 rounded-[14px] border-2 border-ink bg-white p-4 shadow-[0_4px_0_#000]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full border-2 border-ink px-2.5 py-0.5 text-[12px] font-black" style={{ backgroundColor: f.bg, color: f.fg }}>
            {f.label}
          </span>
          <span className="rounded-full border-2 border-ink bg-white px-2.5 py-0.5 text-[12px] font-black">
            <span className="font-latin">{c.credits}</span>학점
          </span>
        </div>
        {c.target && <span className="rounded-[6px] border-2 border-ink bg-[#FFF1A8] px-2 py-0.5 font-latin text-[12px] font-semibold">{c.target}</span>}
      </div>

      <div>
        <h3 className="text-[22px] font-black leading-tight">{c.name}</h3>
        {c.sub && <p className="mt-0.5 font-latin text-[14px] font-semibold leading-snug text-cube">{c.sub}</p>}
        <p className="mt-1.5 text-[14px] text-inkMuted">
          <span className="font-black text-ink">{c.professor}</span> 교수
        </p>
      </div>

      {c.days.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <WeekStrip days={c.days} />
          <ul className="font-latin text-[13px] font-semibold leading-snug">
            {c.time.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[13px] text-inkMuted">정해진 수업 시간이 없는 과목이에요.</p>
      )}

      {c.note && <p className="rounded-[8px] bg-[#FFF8E5] px-3 py-2 text-[13px] leading-snug">{c.note}</p>}
      {c.extra.length > 0 && (
        <ul className="flex flex-col gap-1 text-[13px] leading-snug">
          {c.extra.map((e) => (
            <li key={e} className="flex gap-1.5">
              <span aria-hidden>•</span>
              <span>{e}</span>
            </li>
          ))}
        </ul>
      )}

      {c.dates.length > 0 && (
        <div>
          <p className="mb-1.5 text-[13px] font-black">
            강의 날짜 <span className="font-latin">{c.dates.length}</span>일
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {c.dates.map((d) => (
              <li key={d} className="rounded-[6px] border-2 border-ink px-2 py-0.5 font-latin text-[12px] font-semibold">
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <CoursePlans courseKey={courseKey(c)} title={c.sub ? `${c.name} · ${c.sub}` : c.name} plans={plans} isAdmin={isAdmin} onChanged={onPlansChanged} />
        <CourseComments courseKey={courseKey(c)} title={c.sub ? `${c.name} · ${c.sub}` : c.name} count={count} isAdmin={isAdmin} onCount={onCount} />
      </div>
    </li>
  );
}

// 개설과목 게시판: 분야·수강 대상·요일·교수로 거르고, 과목명이나 교수 이름으로 찾는다
export function CourseBoard({ isAdmin = false }: { isAdmin?: boolean }) {
  const [q, setQ] = useState('');
  const [field, setField] = useState<FieldKey | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [prof, setProf] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [plans, setPlans] = useState<CoursePlan[]>([]);
  const [showBoard, setShowBoard] = useState(false);
  const [me, setMeState] = useState('');

  // 수강 예정 전체 목록 (카드의 버튼과 전광판이 함께 쓴다)
  const loadPlans = async (justAdded?: string) => {
    try {
      const res = await fetch(`/api/course-plans?device=${encodeURIComponent(deviceId())}`, { cache: 'no-store' });
      const d = (await res.json()) as { plans?: CoursePlan[] };
      setPlans(d.plans ?? []);
    } catch {
      /* 못 불러오면 이전 목록 그대로 */
    }
    if (justAdded) setMe(justAdded);
  };
  const setMe = (n: string) => {
    setMeState(n);
    try {
      if (n) localStorage.setItem('hl_plan_name', n);
    } catch {
      /* ignore */
    }
  };
  useEffect(() => {
    void loadPlans();
    try {
      setMeState(localStorage.getItem('hl_plan_name') ?? '');
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 과목별 댓글 개수 (카드의 버튼에 보여 준다)
  useEffect(() => {
    let alive = true;
    fetch('/api/course-comments', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { counts?: Record<string, number> }) => alive && setCounts(d.counts ?? {}))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const targets = useMemo(() => {
    const set = Array.from(new Set(COURSES.map((c) => c.target).filter((t): t is string => !!t)));
    return set;
  }, []);
  const professors = useMemo(() => Array.from(new Set(COURSES.map((c) => c.professor))).sort((a, b) => a.localeCompare(b, 'ko')), []);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return COURSES.filter((c) => {
      if (field && c.field !== field) return false;
      if (target === NO_TARGET ? c.target !== null : target && c.target !== target) return false;
      if (days.length && !days.some((d) => c.days.includes(d))) return false;
      if (prof && c.professor !== prof) return false;
      if (kw && !`${c.name} ${c.sub ?? ''} ${c.professor} ${c.note}`.toLowerCase().includes(kw)) return false;
      return true;
    }).sort((a, b) => Number(b.target === 'PMBA Only') - Number(a.target === 'PMBA Only')); // PMBA Only 과목을 맨 위로 (나머지는 원래 순서)
  }, [q, field, target, days, prof]);

  const active = !!(q || field || target || days.length || prof);
  const reset = () => {
    setQ('');
    setField(null);
    setTarget(null);
    setDays([]);
    setProf('');
  };
  const count = (pred: (c: Course) => boolean) => COURSES.filter(pred).length;
  const toggleDay = (d: Day) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setShowBoard((v) => !v)}
          aria-expanded={showBoard}
          className="flex min-h-[56px] items-center justify-between gap-3 rounded-[14px] border-2 border-ink bg-ink px-4 text-left text-[16px] font-black text-[#FFC83D] shadow-[0_4px_0_#000] active:translate-y-[2px] active:shadow-[0_2px_0_#000]"
        >
          <span className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hoegilab/course-nup-4.webp" alt="" aria-hidden draggable={false} className="h-11 w-11 shrink-0 rounded-full border-2 border-[#FFC83D] bg-white object-cover object-[45%_28%]" />
            친구들은 어떤 과목 듣지?
          </span>
          <span className="shrink-0 font-latin text-[13px] font-semibold opacity-80">{showBoard ? '닫기 ▲' : `${new Set(plans.map((p) => p.name.toLowerCase())).size}명 참여 ▼`}</span>
        </button>
        {showBoard && <FriendsBoard plans={plans} me={me} onMe={setMe} />}
      </div>

      <section aria-label="과목 거르기" className="flex flex-col gap-4 rounded-[14px] border-2 border-ink bg-white p-4 shadow-[0_4px_0_#000]">
        <div className="-mb-1 flex items-end justify-between">
          <p className="text-[15px] font-black">과목 거르기</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hoegilab/course-nup-3.webp" alt="" aria-hidden draggable={false} className="-mt-2 h-[76px] w-auto select-none" />
        </div>
        <div>
          <label htmlFor="course-q" className="sr-only">
            과목명 또는 교수 검색
          </label>
          <input id="course-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="과목명이나 교수 이름으로 찾기" className={fieldClass} />
        </div>

        <div role="group" aria-label="분야">
          <p className="mb-1.5 text-[13px] font-black">분야</p>
          <div className="flex flex-wrap gap-2">
            <Chip on={!field} onClick={() => setField(null)}>
              전체
            </Chip>
            {FIELDS.map((f) => (
              <Chip key={f.key} on={field === f.key} onClick={() => setField(field === f.key ? null : f.key)}>
                {f.label} <span className="font-latin text-[12px] opacity-70">{count((c) => c.field === f.key)}</span>
              </Chip>
            ))}
          </div>
        </div>

        <div role="group" aria-label="수강 대상">
          <p className="mb-1.5 text-[13px] font-black">수강 대상 <span className="font-normal text-inkMuted">(등록 첫날 기준)</span></p>
          <div className="flex flex-wrap gap-2">
            <Chip on={!target} onClick={() => setTarget(null)}>
              전체
            </Chip>
            {targets.map((t) => (
              <Chip key={t} on={target === t} onClick={() => setTarget(target === t ? null : t)}>
                <span className="font-latin">{t.replace(' Only', '')}</span> <span className="font-latin text-[12px] opacity-70">{count((c) => c.target === t)}</span>
              </Chip>
            ))}
            <Chip on={target === NO_TARGET} onClick={() => setTarget(target === NO_TARGET ? null : NO_TARGET)}>
              표기 없음 <span className="font-latin text-[12px] opacity-70">{count((c) => c.target === null)}</span>
            </Chip>
          </div>
        </div>

        <div role="group" aria-label="요일">
          <p className="mb-1.5 text-[13px] font-black">
            요일 <span className="font-normal text-inkMuted">(고른 요일에 수업이 있는 과목)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => {
              const on = days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  aria-pressed={on}
                  className={`grid h-11 w-11 place-items-center rounded-[10px] border-2 border-ink text-[16px] font-black transition-colors ${on ? 'bg-cube text-white' : 'bg-white hover:bg-sticker'}`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="course-prof" className="mb-1.5 block text-[13px] font-black">
            교수
          </label>
          <select id="course-prof" value={prof} onChange={(e) => setProf(e.target.value)} className={`${fieldClass} appearance-auto`}>
            <option value="">전체 교수</option>
            {professors.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <p role="status" aria-live="polite" className="text-[15px] font-black">
          과목 <span className="font-latin text-[18px]">{filtered.length}</span>개
          {active && <span className="ml-1 text-[13px] font-normal text-inkMuted">/ 전체 {COURSES.length}개</span>}
        </p>
        {active && (
          <button type="button" onClick={reset} className="min-h-[40px] rounded-full border-2 border-ink bg-sticker px-3.5 text-[13px] font-black hover:bg-[#e3c900]">
            ↺ 필터 초기화
          </button>
        )}
      </div>

      {filtered.length > 0 ? (
        <ul className="flex flex-col gap-5">
          {filtered.map((c) => (
            <CourseCard key={c.id} c={c} count={counts[courseKey(c)] ?? 0} isAdmin={isAdmin} onCount={(n) => setCounts((cur) => ({ ...cur, [courseKey(c)]: n }))} plans={plans.filter((p) => p.key === courseKey(c))} onPlansChanged={loadPlans} />
          ))}
        </ul>
      ) : (
        <div className="rounded-[14px] border-2 border-dashed border-ink/40 px-4 py-10 text-center">
          <p className="text-[16px] font-black">조건에 맞는 과목이 없어요</p>
          <p className="mt-1 text-[14px] text-inkMuted">필터를 조금 풀어 보세요.</p>
          <button type="button" onClick={reset} className="mt-4 min-h-[44px] rounded-full border-2 border-ink bg-sticker px-4 text-[14px] font-black">
            ↺ 필터 초기화
          </button>
        </div>
      )}
    </div>
  );
}
