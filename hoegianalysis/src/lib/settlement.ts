// 총액을 인원수로 나눠 합계가 정확히 총액이 되도록 분배한다.
// 나머지(1원 단위)는 앞 순서(먼저 출석한 사람)부터 1원씩 더 낸다.
export function splitAmount(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
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
