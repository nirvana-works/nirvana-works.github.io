// 총액을 인원수로 나눠 합계가 정확히 총액이 되도록 분배한다.
// 나머지(1원 단위)는 앞 순서(먼저 출석한 사람)부터 1원씩 더 낸다.
export function splitAmount(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

// 사람별 분담 입력: 금액 지정(fixed)이 있으면 그 금액을 그대로 내고,
// 없으면 ± 조정(adjustment)을 반영해 나머지 사람끼리 나눈다
export interface ShareInput {
  adjustment: number;
  fixed: number | null;
}

// 금액 지정한 사람은 그 금액, 나머지는 (총액 − 지정 합계 − 조정 합계)를 똑같이 나누고 각자 조정액을 더함.
// 지정 금액이 총액을 넘거나 모두 지정하면 합계가 총액과 달라질 수 있음 → isBalanced로 확인. 순서 = 출석 순서
export function splitShares(total: number, inputs: ShareInput[]): number[] {
  if (total <= 0) return inputs.map((i) => i.fixed ?? 0);
  const fixedSum = inputs.reduce((sum, i) => sum + (i.fixed ?? 0), 0);
  const flexible = inputs.filter((i) => i.fixed === null);
  const adjustmentSum = flexible.reduce((sum, i) => sum + i.adjustment, 0);
  const base = splitAmount(total - fixedSum - adjustmentSum, flexible.length);
  let k = 0;
  return inputs.map((i) => (i.fixed !== null ? i.fixed : base[k++] + i.adjustment));
}

// 사람별 금액 합계가 총액과 같고 음수인 사람이 없는지
export function isBalanced(total: number, shares: number[]): boolean {
  if (total <= 0) return true;
  return shares.reduce((a, b) => a + b, 0) === total && shares.every((s) => s >= 0);
}

// 정산이 맞지 않을 때 보여줄 안내 문구
export const UNBALANCED_MESSAGE = '정산 총액이 넘어가거나 부족합니다. 다른 인원에서 조정 바랍니다.';

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
