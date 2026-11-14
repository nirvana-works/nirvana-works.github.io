import { COURSES, type Course } from './winter2026';

// 댓글이 붙는 과목의 고정 이름표. 과목명·부제·교수로 만든다 (엑셀 행 번호에 기대지 않는다)
export const courseKey = (c: Pick<Course, 'name' | 'sub' | 'professor'>) => `${c.name}${c.sub ? `<${c.sub}>` : ''}@${c.professor}`;

export const VALID_COURSE_KEYS = new Set(COURSES.map(courseKey));
