// 커뮤니티 메뉴 = 루빅스 큐브의 여섯 면. 순서가 곧 면 번호이고, 큐브를 돌리는 순서다
export type FaceColor = 'yellow' | 'blue' | 'white';
export type FaceArt = 'megaphone' | 'calendar' | 'pencil' | 'pin' | 'grade' | 'nupjuk';

export const MENUS = [
  { href: '/notice', short: '공지', name: '공지사항', en: 'Notice', blurb: '번개와 탐방 소식. 교수님이 직접 붙입니다', color: 'yellow', art: 'megaphone' },
  { href: '/schedule', short: '일정', name: '학교 일정', en: 'Calendar', blurb: '축제, 시험, 방학. 학교 행사 달력', color: 'blue', art: 'calendar' },
  { href: '/wall', short: '낙서', name: '낙서 벽', en: 'Graffiti Wall', blurb: '아무 말 한 줄. 140자 넘으면 반려', color: 'white', art: 'pencil' },
  { href: '/places', short: '제보', name: '가고 싶은 곳', en: 'Wish List', blurb: '다음에 털 가게를 제보하세요', color: 'yellow', art: 'pin' },
  { href: '/attendance', short: '성적표', name: '출석 성적표', en: 'Report Card', blurb: '날짜별 출석부. 개근은 숨길 수 없습니다', color: 'blue', art: 'grade' },
  { href: '/freshmen', short: '신입생', name: '신입생 소개', en: 'Freshmen', blurb: '새로 들어온 넙죽이들을 소개합니다', color: 'white', art: 'nupjuk' },
] as const satisfies readonly {
  href: string;
  short: string;
  name: string;
  en: string;
  blurb: string;
  color: FaceColor;
  art: FaceArt;
}[];

export type Menu = (typeof MENUS)[number];
export type MenuHref = Menu['href'];

export function menuIndex(href: MenuHref): number {
  return MENUS.findIndex((m) => m.href === href);
}
