import { CAT_LABEL, MENUS, type Cat, type Menu } from './menus';
import { traitsOf } from './traits';

export type Drink = 'drunk' | 'sober';
export type Breakfast = 'skip' | 'bread' | 'full';
export type Mood = 'stress' | 'light' | 'cheap';

export type Time = 'relaxed' | 'rush' | 'desk';
export type Party = 'solo' | 'team' | 'boss';
export type Weather = 'rain' | 'cold' | 'hot' | 'fine';
export type Body = 'fine' | 'stomach' | 'mouth';
export type Meeting = 'free' | 'important';
export type Balance = 'meat' | 'fed' | 'flour';
export type Tonight = 'none' | 'party' | 'meet';
export type DinnerKind = 'meat' | Cat | 'unknown';
export type LastDinner = 'meat' | Cat | 'skip';

export interface Answers {
  drink: Drink;
  breakfast: Breakfast;
  yesterday: Cat;
  mood: Mood;
  // 정밀 진단에서만 묻는다 (빠른 진단이면 비어 있다)
  time?: Time;
  party?: Party;
  weather?: Weather;
  body?: Body;
  meeting?: Meeting;
  balance?: Balance;
  tonight?: Tonight; // 오늘 저녁 회식·모임
  tonightMenu?: DinnerKind; // 그때 메뉴 (모임이 있을 때만 묻는다)
  lastDinner?: LastDinner; // 어제 저녁
}

export interface Question<K extends keyof Answers = keyof Answers> {
  key: K;
  title: string;
  advanced?: boolean; // 정밀 진단에서만 묻는 질문
  showIf?: (a: Partial<Answers>) => boolean; // 앞의 답에 따라 건너뛰는 질문
  options: { value: NonNullable<Answers[K]>; label: string; emoji: string }[];
}

