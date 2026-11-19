// 남북전쟁: 지도 자료. 실제 미국 동부를 19개 지역으로 묶는다 (모양은 mapShapes.ts)

export type Side = 'U' | 'C'; // 북군 · 남군

export interface RegionDef {
  id: string;
  name: string;
  income: number;
  fort?: boolean; // 요새 (철도 거점)
  capital?: Side;
  start: Side | null;
}

export const REGIONS: RegionDef[] = [
  { id: 'MW', name: '오대호', income: 1, start: 'U' },
  { id: 'NE', name: '뉴잉글랜드', income: 2, start: 'U' },
  { id: 'NY', name: '뉴욕', income: 3, start: 'U' },
  { id: 'PA', name: '펜실베이니아', income: 3, start: 'U' },
  { id: 'OH', name: '오하이오', income: 2, start: 'U' },
  { id: 'IL', name: '시카고', income: 3, fort: true, start: 'U' },
  { id: 'DC', name: '워싱턴', income: 2, fort: true, capital: 'U', start: 'U' },
  { id: 'MO', name: '미주리', income: 1, start: 'U' },
  { id: 'KS', name: '서부 평원', income: 1, start: null },
  { id: 'KY', name: '켄터키', income: 2, start: null },
  { id: 'VA', name: '리치먼드', income: 3, fort: true, capital: 'C', start: 'C' },
  { id: 'TN', name: '테네시', income: 2, start: 'C' },
  { id: 'NC', name: '캐롤라이나', income: 2, start: 'C' },
  { id: 'AR', name: '아칸소', income: 1, start: 'C' },
  { id: 'AL', name: '앨라배마', income: 2, start: 'C' },
  { id: 'GA', name: '애틀랜타', income: 3, fort: true, start: 'C' },
  { id: 'FL', name: '플로리다', income: 1, start: 'C' },
  { id: 'LA', name: '뉴올리언스', income: 3, fort: true, start: 'C' },
  { id: 'TX', name: '텍사스', income: 2, start: 'C' },
];

export const BY_ID: Record<string, RegionDef> = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

const EDGES: [string, string][] = [
  ['NE', 'NY'], ['NY', 'PA'], ['PA', 'OH'], ['PA', 'DC'], ['PA', 'VA'], ['OH', 'IL'], ['OH', 'KY'], ['OH', 'MW'],
  ['MW', 'IL'], ['MW', 'KS'], ['MW', 'MO'], ['IL', 'MO'], ['IL', 'KY'], ['MO', 'KS'], ['MO', 'AR'], ['MO', 'KY'], ['MO', 'TN'], ['KS', 'AR'], ['KS', 'TX'],
  ['DC', 'VA'], ['VA', 'KY'], ['VA', 'NC'], ['VA', 'TN'], ['KY', 'TN'], ['TN', 'NC'], ['TN', 'AR'], ['TN', 'AL'], ['TN', 'GA'],
  ['NC', 'GA'], ['GA', 'AL'], ['GA', 'FL'], ['AL', 'FL'], ['AL', 'LA'], ['AR', 'LA'], ['AL', 'AR'], ['VA', 'OH'], ['AR', 'TX'], ['LA', 'TX'],
];

export const ADJ: Record<string, string[]> = {};
for (const r of REGIONS) ADJ[r.id] = [];
for (const [a, b] of EDGES) {
  ADJ[a].push(b);
  ADJ[b].push(a);
}

// 철도 구간 (열차가 다닌다)
export const RAILS: [string, string][] = [
  ['PA', 'OH'], ['OH', 'IL'], ['PA', 'DC'], ['DC', 'VA'], ['VA', 'NC'], ['NC', 'GA'], ['GA', 'AL'], ['AL', 'LA'], ['VA', 'TN'], ['IL', 'MO'],
];

// 서부 변경: 인디언·멕시코 침략이 오는 곳
export const INDIAN_ZONE = ['KS', 'MO', 'MW', 'IL', 'AR'];
export const MEXICAN_ZONE = ['TX', 'LA', 'AR', 'KS'];

export const SIDE_NAME: Record<Side, string> = { U: '북군', C: '남군' };
export const SIDE_COLOR: Record<Side, string> = { U: '#6F8BF0', C: '#7a7f90' };
export const TURN_LIMIT = 16; // 1861년 봄부터 1865년 봄까지
const SEASONS = ['봄', '여름', '가을', '겨울'];
export function turnLabel(turn: number): string {
  return `${1861 + Math.floor((turn - 1) / 4)}년 ${SEASONS[(turn - 1) % 4]}`;
}
