import Link from 'next/link';
import { FaceHeader } from '@/components/community/FaceHeader';
import { getAttendanceBoard } from '@/lib/attendanceBoard';

export const metadata = { title: '출석 성적표' };
export const dynamic = 'force-dynamic';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function dateLabel(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return { md: `${m}/${d}`, weekday: WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] };
}

// 출석 칸: 붉은 원형 도장
function Stamp({ rotate }: { rotate: number }) {
  return (
    <span
      className="mx-auto grid h-8 w-8 place-items-center rounded-full border-[2.5px] border-seal text-[10px] font-black text-seal sm:h-10 sm:w-10"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      출석
    </span>
  );
}

export default async function AttendancePage({ searchParams }: { searchParams: { term?: string } }) {
  const { terms, term, dates, people, cumulativeTotal } = await getAttendanceBoard(searchParams.term);

  return (
    <div className="flex flex-col gap-6">
      <FaceHeader href="/attendance" />

      {terms.length > 1 && (
        <nav aria-label="학기" className="flex flex-wrap gap-2">
          {terms.map((t) => (
            <Link
              key={t.key}
              href={`/attendance?term=${t.key}`}
              scroll={false}
              aria-current={t.key === term?.key ? 'page' : undefined}
              className={`rounded-full border-2 border-ink px-4 py-1.5 text-[14px] font-bold ${
                t.key === term?.key ? 'bg-ink text-white' : ''
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      )}

      {!term || dates.length === 0 ? (
        <p className="rounded-[10px] bg-cube px-5 py-4 text-[15px] font-bold leading-relaxed text-white">
          아직 출석 기록이 없습니다. 첫 회기분석에서 도장을 받아 가세요.
        </p>
      ) : (
        <section aria-label={`${term.label} 출석부`} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between text-[13px] font-bold text-inkMuted">
            <span>{term.label} · 회기분석 {dates.length}회</span>
            <span>참가자 {people.length}명</span>
          </div>

          {/* 날짜가 많아지면 표만 가로로 밀린다. 이름 칸은 왼쪽에 고정 */}
          <div className="overflow-x-auto rounded-[10px] border-2 border-ink bg-white">
            <table className="w-full border-collapse text-center">
              <thead>
                <tr className="border-b-2 border-ink">
                  <th
                    scope="col"
                    className="sticky left-0 z-10 min-w-[84px] border-r-2 border-ink bg-white px-3 py-2 text-left text-[13px] font-black"
                  >
                    이름
                  </th>
                  {dates.map((date) => {
                    const { md, weekday } = dateLabel(date);
                    return (
                      <th key={date} scope="col" className="min-w-[40px] px-0.5 py-2">
                        <span className="block font-latin text-[14px] font-semibold leading-tight">{md}</span>
                        <span className="block text-[11px] font-bold text-inkMuted">{weekday}</span>
                      </th>
                    );
                  })}
                  <th scope="col" className="min-w-[44px] border-l-2 border-ink px-1 py-2 text-[12px] font-black">
                    등급
                  </th>
                  <th scope="col" className="min-w-[56px] px-1 py-2 text-[12px] font-black leading-tight">
                    누적
                    <br />
                    종합점수
                  </th>
                </tr>
              </thead>
              <tbody>
                {people.map((p, row) => {
                  const perfect = p.attended.length === dates.length;
                  return (
                    <tr key={p.name} className="border-b border-ink/15 last:border-b-0">
                      <th
                        scope="row"
                        className="sticky left-0 z-10 border-r-2 border-ink bg-white px-3 py-1.5 text-left"
                      >
                        <span className="block max-w-[80px] truncate text-[14px] font-bold">{p.name}</span>
                        <span className={`block font-latin text-[11px] font-semibold ${perfect ? 'text-seal' : 'text-inkMuted'}`}>
                          {p.attended.length}/{dates.length}
                          {perfect && <span className="ml-1 font-sign font-black">개근</span>}
                        </span>
                      </th>
                      {dates.map((date, col) => (
                        <td key={date} className="px-1 py-1.5">
                          {p.attended.includes(date) ? (
                            <Stamp rotate={((row * 7 + col * 13) % 17) - 8} />
                          ) : (
                            <span aria-label="결석" className="mx-auto block h-8 w-8 rounded-full border-2 border-dashed border-ink/20 sm:h-10 sm:w-10" />
                          )}
                        </td>
                      ))}
                      <td className="border-l-2 border-ink px-1 py-1.5">
                        <span className="block font-latin text-[18px] font-black leading-none">{p.grade}</span>
                        <span className="block font-latin text-[11px] font-semibold text-inkMuted">
                          {Math.round(p.rate * 100)}%
                        </span>
                      </td>
                      <td className="px-1 py-1.5 font-latin text-[18px] font-black">{p.score}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] leading-relaxed text-inkMuted">
            한 날에 몇 차든 한 번이라도 출석하면 도장 하나. 이름은 출석 때 쓴 그대로입니다.
            <br />
            등급은 이 학기 출석률 순위로 상위 15% A · 25% B · 40% C · 20% D (출석률이 같으면 같은 등급).
            누적 종합점수는 전 학기 회기분석 {cumulativeTotal}회 중 출석한 비율(100점 만점)입니다. 회기분석 교수님은 성적에서 제외됩니다.
          </p>
        </section>
      )}
    </div>
  );
}