export const QUESTIONS: Question[] = [
  {
    key: 'drink',
    title: '어젯밤, 음주를 하셨습니까?',
    options: [
      { value: 'drunk', label: '달렸다 (해장 필요)', emoji: '🍺' },
      { value: 'sober', label: '말짱하다', emoji: '🍵' },
    ],
  },
  {
    key: 'breakfast',
    title: '오늘 아침 식사는 하셨습니까?',
    options: [
      { value: 'skip', label: '굶었다 (당 충전 시급)', emoji: '🪫' },
      { value: 'bread', label: '빵 · 간편식', emoji: '🍞' },
      { value: 'full', label: '든든한 한식', emoji: '🍚' },
    ],
  },
  {
    key: 'yesterday',
    title: '어제 점심은 무엇을 드셨습니까?',
    options: [
      { value: '한식', label: '한식', emoji: '🍲' },
      { value: '중식', label: '중식', emoji: '🥟' },
      { value: '일식', label: '일식', emoji: '🍣' },
      { value: '양분', label: '양식 · 분식', emoji: '🍝' },
    ],
  },
  {
    key: 'lastDinner',
    title: '어제 저녁은 무엇을 드셨습니까?',
    options: [
      { value: 'meat', label: '고기 · 구이', emoji: '🥩' },
      { value: '한식', label: '한식 (고기 제외)', emoji: '🍲' },
      { value: '중식', label: '중식', emoji: '🥟' },
      { value: '일식', label: '일식 · 회', emoji: '🍣' },
      { value: '양분', label: '양식 · 분식 · 치킨', emoji: '🍝' },
      { value: 'skip', label: '안 먹었다', emoji: '🫥' },
    ],
  },
  {
    key: 'mood',
    title: '오늘 기분과 컨디션은 어떻습니까?',
    options: [
      { value: 'stress', label: '스트레스 폭발 (매운맛 · 고기)', emoji: '🔥' },
      { value: 'light', label: '오후에 졸리면 안 됨 (가볍게)', emoji: '😴' },
      { value: 'cheap', label: '월급 전날 (가성비)', emoji: '💸' },
    ],
  },
  {
    key: 'time',
    advanced: true,
    title: '점심시간은 얼마나 남았습니까?',
    options: [
      { value: 'relaxed', label: '여유로움 (1시간 풀타임)', emoji: '⏳' },
      { value: 'rush', label: '촉박함 (회의 직전, 30분 컷)', emoji: '🏃' },
      { value: 'desk', label: '책상 앞 혼밥 (배달·편의점)', emoji: '🖥️' },
    ],
  },
  {
    key: 'party',
    advanced: true,
    title: '오늘 누구와 드십니까?',
    options: [
      { value: 'solo', label: '혼밥 (자유 영혼)', emoji: '🧘' },
      { value: 'team', label: '동료들과 2~4인', emoji: '👥' },
      { value: 'boss', label: '팀장님·임원 동석 (어려운 자리)', emoji: '🎩' },
    ],
  },
  {
    key: 'weather',
    advanced: true,
    title: '오늘 날씨는 어떻습니까?',
    options: [
      { value: 'rain', label: '비/눈 옴 (습함)', emoji: '☔' },
      { value: 'cold', label: '얼어 죽을 추위', emoji: '🥶' },
      { value: 'hot', label: '무더위 (입맛 없음)', emoji: '🥵' },
      { value: 'fine', label: '화창하고 선선함', emoji: '🌤️' },
    ],
  },
  {
    key: 'body',
    advanced: true,
    title: '입안과 속 상태는 어떻습니까?',
    options: [
      { value: 'fine', label: '멀쩡함', emoji: '😊' },
      { value: 'stomach', label: '속 쓰림 · 위장 약함', emoji: '🤢' },
      { value: 'mouth', label: '입안 헐음 · 교정 중 (자극 금지)', emoji: '🦷' },
    ],
  },
  {
    key: 'meeting',
    advanced: true,
    title: '오후 일정은 어떻게 되십니까?',
    options: [
      { value: 'free', label: '오후 일정 프리함', emoji: '🕊️' },
      { value: 'important', label: '중요 미팅·발표 있음 (냄새·졸음 금지)', emoji: '🎤' },
    ],
  },
  {
    key: 'balance',
    advanced: true,
    title: '최근 고기와 밀가루 섭취는 어떻습니까?',
    options: [
      { value: 'meat', label: '고기 수혈 시급', emoji: '🥩' },
      { value: 'fed', label: '어제 회식해서 고기 물림', emoji: '🍻' },
      { value: 'flour', label: '밀가루 과다 섭취 중', emoji: '🍞' },
    ],
  },
  {
    key: 'tonight',
    advanced: true,
    title: '오늘 저녁에 회식이나 모임이 있습니까?',
    options: [
      { value: 'none', label: '없음 (저녁은 자유)', emoji: '🏠' },
      { value: 'party', label: '회식 있음 (술자리 예상)', emoji: '🍻' },
      { value: 'meet', label: '모임·약속 있음 (술 없이)', emoji: '🤝' },
    ],
  },
  {
    key: 'tonightMenu',
    advanced: true,
    showIf: (a) => a.tonight === 'party' || a.tonight === 'meet',
    title: '그 저녁 메뉴는 무엇입니까?',
    options: [
      { value: 'meat', label: '고기 · 구이', emoji: '🥩' },
      { value: '한식', label: '한식 (고기 제외)', emoji: '🍲' },
      { value: '중식', label: '중식', emoji: '🥟' },
      { value: '일식', label: '일식 · 회', emoji: '🍣' },
      { value: '양분', label: '양식 · 분식 · 치킨', emoji: '🍝' },
      { value: 'unknown', label: '아직 몰라요', emoji: '🤷' },
    ],
  },
] as Question[];

/** 진단 모드와 지금까지의 답에 따라 물어볼 질문 목록 */
export function questionsFor(full: boolean, a: Partial<Answers>): Question[] {
  return QUESTIONS.filter((q) => (full || !q.advanced) && (!q.showIf || q.showIf(a)));
}

export interface Scored {
  menu: Menu;
  score: number;
}

