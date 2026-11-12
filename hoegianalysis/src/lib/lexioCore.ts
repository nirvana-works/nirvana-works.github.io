// 렉시오 규칙 핵심 (서버와 화면이 함께 쓴다. 서버 전용 코드를 넣지 않는다)
// 타일 id = 무늬 * 100 + 숫자. 무늬: 0 구름 < 1 별 < 2 달 < 3 태양
// 숫자 순서: 3 < 4 < … < 최대 < 1 < 2 (2가 가장 높다)

export const SUITS = [
  { name: '구름', symbol: '☁', color: '#5F7A99' },
  { name: '별', symbol: '★', color: '#2B50E6' },
  { name: '달', symbol: '☾', color: '#C48A00' },
  { name: '태양', symbol: '☀', color: '#D8392B' },
] as const;

export const MIN_SEATS = 2;
export const MAX_SEATS = 4;
export const TILES_PER_PLAYER = 12;

export const tileNum = (id: number) => id % 100;
export const tileSuit = (id: number) => Math.floor(id / 100);

// 인원수만큼 숫자 범위가 정해진다: 인원 × 3 (2명 6, 3명 9, 4명 12). 모두 12장씩 나눠 갖는다
export const maxNumFor = (players: number) => players * 3;

// 숫자의 크기 순서 번호 (3이 0, 2가 가장 큼)
export function makeRank(maxNum: number): (num: number) => number {
  return (num) => (num >= 3 ? num - 3 : maxNum - 2 + (num - 1));
}

export function strength(id: number, rk: (n: number) => number): number {
  return rk(tileNum(id)) * 4 + tileSuit(id);
}

export function allTiles(maxNum: number): number[] {
  const out: number[] = [];
  for (let s = 0; s < 4; s++) for (let n = 1; n <= maxNum; n++) out.push(s * 100 + n);
  return out;
}

export const COMBO_NAMES = ['', '싱글', '페어', '트리플', '', '', ''] as const;
export const FIVE_NAMES = ['', '스트레이트', '플러시', '풀하우스', '포카드', '스트레이트 플러시'] as const;

export interface Combo {
  size: 1 | 2 | 3 | 5;
  cat: number; // 5장 조합 종류 (1 스트레이트 … 5 스트레이트 플러시), 그 외 0
  key: number; // 같은 종류끼리 비교하는 값
  label: string;
}

// 내려는 타일들이 올바른 조합인지 판정한다. 아니면 null
export function evalCombo(ids: number[], rk: (n: number) => number): Combo | null {
  const n = ids.length;
  if (n !== 1 && n !== 2 && n !== 3 && n !== 5) return null;
  if (new Set(ids).size !== n) return null;
  const sorted = [...ids].sort((a, b) => strength(a, rk) - strength(b, rk));
  const top = strength(sorted[n - 1], rk);
  const nums = sorted.map(tileNum);

  if (n <= 3) {
    if (!nums.every((x) => x === nums[0])) return null;
    return { size: n as 1 | 2 | 3, cat: 0, key: top, label: COMBO_NAMES[n] };
  }

  const ranks = nums.map(rk).sort((a, b) => a - b);
  const straight = new Set(ranks).size === 5 && ranks[4] - ranks[0] === 4;
  const flush = sorted.every((t) => tileSuit(t) === tileSuit(sorted[0]));
  const counts = new Map<number, number>();
  for (const x of nums) counts.set(x, (counts.get(x) ?? 0) + 1);
  const shape = [...counts.values()].sort((a, b) => b - a).join('');

  let cat = 0;
  let key = top;
  if (straight && flush) cat = 5;
  else if (shape === '41') {
    cat = 4;
    key = rk([...counts.entries()].find(([, c]) => c === 4)![0]);
  } else if (shape === '32') {
    cat = 3;
    key = rk([...counts.entries()].find(([, c]) => c === 3)![0]);
  } else if (flush) cat = 2;
  else if (straight) cat = 1;
  if (cat === 0) return null;
  return { size: 5, cat, key, label: FIVE_NAMES[cat] };
}

export function beats(next: Combo, prev: Combo): boolean {
  if (next.size !== prev.size) return false;
  if (next.size < 5) return next.key > prev.key;
  return next.cat > prev.cat || (next.cat === prev.cat && next.key > prev.key);
}

export function sortTiles(ids: number[], rk: (n: number) => number, by: 'rank' | 'suit' = 'rank'): number[] {
  return [...ids].sort((a, b) => (by === 'rank' ? strength(a, rk) - strength(b, rk) : tileSuit(a) - tileSuit(b) || rk(tileNum(a)) - rk(tileNum(b))));
}

// 남은 타일로 계산하는 벌점: 장수 × 배수(8장 이상 2배, 10장 이상 3배, 13장 이상 4배), 2가 남아 있으면 하나마다 다시 2배
export function penaltyOf(hand: number[]): number {
  const rem = hand.length;
  const mult = rem >= 13 ? 4 : rem >= 10 ? 3 : rem >= 8 ? 2 : 1;
  const twos = hand.filter((t) => tileNum(t) === 2).length;
  return rem * mult * 2 ** twos;
}
