// 과목 댓글: 브라우저와 서버가 함께 쓰는 값
export const COURSE_COMMENT_LIMITS = { nickname: 12, body: 300 } as const;
export const COURSE_COMMENT_COOLDOWN_SECONDS = 20;

export interface CourseComment {
  id: string;
  nickname: string;
  body: string;
  created_at: string;
  mine: boolean;
}