export function scoreMenu(m: Menu, a: Answers): number {
  // 어제 먹은 종류는 사실상 제외
  if (m.cat === a.yesterday) return -100;
  const t = traitsOf(m.name);
  const meatMain = !!m.meat || t.meatMain;
  let s = 20;
  if (a.drink === 'drunk') s += m.hangover * 5 + (m.hangover <= 1 ? -6 : 0);
  if (a.breakfast === 'skip') s += m.fill * 3;
  else if (a.breakfast === 'bread') s += m.fill * 1.2;
  else s += m.light * 2 - m.fill;
  if (a.mood === 'stress') s += m.spicy * 3.5 + (m.meat ? 8 : 0);
  else if (a.mood === 'light') s += m.light * 5 - m.fill * 1.5;
  else s += m.value * 5;

  // 시간
  if (a.time === 'rush') s += t.fast === 0 ? -60 : t.fast === 1 ? -8 : t.fast === 2 ? 12 : 18;
  else if (a.time === 'desk') s += t.desk ? 26 : -40;
  // 동행
  if (a.party === 'solo') s += t.group ? -60 : t.solo ? 8 : 0;
  else if (a.party === 'team') s += t.group ? 8 : 0;
  else if (a.party === 'boss') s += t.bossNo ? -70 : t.smell ? -30 : 4 + m.light;
  // 날씨
  if (a.weather === 'rain') s += t.rainy ? 18 : t.hot ? 5 : 0;
  else if (a.weather === 'cold') s += t.hot ? 16 : t.cold ? -25 : 0;
  else if (a.weather === 'hot') s += t.cold ? 20 : t.hot ? -12 : m.light * 1.5;
  // 입안·속
  if (a.body === 'stomach') s += (t.mild ? 24 : 0) - m.spicy * 8 - (t.fried ? 40 : 0);
  else if (a.body === 'mouth') s += (t.mild ? 8 : 0) - (t.sore ? 45 : 0) - m.spicy * 6;
  // 오후 미팅
  if (a.meeting === 'important') s += (t.smell ? -45 : 0) + (t.carbBomb ? -30 : 0) + (m.spicy >= 4 ? -10 : 0) + m.light * 2 - m.fill;
  // 고기·밀가루 밸런스
  if (a.balance === 'meat') s += meatMain ? 16 : 0;
  else if (a.balance === 'fed') s += meatMain ? -100 : t.fresh ? 16 : 0;
  else if (a.balance === 'flour') s += t.flour ? -45 : 4;

  // 오늘 저녁: 겹치는 메뉴는 피하고, 술자리가 있으면 점심은 속을 아낀다
  if (a.tonight === 'party' || a.tonight === 'meet') {
    const dm = a.tonightMenu;
    if (dm === 'meat') s += meatMain ? -45 : 0;
    else if (dm === '한식' || dm === '중식' || dm === '일식' || dm === '양분') s += m.cat === dm ? -22 : 0;
    else s += m.light * 1.5;
    if (a.tonight === 'party') s += m.light * 3 - m.fill * 1.5 - (t.fried ? 10 : 0);
  }
  // 어제 저녁: 겹치는 것은 피하고, 굶었다면 든든하게
  if (a.lastDinner === 'meat') s += meatMain ? -30 : t.fresh ? 6 : 0;
  else if (a.lastDinner === 'skip') s += m.fill * 2;
  else if (a.lastDinner) s += m.cat === a.lastDinner ? -14 : 0;

  // 같은 답이라도 매번 똑같지 않게 약간의 흔들림
  return s + Math.random() * 6;
}

