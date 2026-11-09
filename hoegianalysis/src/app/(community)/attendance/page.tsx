import Link from 'next/link';
import { FaceHeader } from '@/components/community/FaceHeader';
import { getAttendanceBoard, POINTS_PER_ROUND, roundKey } from '@/lib/attendanceBoard';

export const metadata = { title: '출석 성적표' };
export const dynamic = 'force-dynamic';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function dateLabel(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return { md: `${m}/${d}`, weekday: WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] };
}

// 출석 칸: 붉은 도장
function Stamp({ rotate }: { rotate: number }) {
  return (
    <span
      aria-label="출석"
      className="mx-auto block h-[22px] w-[22px] rounded-full border-[2.5px] border-seal"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <span className="m-[3px] block h-[10px] w-[10px] rounded-full bg-seal" />
    </span>
  );
}

export default async function AttendancePage({ searchParams }: { searchParams: { term?: string } }) {
  const { terms, term, dates, totalRounds, cumulativeTotal, people } = await getAttendanceBoard(searchParams.term);

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
            <span>
              {term.label} · 회기분석 {dates.length}회 · 총 {totalRounds}차수
            </span>
            <span>참가자 {people.length}명</span>
          </div>

          {/* 날짜가 많아지면 표만 가로로 밀린다. 이름 칸은 왼쪽, 등급·점수 칸은 오른쪽에 고정 */}
          <div className="overflow-x-auto rounded-[10px] border-2 border-ink bg-white">
            <table className="w-full border-collapse text-center">
              <thead>
                <tr>
                  <th
                    scope="col"
                    rowSpan={2}
                    className="sticky left-0 z-10 min-w-[76px] border-r-2 border-ink bg-white px-3 py-2 text-left align-bottom text-[13px] font-black"
                  >
                    이름
                  </th>
                  {dates.map((d) => {
                    const { md, weekday } = dateLabel(d.date);
                    return (
                      <th
                        key={d.date}
                        scope="colgroup"
                        colSpan={d.rounds.length}
                        className="border-l border-ink/25 px-1 pt-2 first:border-l-0"
                      >
                        <span className="block font-latin text-[14px] font-semibold leading-tight">{md}</span>
                        <span className="block text-[11px] font-bold text-inkMuted">{weekday}</span>
                      </th>
                    );
                  })}
                  <th scope="col" rowSpan={2} className="min-w-[48px] border-l-2 border-ink px-1 align-bottom text-[12px] font-black">
                    총계
                  </th>
                  <th scope="col" rowSpan={2} className="min-w-[44px] px-1 align-bottom text-[12px] font-black">
                    등급
                  </th>
                  <th scope="col" rowSpan={2} className="min-w-[64px] px-1 align-bottom text-[12px] font-black leading-tight">
                    누적
                    <br />
                    종합점수
                  </th>
                </tr>
                <tr className="border-b-2 border-ink">
                  {dates.flatMap((d) =>
                    d.rounds.map((r, i) => (
                      <th
                        key={roundKey(d.date, r)}
                        scope="col"
                        className={`min-w-[30px] px-0.5 pb-1.5 pt-0.5 text-[10px] font-bold text-inkMuted ${
                          i === 0 ? 'border-l border-ink/25' : ''
                        }`}
                      >
                        {r}차
                      </th>
                    )),
                  )}
                </tr>
              </thead>
              <tbody>
                {people.map((p, row) => {
                  const attended = new Set(p.attended);
                  const perfect = p.points === totalRounds * POINTS_PER_ROUND;
                  return (
                    <tr key={p.name} className="border-b border-ink/15 last:border-b-0">
                      <th scope="row" className="sticky left-0 z-10 border-r-2 border-ink bg-white px-3 py-1.5 text-left">
                        <span className="block max-w-[80px] truncate text-[14px] font-bold">{p.name}</span>
                        {perfect && <span className="block text-[11px] font-black text-seal">개근</span>}
                      </th>
                      {dates.flatMap((d, col) =>
                        d.rounds.map((r, i) => (
                          <td key={roundKey(d.date, r)} className={`px-0.5 py-1.5 ${i === 0 ? 'border-l border-ink/25' : ''}`}>
                            {attended.has(roundKey(d.date, r)) ? (
                              <Stamp rotate={((row * 7 + col * 13 + i * 5) % 17) - 8} />
                            ) : (
                              <span aria-label="결석" className="mx-auto block h-[22px] w-[22px] rounded-full border-2 border-dashed border-ink/20" />
                            )}
                          </td>
                        )),
                      )}
                      <td className="border-l-2 border-ink px-1 py-1.5 font-latin text-[15px] font-black">
                        {p.points}
                        <span className="text-[11px] font-semibold text-inkMuted">/{totalRounds * POINTS_PER_ROUND}</span>
                      </td>
                      <td className="px-1 py-1.5 font-latin text-[18px] font-black">{p.grade}</td>
                      <td className="px-1 py-1.5 font-latin text-[18px] font-black">
                        {p.score}
                        <span className="text-[11px] font-semibold text-inkMuted">/{cumulativeTotal * POINTS_PER_ROUND}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] leading-relaxed text-inkMuted">
            회기분석 모임의 1차·2차… 차수마다 출석하면 도장 하나(10점), 그 합이 총계입니다. 이름은 출석 때 쓴 그대로입니다.
            <br />
            등급은 이 학기 총계 순위로 1등 A+, 상위 15% A · 25% B · 40% C · 20% D (같은 점수는 같은 등급).
            누적 종합점수는 전 학기 점수를 모두 더한 값입니다. 회기분석 교수님은 성적에서 제외됩니다.
          </p>
        </section>
      )}
    </div>
  );
}
