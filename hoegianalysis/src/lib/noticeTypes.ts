// 공지: 브라우저와 서버가 함께 쓰는 타입과 값 (서버 전용 코드를 끌어오지 않도록 따로 둔다)

// 목록에는 이미지 본문을 싣지 않는다 (has_image만). 이미지는 /api/notice/[id]/image로 따로 받는다
export interface Notice {
  id: string;
  title: string;
  kicker: string | null; // 제목 위 작은 빨간 글씨 (분류 등)
  body: string | null;
  when_text: string | null;
  place: string | null;
  urgent: boolean;
  event_id: string | null; // 연결한 회기분석 수업 (수강신청을 이어 준다)
  category: NoticeCategory; // 학교공지 · 회기분석 · 학생회 (도장이 달라진다)
  stamp: boolean; // 포스터에 도장을 찍을지
  has_image: boolean;
  created_at: string;
  issue_no: string; // 공고 제2026-N호 (그해 올린 순서)
}

export interface LinkableEvent {
  id: string;
  title: string;
  start_date: string;
}

export type NoticeCategory = 'school' | 'hoegi' | 'council';
export const NOTICE_CATEGORIES: { key: NoticeCategory; label: string; org: string }[] = [
  { key: 'school', label: '학교공지', org: '학교 공지' },
  { key: 'hoegi', label: '회기분석', org: '회기분석 학회' },
  { key: 'council', label: '학생회', org: '학생회' },
];
export const isNoticeCategory = (v: unknown): v is NoticeCategory => NOTICE_CATEGORIES.some((c) => c.key === v);
export const BOARD_SIZE = 4; // 게시판 한 판에 붙는 대자보 수. 넘치면 새 게시판이 생기고 지난 게시판은 넘겨 볼 수 있다
export const NOTICE_LIMITS = { title: 40, kicker: 12, body: 300, when: 40, place: 40, imageBytes: 1_800_000 } as const;
