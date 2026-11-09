import { createClient, type Client } from '@libsql/client';
import { getDb, initDb } from './db';
import { normalizeName } from './settlement';

// 출석부: 기존 출석 DB(세션·차수·체크인)를 그대로 읽어 날짜 × 참가자 표를 만든다.
// 금액은 읽지 않는다 (공개 화면). 한 날짜에 차수 하나라도 출석하면 그날 출석.

export interface AttendanceTerm {
  key: string; // "2026-2"
  label: string; // "2026년 2학기"
}

export interface AttendanceBoard {
  terms: AttendanceTerm[]; // 최근 학기가 앞
  term: AttendanceTerm | null; // 지금 보여주는 학기
  dates: string[]; // YYYY-MM-DD, 오래된 날짜가 왼쪽
  people: BoardPerson[]; // 출석 많은 순
  cumulativeTotal: number; // 누적 종합점수의 분모: 전 학기 회기분석 횟수
}

export type LetterGrade = 'A' | 'B' | 'C' | 'D';

export interface BoardPerson {
  name: string;
  attended: string[];
  rate: number; // 이 학기 출석률 0~1
  grade: LetterGrade;
  cumulativeAttended: number; // 전 학기 합산 출석 횟수
  score: number; // 누적 종합점수 0~100 (전 학기 합산 출석률)
}

// 성적에서 제외하는 사람 (회기분석 교수님)
const EXCLUDED = new Set(['회기분석교수', '회기분석교수님']);

// 출석률 순위로 상위 15% A, 다음 25% B, 다음 40% C, 나머지 20% D
const CUTOFFS: [LetterGrade, number][] = [
  ['A', 0.15],
  ['B', 0.4],
  ['C', 0.8],
];

// 출석률이 같으면 같은 등급: 나보다 출석률이 높은 사람 수로 위치를 정한다
export function gradeByRank(higher: number, total: number): LetterGrade {
  const pos = higher / total;
  for (const [grade, upTo] of CUTOFFS) if (pos < upTo) return grade;
  return 'D';
}

// 3~8월 = 1학기, 9~2월 = 2학기 (1·2월은 전년도 2학기)
export function termOf(date: string): AttendanceTerm {
  const [y, m] = date.split('-').map(Number);
  const year = m <= 2 ? y - 1 : y;
  const half = m >= 3 && m <= 8 ? 1 : 2;
  return { key: `${year}-${half}`, label: `${year}년 ${half}학기` };
}

// 출석 기록은 기존 출석 앱의 DB에 있다. ATTENDANCE_TURSO_URL이 있으면 그 DB를 읽기만 하고
// (테이블을 만들거나 고치지 않는다), 없으면 이 앱의 DB를 쓴다 (로컬 개발용)
let attendanceClient: Client | null = null;
async function attendanceDb(): Promise<Client> {
  const url = process.env.ATTENDANCE_TURSO_URL;
  if (!url) {
    await initDb();
    return getDb();
  }
  attendanceClient ??= createClient({ url, authToken: process.env.ATTENDANCE_TURSO_TOKEN });
  return attendanceClient;
}

export async function getAttendanceBoard(termKey?: string): Promise<AttendanceBoard> {
  const result = await (await attendanceDb()).execute(`
    SELECT s.date AS date, c.name AS name, MIN(c.checked_in_at) AS first_at
    FROM checkins c
    JOIN rounds r ON r.id = c.round_id
    JOIN sessions s ON s.id = r.session_id
    GROUP BY s.date, c.name
    ORDER BY first_at
  `);
  const rows = result.rows as unknown as { date: string; name: string }[];

  const termMap = new Map<string, AttendanceTerm>();
  for (const r of rows) {
    const t = termOf(r.date);
    termMap.set(t.key, t);
  }
  const terms = Array.from(termMap.values()).sort((a, b) => b.key.localeCompare(a.key));
  const term = terms.find((t) => t.key === termKey) ?? terms[0] ?? null;
  if (!term) return { terms, term, dates: [], people: [], cumulativeTotal: 0 };

  const inTerm = rows.filter((r) => termOf(r.date).key === term.key);
  const dates = Array.from(new Set(inTerm.map((r) => r.date))).sort();

  // 띄어쓰기만 다른 이름은 한 사람으로 (성적표와 같은 규칙). 표시는 처음 쓴 이름
  const byKey = new Map<string, { name: string; attended: Set<string> }>();
  const allByKey = new Map<string, Set<string>>();
  for (const r of rows) {
    const key = normalizeName(r.name);
    if (!key || EXCLUDED.has(key)) continue;
    const all = allByKey.get(key) ?? new Set<string>();
    all.add(r.date);
    allByKey.set(key, all);
    if (termOf(r.date).key !== term.key) continue;
    const person = byKey.get(key) ?? { name: r.name.trim(), attended: new Set<string>() };
    person.attended.add(r.date);
    byKey.set(key, person);
  }

  const cumulativeTotal = new Set(rows.map((r) => r.date)).size;
  const base = Array.from(byKey.entries()).map(([key, p]) => ({
    name: p.name,
    attended: dates.filter((d) => p.attended.has(d)),
    cumulativeAttended: allByKey.get(key)?.size ?? 0,
  }));
  const rateOf = (n: number) => (dates.length ? n / dates.length : 0);

  const people: BoardPerson[] = base
    .map((p) => {
      const rate = rateOf(p.attended.length);
      const higher = base.filter((o) => o.attended.length > p.attended.length).length;
      return {
        ...p,
        rate,
        grade: gradeByRank(higher, base.length),
        score: cumulativeTotal ? Math.round((p.cumulativeAttended / cumulativeTotal) * 100) : 0,
      };
    })
    .sort((a, b) => b.attended.length - a.attended.length || a.name.localeCompare(b.name, 'ko'));

  return { terms, term, dates, people, cumulativeTotal };
}
