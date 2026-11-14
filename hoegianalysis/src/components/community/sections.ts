// 커뮤니티 메뉴 = 루빅스 큐브의 여섯 면. 순서가 곧 면 번호이고, 큐브를 돌리는 순서다
export type FaceColor = 'yellow' | 'blue' | 'white';
export type FaceArt = 'megaphone' | 'calendar' | 'pencil' | 'gamepad' | 'grade' | 'nupjuk';

// 학사포탈 안의 세부 페이지. 새 페이지는 여기에 한 줄씩 추가한다
export const PORTAL_PAGES = [
  { href: '/professor', name: '교수 소개', en: 'Professor', blurb: '회기분석을 이끄는 교수님을 소개합니다', image: '/hoegilab/professor.webp' },
  { href: '/courses', name: '겨울학기 개설과목', en: 'Winter 2026', blurb: '필터로 찾고, 친구들이 듣는 과목과 수업 리뷰도 봅니다', image: '/hoegilab/course-nup-2.webp' },
  { href: '/we-can', name: '회기분석 모토', en: 'Our Motto', blurb: 'We can do it. We can make everything we imagine.', image: null },
] as const;

export const MENUS = [
  { href: '/notice', short: '공지', name: '공지사항', en: 'Notice', blurb: '번개와 탐방 소식. 교수님이 직접 붙입니다', color: 'yellow', art: 'megaphone' },
  { href: '/schedule', short: '일정', name: '학교 일정', en: 'Calendar', blurb: '축제, 시험, 방학. 학교 행사 달력', color: 'blue', art: 'calendar' },
  { href: '/wall', short: '낙서', name: '낙서 벽', en: 'Graffiti Wall', blurb: '아무 말 한 줄. 140자 넘으면 반려', color: 'white', art: 'pencil' },
  { href: '/games', short: '놀이', name: '놀이터', en: 'Playground', blurb: '폰으로 같이 노는 회기랩 놀이터. 첫 놀이는 마피아', color: 'yellow', art: 'gamepad' },
  { href: '/attendance', short: '성적표', name: '출석 성적표', en: 'Report Card', blurb: '날짜별 출석부. 개근은 숨길 수 없습니다', color: 'blue', art: 'grade' },
  { href: '/portal', short: '학사', name: '학사포탈', en: 'Academic Portal', blurb: '교수 소개, 개설과목 같은 학사 정보를 모아 둔 곳', color: 'white', art: 'nupjuk', children: PORTAL_PAGES },
] as const satisfies readonly {
  href: string;
  short: string;
  name: string;
  en: string;
  blurb: string;
  color: FaceColor;
  art: FaceArt;
  children?: readonly { href: string }[]; // 이 면 안에 들어 있는 세부 페이지
}[];

export type Menu = (typeof MENUS)[number];
export type MenuHref = Menu['href'];

export function menuIndex(href: MenuHref): number {
  return MENUS.findIndex((m) => m.href === href);
}
