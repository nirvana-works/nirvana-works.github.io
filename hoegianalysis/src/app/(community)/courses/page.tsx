import Link from 'next/link';
import { isAdmin } from '@/lib/adminAuth';
import { CourseBoard } from '@/components/community/courses/CourseBoard';
import { COURSES, WINTER_2026_UPDATED } from '@/lib/courses/winter2026';

export const metadata = { title: '2026 겨울학기 개설과목' };

export default function CoursesPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="relative">
        <Link href="/" className="inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-bold">
          <span aria-hidden>‹</span> Hoegilab
        </Link>
        <p className="font-latin text-[12px] font-semibold tracking-[0.2em] text-seal">WINTER 2026 · COURSES</p>
        <h1 className="mt-1 pr-24 text-[30px] font-black leading-tight sm:text-[32px]">겨울학기 개설과목</h1>
        <p className="mt-1 pr-24 text-[14px] leading-snug text-inkMuted">
          2026년 겨울학기 <span className="font-latin">{COURSES.length}</span>개 과목 · <span className="font-latin">{WINTER_2026_UPDATED}</span> 기준
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hoegilab/course-nup-2.webp" alt="" aria-hidden draggable={false} className="pointer-events-none absolute bottom-[2px] right-0 h-[132px] w-auto select-none" />
        <div className="mt-4 border-t-2 border-ink" />
      </header>
      <CourseBoard isAdmin={isAdmin()} />
    </div>
  );
}
