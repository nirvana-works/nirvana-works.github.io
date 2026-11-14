import { COURSES, type Course } from './winter2026';

// 댓글이 붙는 과목의 고정 이름표. 과목명·부제·교수로 만든다 (엑셀 행 번호에 기대지 않는다)
export const courseKey = (c: Pick<Course, 'name' | 'sub' | 'professor'>) => `${c.name}${c.sub ? `<${c.sub}>` : ''}@${c.professor}`;

// 과목 목록 밖에서 따로 보여 주는 회기분석 해외현장연수의 이름표
export const HOEGI_TRIP_KEY = '회기분석 해외현장연수@회기분석';

export const VALID_COURSE_KEYS = new Set([...COURSES.map(courseKey), HOEGI_TRIP_KEY]);
