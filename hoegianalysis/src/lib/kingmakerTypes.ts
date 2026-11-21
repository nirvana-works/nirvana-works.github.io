// 킹메이커: 브라우저와 서버가 함께 쓰는 값과 집계

export type Stance = 'for' | 'neutral' | 'against';
export const STANCES: Stance[] = ['for', 'neutral', 'against'];
export const STANCE_LABEL: Record<Stance, string> = { for: '지지', neutral: '중도', against: '반대' };
export const COMMENT_LIMIT = 80;
export const NAME_LIMIT = 12;

export interface Person {
  id: string;
  name: string;
  tags: string[]; // 조·모임 같은 묶음 (지도에서 한 덩어리로 보인다)
  stance: Stance | null; // null = 아직 분류 안 함
  comment: string;
  excluded: boolean; // 투표에 안 오는 사람 등: 집계에서 뺀다
}

export interface Meta {
  candidate: string;
  opponent: string;
}

export interface Tally {
  total: number; // 집계 대상 (제외 빼고)
  for: number;
  neutral: number;
  against: number;
  unset: number;
  excluded: number;
  majority: number; // 과반에 필요한 표
}

export function tally(people: Person[]): Tally {
  const t: Tally = { total: 0, for: 0, neutral: 0, against: 0, unset: 0, excluded: 0, majority: 0 };
  for (const p of people) {
    if (p.excluded) {
      t.excluded++;
      continue;
    }
    t.total++;
    if (p.stance) t[p.stance]++;
    else t.unset++;
  }
  t.majority = Math.floor(t.total / 2) + 1;
  return t;
}

// 지도에서 묶는 기준: 첫 번째 태그, 없으면 '기타'
export const groupOf = (p: Person): string => p.tags[0] ?? '기타';