/** 점수가 높은 후보 n개 */
export function topCandidates(a: Answers, n = 6): Scored[] {
  return MENUS.map((menu) => ({ menu, score: scoreMenu(menu, a) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, n);
}

/** 점수가 높을수록 더 잘 뽑히는 가중 추첨 */
export function weightedPick(list: Scored[]): number {
  const min = Math.min(...list.map((c) => c.score));
  const weights = list.map((c) => c.score - min + 4);
  let r = Math.random() * weights.reduce((x, y) => x + y, 0);
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

/** 선택과 연결된 처방 사유 */
export function reasons(m: Menu, a: Answers): string[] {
  const out: string[] = [];
  if (a.drink === 'drunk') out.push(m.hangover >= 4 ? `어젯밤 달린 간을 위해 해장지수 ${m.hangover}/5를 처방했습니다.` : '해장 전문은 아니지만 속을 놀라게 하지 않는 선택입니다.');
  else out.push('말짱한 컨디션이라 해장 걱정 없이 맛 위주로 골랐습니다.');
  if (a.breakfast === 'skip') out.push(m.fill >= 4 ? `굶은 위장에 포만감 ${m.fill}/5로 당과 기력을 한 번에 충전합니다.` : '굶은 아침이라 부담 없이 시작하는 메뉴를 골랐습니다.');
  else if (a.breakfast === 'bread') out.push('빵으로 때운 아침을 점심에서 만회하세요.');
  else out.push('든든한 아침을 드셨으니 점심은 부담 없이 즐기세요.');
  out.push(`어제 ${CAT_LABEL[a.yesterday]}을 드셨으니 오늘은 ${CAT_LABEL[a.yesterday]}을 제외했습니다.`);
  if (a.mood === 'stress') out.push(m.spicy >= 3 || m.meat ? '스트레스 폭발 상태에는 매운맛과 고기가 특효입니다.' : '스트레스는 식사 후 산책으로 마저 푸세요.');
  else if (a.mood === 'light') out.push(m.light >= 4 ? '오후 졸음을 막아 줄 가벼움 지수가 높습니다.' : '든든하지만 식후 커피 한 잔으로 졸음을 이겨 봅시다.');
  else out.push(m.value >= 4 ? `월급 전날에도 지갑이 안 아픈 가성비 ${m.value}/5입니다.` : '월급 전날이지만 오늘만큼은 나를 위한 투자입니다.');
  const t = traitsOf(m.name);
  if (a.time === 'rush') out.push(t.fast >= 2 ? '촉박한 점심시간에 나오자마자 먹을 수 있는 패스트 메뉴입니다.' : '촉박하지만 이 정도는 서두르면 충분합니다.');
  else if (a.time === 'desk') out.push(t.desk ? '책상 앞에서 먹기 좋은 포장·배달형 메뉴입니다.' : '책상 앞 점심이라도 한 끼는 제대로 챙기세요.');
  if (a.party === 'solo') out.push(t.solo ? '혼자 먹어도 눈치 안 보이는 혼밥 메뉴입니다.' : '혼밥도 당당하게. 오늘은 나를 위한 한 끼입니다.');
  else if (a.party === 'team') out.push(t.group ? '동료들과 나눠 먹을수록 맛있는 메뉴입니다.' : '동료들과 함께 먹기 무난한 메뉴입니다.');
  else if (a.party === 'boss') out.push('팀장님·임원 동석에도 안전합니다. 튀김, 냄새, 흐트러짐 걱정을 덜었습니다.');
  if (a.weather === 'rain') out.push(t.rainy ? '비 오는 날엔 역시 이 메뉴입니다.' : '궂은 날씨에도 마음이 든든해지는 선택입니다.');
  else if (a.weather === 'cold') out.push(t.hot ? '얼어 죽을 추위엔 뜨끈한 국물로 몸부터 녹이세요.' : '추위엔 식후 따뜻한 차 한 잔을 더하세요.');
  else if (a.weather === 'hot') out.push(t.cold ? '무더위에 입맛 없을 때도 시원하게 넘어갑니다.' : '더위에 지친 기력을 채워 줄 메뉴입니다.');
  if (a.body === 'stomach') out.push('속 쓰림을 고려해 자극이 적은 메뉴로 골랐습니다.');
  else if (a.body === 'mouth') out.push('입안 컨디션을 고려해 자극이 적은 메뉴로 골랐습니다.');
  if (a.meeting === 'important') out.push('오후 중요 미팅을 위해 냄새와 식곤증 걱정이 적은 메뉴입니다.');
  if (a.balance === 'meat') out.push(m.meat || t.meatMain ? '고기 수혈이 시급한 몸에 단백질을 꽉 채웁니다.' : '고기는 아니지만 든든함으로 보충합니다.');
  else if (a.balance === 'fed') out.push('어제 회식으로 물린 고기를 빼고 깔끔하게 리셋했습니다.');
  else if (a.balance === 'flour') out.push('밀가루 과다 섭취를 피해 쌀·국물 위주로 골랐습니다.');
  if (a.tonight === 'party' || a.tonight === 'meet') {
    const dm = a.tonightMenu;
    if (dm === 'meat') out.push('저녁에 고기가 예정돼 있어 점심의 고기는 쉬어 갑니다.');
    else if (dm === '한식' || dm === '중식' || dm === '일식' || dm === '양분') out.push(`저녁에 ${CAT_LABEL[dm]}이 예정돼 있어 겹치지 않게 골랐습니다.`);
    if (a.tonight === 'party') out.push('저녁 술자리를 위해 점심은 속을 아끼는 쪽으로 처방했습니다.');
  }
  if (a.lastDinner === 'meat') out.push('어제 저녁 고기를 드셨으니 오늘 점심은 쉬어 갑니다.');
  else if (a.lastDinner === 'skip') out.push('어제 저녁을 거르셨으니 오늘은 든든하게 채웁니다.');
  else if (a.lastDinner) out.push(`어제 저녁 ${CAT_LABEL[a.lastDinner]}과 겹치지 않게 골랐습니다.`);
  return out;
}

export function rxText(m: Menu, a: Answers): string {
  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);
  return [
    '💊 오늘의 점심 처방전 (회기 약국)',
    `처방: ${m.emoji} ${m.name}`,
    ...reasons(m, a).map((r) => `· ${r}`),
    `해장 ${stars(m.hangover)} / 포만감 ${stars(m.fill)} / 가성비 ${stars(m.value)} / 약 ${m.kcal}kcal`,
    `복용법: ${m.note}`,
  ].join('\n');
}
