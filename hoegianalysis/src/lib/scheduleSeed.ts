import type { EventCategory } from './eventCategories';

interface SeedEvent {
  title: string;
  start: string;
  end?: string;
  category: EventCategory;
}

// 기본 일정 묶음. 묶음마다 DB에 한 번만 넣는다 (key로 넣었는지 기록)
export const SEEDS: { key: string; events: SeedEvent[] }[] = [
  {
    // PMBA 14기 주요일정 캘린더(2026.10 ~ 2027.1)
    key: 'seed:pmba14-2026-fall',
    events: [
      { title: '경영경제 간담회', start: '2026-10-27', category: 'academic' },
      { title: '맛집 소모임 부일갈매기', start: '2026-10-28', category: 'value' },
      { title: '경영경제 간담회', start: '2026-10-29', category: 'academic' },
      { title: '연세 MBAR 할로윈파티', start: '2026-10-30', category: 'external' },
      { title: '12기-14기 비어챗', start: '2026-10-30', category: 'tf' },
      { title: '고대 광홍마 글로벌 마케팅 트렌드 세션', start: '2026-10-31', category: 'external' },
      { title: '리더십 간담회', start: '2026-11-02', category: 'academic' },
      { title: 'EMBA 비어챗', start: '2026-11-06', category: 'external' },
      { title: 'Next Wave', start: '2026-11-07', category: 'external' },
      { title: '14기 MT', start: '2026-11-21', end: '2026-11-22', category: 'tf' },
      { title: 'KAIST/고대/연대/이대 연합행사', start: '2026-11-28', category: 'external' },
      { title: '기말고사 주간', start: '2026-12-14', end: '2026-12-19', category: 'academic' },
      { title: '종강총회', start: '2026-12-18', category: 'planning' },
      { title: '신년회(14기 주관)', start: '2027-01-08', category: 'planning' },
    ],
  },
  {
    // 회기분석 수업
    key: 'seed:hoegi-2026-10',
    events: [
      { title: '코리안 에스카르고', start: '2026-10-22', category: 'hoegi' },
      { title: '소랑도', start: '2026-10-24', category: 'hoegi' },
    ],
  },
];
