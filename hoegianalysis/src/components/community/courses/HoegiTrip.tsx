/* eslint-disable @next/next/no-img-element */
import { HOEGI_TRIP_KEY } from '@/lib/courses/courseKey';
import type { CoursePlan } from '@/lib/coursePlanTypes';
import { CourseComments } from './CourseComments';
import { CoursePlans } from './CoursePlans';

const WEEK = ['월', '화', '수', '목', '금', '토', '일'];
const ON = ['목', '금', '토', '일'];

// 회기분석 카테고리의 특별 과목: 해외현장연수. 목록 맨 아래에서 가장 눈에 띄게
const TITLE = '회기분석 해외현장연수';

export function HoegiTrip({
  plans,
  onPlansChanged,
  count,
  onCount,
  isAdmin,
}: {
  plans: CoursePlan[];
  onPlansChanged: (name?: string) => void;
  count: number;
  onCount: (n: number) => void;
  isAdmin: boolean;
}) {
  return (
    <section aria-label="회기분석 해외현장연수" className="relative mt-2">
      {/* 카테고리 띠 */}
      <div className="relative z-10 -mb-3 ml-4 inline-flex rotate-[-2deg] items-center gap-1.5 rounded-[8px] border-[3px] border-ink bg-seal px-3.5 py-1.5 shadow-[3px_3px_0_#000]">
        <span aria-hidden className="text-[16px] text-sticker">★</span>
        <span className="text-[15px] font-black tracking-wide text-white">회기분석</span>
        <span className="font-latin text-[11px] font-semibold tracking-[0.2em] text-white/80">SPECIAL</span>
      </div>

      <div
        className="relative overflow-hidden rounded-[18px] border-[3px] border-ink bg-sticker px-4 pb-5 pt-7 shadow-[0_7px_0_#000]"
        style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.13) 1.4px, transparent 1.4px)', backgroundSize: '16px 16px' }}
      >
        {/* 탑승권 느낌의 구멍 */}
        <span aria-hidden className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-[3px] border-ink bg-lime" />
        <span aria-hidden className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-[3px] border-ink bg-lime" />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-latin text-[12px] font-semibold tracking-[0.2em]">OVERSEAS FIELD TRIP</p>
            <h3 className="mt-1 text-[28px] font-black leading-[1.1] tracking-[-0.02em]">
              회기분석
              <br />
              해외현장연수
            </h3>
            <p className="mt-2 text-[15px]">
              <span className="font-black">회기분석</span> 교수
            </p>
          </div>

          {/* 300학점 도장 */}
          <div className="relative mt-1 grid h-[92px] w-[92px] shrink-0 rotate-[10deg] place-items-center rounded-full border-[4px] border-seal bg-white/70 text-seal shadow-[0_0_0_3px_rgba(200,50,43,0.25)]" aria-label="300학점">
            <div className="text-center leading-none">
              <p className="font-latin text-[30px] font-black">300</p>
              <p className="mt-0.5 text-[15px] font-black">학점</p>
            </div>
          </div>
        </div>

        {/* 요일: 목금토일이 칠해진 일주일 */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex gap-[3px]" role="img" aria-label="수업 요일 목, 금, 토, 일">
            {WEEK.map((d) => {
              const on = ON.includes(d);
              return (
                <span key={d} aria-hidden className={`grid h-8 w-8 place-items-center rounded-[7px] border-2 text-[13px] font-black ${on ? 'border-ink bg-seal text-white' : 'border-ink/25 text-ink/35'}`}>
                  {d}
                </span>
              );
            })}
          </div>
          <p className="font-latin text-[16px] font-semibold">목·금·토·일 09:00 ~ 22:00</p>
        </div>

        {/* 연수 안내 */}
        <div className="relative mt-4 min-h-[104px] border-t-[3px] border-dashed border-ink/60 pt-4">
        <ul className="flex flex-col gap-2 pr-20 text-[15px] leading-snug">
          <li className="flex gap-2">
            <span aria-hidden>✈️</span>
            <span>
              <span className="font-black">연수기간</span> : 1/28~30 09:00 ~ 22:00 나고야
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden>📍</span>
            <span>
              <span className="font-black">연수장소</span> : 나고야(일본)
            </span>
          </li>
        </ul>
        <img src="/hoegilab/course-nup-9.webp" alt="" aria-hidden draggable={false} className="pointer-events-none absolute -bottom-1 right-0 h-[96px] w-auto select-none" />
        </div>

        {/* 수강 예정과 수업 리뷰 */}
        <div className="mt-4 flex flex-wrap gap-2">
          <CoursePlans courseKey={HOEGI_TRIP_KEY} title={TITLE} plans={plans} isAdmin={isAdmin} onChanged={onPlansChanged} tone="onYellow" />
          <CourseComments courseKey={HOEGI_TRIP_KEY} title={TITLE} count={count} isAdmin={isAdmin} onCount={onCount} />
        </div>
      </div>
    </section>
  );
}
