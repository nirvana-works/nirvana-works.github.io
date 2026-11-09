import { createClient, type Client } from '@libsql/client';
import { getDb, initDb } from './db';
import { normalizeName } from './settlement';

// 출석부: 기존 출석 DB(세션·차수·체크인)를 읽어 날짜 × 차수 × 참가자 표를 만든다.
// 금액은 읽지 않는다 (공개 화면). 차수마다 출석하면 10점, 그 합이 총계.

export interface AttendanceTerm {
  key: string; // "2026-2"
  label: string; // "2026년 2학기"
}

export const POINTS_PER_ROUND = 10;

export type LetterGrade = 'A+' | 'A' | 'B' | 'C' | 'D';

export interface BoardDate {
  date: string; // YYYY-MM-DD
  rounds: number[]; // 그날 열린 차수 (1, 2, 3 …)
}

export interface BoardPerson {
  name: string;
  attended: string[]; // `${date}#${round}` 출석한 차수
  points: number; // 이 학기 총계 (차수당 10점)
  grade: LetterGrade;
  score: number; // 누적 종합점수: 전 학기 합산 점수
}

export interface AttendanceBoard {
  terms: AttendanceTerm[]; // 최근 학기가 앞
  term: AttendanceTerm | null; // 지금 보여주는 학기
  dates: BoardDate[]; // 오래된 날짜가 왼쪽
  totalRounds: number; // 이 학기 전체 차수 (만점 = 차수 × 10)
  cumulativeTotal: number; // 전 학기 전체 차수
  people: BoardPerson[]; // 총계 높은 순
}

export const roundKey = (date: string, round: number) => `${date}#${round}`;

// 성적에서 제외하는 사람 (회기분석 교수님)
const EXCLUDED = new Set(['회기분석교수', '회기분석교수님', '김진현']);

// 오타·표기 차이로 따로 적힌 이름을 한 사람으로 합친다 (띄어쓰기 뺀 이름 → 올바른 이름)
const ALIASES: Record<string, string> = {
  횡준석: '황준석',
};

// 총계 순위로 1등 A+, 상위 15% A, 다음 25% B, 다음 40% C, 나머지 20% D
const CUTOFFS: [LetterGrade, number][] = [
  ['A', 0.15],
  ['B', 0.4],
  ['C', 0.8],
];

// 점수가 같으면 같은 등급: 나보다 점수가 높은 사람 수로 위치를 정한다
export function gradeByRank(higher: number, total: number): LetterGrade {
  if (higher === 0) return 'A+'; // 1등 (공동 1등 포함)
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
  const db = await attendanceDb();
  const [roundRes, checkRes] = await Promise.all([
    db.execute(`
      SELECT DISTINCT s.date AS date, r.round_number AS round
      FROM rounds r JOIN sessions s ON s.id = r.session_id
    `),
    db.execute(`
      SELECT DISTINCT s.date AS date, r.round_number AS round, c.name AS name
      FROM checkins c
      JOIN rounds r ON r.id = c.round_id
      JOIN sessions s ON s.id = r.session_id
    `),
  ]);
  const roundRows = roundRes.rows.map((r) => ({ date: String(r.date), round: Number(r.round) }));
  const checkRows = checkRes.rows.map((r) => ({ date: String(r.date), round: Number(r.round), name: String(r.name) }));

  // 출석이 한 번이라도 있는 날짜만 표에 넣는다 (아무도 없는 차수는 제외)
  const attendedKeys = new Set(checkRows.map((r) => roundKey(r.date, r.round)));
  const openRounds = roundRows.filter((r) => attendedKeys.has(roundKey(r.date, r.round)));

  const termMap = new Map<string, AttendanceTerm>();
  for (const r of openRounds) termMap.set(termOf(r.date).key, termOf(r.date));
  const terms = Array.from(termMap.values()).sort((a, b) => b.key.localeCompare(a.key));
  const term = terms.find((t) => t.key === termKey) ?? terms[0] ?? null;
  if (!term) return { terms, term, dates: [], totalRounds: 0, cumulativeTotal: 0, people: [] };

  const byDate = new Map<string, number[]>();
  for (const r of openRounds) {
    if (termOf(r.date).key !== term.key) continue;
    byDate.set(r.date, [...(byDate.get(r.date) ?? []), r.round]);
  }
  const dates: BoardDate[] = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rounds]) => ({ date, rounds: Array.from(new Set(rounds)).sort((a, b) => a - b) }));
  const totalRounds = dates.reduce((n, d) => n + d.rounds.length, 0);
  const cumulativeTotal = openRounds.length;

  // 띄어쓰기만 다른 이름은 한 사람으로 (성적표와 같은 규칙). 표시는 처음 쓴 이름
  const people = new Map<string, { name: string; term: Set<string>; all: Set<string> }>();
  for (const r of checkRows) {
    const raw = normalizeName(r.name);
    const key = ALIASES[raw] ?? raw;
    if (!key || EXCLUDED.has(key)) continue;
    const p = people.get(key) ?? { name: ALIASES[raw] ?? r.name.trim(), term: new Set<string>(), all: new Set<string>() };
    const rk = roundKey(r.date, r.round);
    p.all.add(rk);
    if (termOf(r.date).key === term.key) p.term.add(rk);
    people.set(key, p);
  }

  const base = Array.from(people.values()).filter((p) => p.term.size > 0);
  const list: BoardPerson[] = base
    .map((p) => {
      const higher = base.filter((o) => o.term.size > p.term.size).length;
      return {
        name: p.name,
        attended: Array.from(p.term),
        points: p.term.size * POINTS_PER_ROUND,
        grade: gradeByRank(higher, base.length),
        score: p.all.size * POINTS_PER_ROUND,
      };
    })
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'ko'));

  return { terms, term, dates, totalRounds, cumulativeTotal, people: list };
}
