// 총액을 인원수로 나눠 합계가 정확히 총액이 되도록 분배한다.
// 나머지(1원 단위)는 앞 순서(먼저 출석한 사람)부터 1원씩 더 낸다.
export function splitAmount(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

// 사람별 조정 금액을 반영한 분배. 조정 합계를 뺀 나머지를 똑같이 나누고 각자 조정액을 더하므로
// 합계는 항상 총액과 같다. adjustments 순서 = 출석 순서
export function splitWithAdjustments(total: number, adjustments: number[]): number[] {
  if (total <= 0) return adjustments.map(() => 0);
  const adjustmentSum = adjustments.reduce((a, b) => a + b, 0);
  const base = splitAmount(total - adjustmentSum, adjustments.length);
  return base.map((b, i) => b + adjustments[i]);
}

// 화면 표시용 인당 금액: "33,333원" 또는 "33,333~33,334원"
export function formatPerPerson(total: number, count: number): string {
  const shares = splitAmount(total, count);
  if (shares.length === 0) return '0원';
  const min = shares[shares.length - 1];
  const max = shares[0];
  return min === max
    ? `${min.toLocaleString()}원`
    : `${min.toLocaleString()}~${max.toLocaleString()}원`;
}

// 이름 비교용: 띄어쓰기를 무시
export function normalizeName(name: string): string {
  return name.replace(/\s+/g, '');
}

// 모든 차수 참석 A+, 한 차수 빠지면 B+, 두 차수 이상 빠지면 C+ (최저 등급)
const GRADES = ['A+', 'B+', 'C+'] as const;
export type Grade = (typeof GRADES)[number];
export function gradeFor(missed: number): Grade {
  return GRADES[Math.min(missed, GRADES.length - 1)];
}
