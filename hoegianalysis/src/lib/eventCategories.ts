// 학교 일정 분류. 회기분석이 가장 중요해서 맨 앞, 진한 빨강으로 따로 눈에 띄게 한다.
// 나머지는 PMBA 14기 주요일정 캘린더 범례와 같은 색. 클라이언트에서도 쓰므로 DB를 부르지 않는다
export const EVENT_CATEGORIES = [
  { key: 'hoegi', label: '회기분석', dot: '#C8322B', bg: '#C8322B', text: '#FFFFFF' },
  { key: 'external', label: '대외', dot: '#5AA2F5', bg: '#D6E8FF', text: '#174A8C' },
  { key: 'planning', label: '기획', dot: '#F27C8E', bg: '#FFD9DE', text: '#8E2234' },
  { key: 'value', label: '가치', dot: '#F2A93B', bg: '#FFE4BD', text: '#7A4B00' },
  { key: 'tf', label: 'TF', dot: '#4FB86E', bg: '#D2F0D8', text: '#1E6A35' },
  { key: 'academic', label: '학사', dot: '#9B7BF0', bg: '#E6DBFF', text: '#4B2F9C' },
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number]['key'];

export const HOEGI = 'hoegi' satisfies EventCategory;

// 멤버 생일: 고르는 분류는 아니지만 달력·목록에서 같은 방식으로 보여준다
export const BIRTHDAY_STYLE = { key: 'birthday', label: '생일', dot: '#E86FA8', bg: '#FFE1EF', text: '#8A1F55' } as const;

export function categoryOf(key: string | null | undefined) {
  if (key === BIRTHDAY_STYLE.key) return BIRTHDAY_STYLE;
  return EVENT_CATEGORIES.find((c) => c.key === key) ?? null;
}

export function isEventCategory(value: unknown): value is EventCategory {
  return EVENT_CATEGORIES.some((c) => c.key === value);
}
