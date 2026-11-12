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
  has_image: boolean;
  created_at: string;
  issue_no: string; // 공고 제2026-N호 (그해 올린 순서)
}

export interface LinkableEvent {
  id: string;
  title: string;
  start_date: string;
}

export const NOTICE_MAX = 9; // 게시판에 한 번에 붙일 수 있는 대자보 수 (3×3)
export const NOTICE_LIMITS = { title: 40, kicker: 12, body: 300, when: 40, place: 40, imageBytes: 1_800_000 } as const;
