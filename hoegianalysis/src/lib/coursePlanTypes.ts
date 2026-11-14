// 수강 예정: 브라우저와 서버가 함께 쓰는 값
export const PLAN_NAME_LIMIT = 10;

export interface CoursePlan {
  id: string;
  key: string; // 과목 이름표 (courseKey)
  name: string;
  mine: boolean;
}
