// 점심 메뉴 데이터베이스. 점수는 0~5 (kcal 제외)
export type Cat = '한식' | '중식' | '일식' | '양분';

export interface Menu {
  name: string;
  cat: Cat;
  emoji: string;
  hangover: number; // 해장지수
  fill: number; // 포만감
  spicy: number; // 매운맛
  value: number; // 가성비
  light: number; // 가벼움 (오후에 졸리지 않음)
  kcal: number;
  meat?: boolean; // 고기 느낌 (스트레스 해소용)
  note: string; // 위트 있는 처방 코멘트
}

export const CAT_LABEL: Record<Cat, string> = { 한식: '한식', 중식: '중식', 일식: '일식', 양분: '양식·분식' };

export const MENUS: Menu[] = [
  { name: '김치찌개', cat: '한식', emoji: '🍲', hangover: 4, fill: 4, spicy: 3, value: 5, light: 1, kcal: 600, meat: true, note: '조상님이 정해 준 점심. 계란말이는 선택이 아니라 필수 복용.' },
  { name: '순두부찌개', cat: '한식', emoji: '🥘', hangover: 5, fill: 3, spicy: 3, value: 4, light: 2, kcal: 450, note: '뚝배기가 끓는 동안 어제의 후회도 함께 끓여 드세요.' },
  { name: '된장찌개 백반', cat: '한식', emoji: '🍚', hangover: 3, fill: 4, spicy: 1, value: 5, light: 3, kcal: 550, note: '반찬 리필 무제한. 공기밥 추가는 의지의 문제입니다.' },
  { name: '제육볶음', cat: '한식', emoji: '🥩', hangover: 2, fill: 5, spicy: 4, value: 5, light: 1, kcal: 800, meat: true, note: '밥도둑 주의. 복용 후 밥 한 공기가 사라질 수 있습니다.' },
  { name: '비빔밥', cat: '한식', emoji: '🥗', hangover: 2, fill: 4, spicy: 2, value: 4, light: 4, kcal: 650, note: '고추장 용량은 본인 판단. 참기름은 한 바퀴 반.' },
  { name: '설렁탕', cat: '한식', emoji: '🍜', hangover: 5, fill: 4, spicy: 0, value: 3, light: 3, kcal: 550, note: '깍두기 국물을 말아 드시면 효과 2배.' },
  { name: '뼈해장국', cat: '한식', emoji: '🍖', hangover: 5, fill: 5, spicy: 3, value: 3, light: 1, kcal: 700, meat: true, note: '뼈를 발라내는 동안 스트레스도 함께 발라집니다.' },
  { name: '콩나물국밥', cat: '한식', emoji: '🥣', hangover: 5, fill: 3, spicy: 1, value: 5, light: 4, kcal: 500, note: '아스파라긴산이 간에게 보내는 위로 편지.' },
  { name: '불고기 정식', cat: '한식', emoji: '🍱', hangover: 2, fill: 4, spicy: 0, value: 3, light: 2, kcal: 750, meat: true, note: '달달한 고기는 월요일을 용서하게 만듭니다.' },
  { name: '물냉면', cat: '한식', emoji: '🧊', hangover: 3, fill: 2, spicy: 1, value: 3, light: 5, kcal: 550, note: '면을 가위로 자를지 말지는 개인의 신념에 맡깁니다.' },
  { name: '칼국수', cat: '한식', emoji: '🍜', hangover: 3, fill: 3, spicy: 0, value: 4, light: 3, kcal: 600, note: '겉절이가 맛있으면 그날은 이미 성공한 하루.' },
  { name: '닭갈비', cat: '한식', emoji: '🍗', hangover: 2, fill: 5, spicy: 4, value: 3, light: 1, kcal: 900, meat: true, note: '마지막 볶음밥까지 완주해야 처방이 완료됩니다.' },
  { name: '부대찌개', cat: '한식', emoji: '🥫', hangover: 4, fill: 5, spicy: 3, value: 3, light: 1, kcal: 850, meat: true, note: '라면 사리 추가는 의사(저)도 말리지 않습니다.' },
  { name: '보쌈 정식', cat: '한식', emoji: '🥬', hangover: 2, fill: 4, spicy: 1, value: 3, light: 2, kcal: 800, meat: true, note: '쌈 싸는 손이 바쁘면 걱정은 입 밖으로 나갈 틈이 없어요.' },
  { name: '생선구이 백반', cat: '한식', emoji: '🐟', hangover: 2, fill: 3, spicy: 0, value: 3, light: 4, kcal: 550, note: '가시를 발라내는 집중력으로 오후 업무도 발라보세요.' },
  { name: '갈비탕', cat: '한식', emoji: '🍲', hangover: 5, fill: 4, spicy: 0, value: 2, light: 3, kcal: 650, meat: true, note: '오늘은 나를 대접하는 날. 영수증은 보지 않기로 해요.' },
  { name: '짜장면', cat: '중식', emoji: '🥢', hangover: 2, fill: 4, spicy: 0, value: 5, light: 1, kcal: 850, note: '면을 비비는 순간 이미 기분이 좋아집니다. 단무지는 덤.' },
  { name: '짬뽕', cat: '중식', emoji: '🌶️', hangover: 5, fill: 4, spicy: 4, value: 4, light: 2, kcal: 700, note: '땀 한 바가지 흘리면 어제의 알코올도 같이 빠집니다.' },
  { name: '볶음밥', cat: '중식', emoji: '🍳', hangover: 1, fill: 4, spicy: 0, value: 4, light: 1, kcal: 800, note: '계란 프라이가 올라가면 점수는 두 배.' },
  { name: '마라탕', cat: '중식', emoji: '🔥', hangover: 3, fill: 4, spicy: 5, value: 3, light: 1, kcal: 800, meat: true, note: '얼얼함으로 스트레스를 마취하는 고강도 처방.' },
  { name: '마파두부덮밥', cat: '중식', emoji: '🍛', hangover: 2, fill: 4, spicy: 3, value: 4, light: 2, kcal: 700, note: '두부라서 건강식이라고 우기는 것도 처방의 일부.' },
  { name: '탕수육 정식', cat: '중식', emoji: '🍤', hangover: 1, fill: 4, spicy: 0, value: 3, light: 1, kcal: 900, meat: true, note: '부먹 찍먹 논쟁은 점심 후로 미뤄 주세요.' },
  { name: '돈카츠', cat: '일식', emoji: '🍱', hangover: 1, fill: 5, spicy: 0, value: 3, light: 1, kcal: 950, meat: true, note: '바삭한 소리가 업무 소음을 잠재워 줍니다.' },
  { name: '초밥', cat: '일식', emoji: '🍣', hangover: 1, fill: 3, spicy: 0, value: 2, light: 4, kcal: 500, note: '와사비 양으로 오늘의 용기를 측정해 보세요.' },
  { name: '우동', cat: '일식', emoji: '🍜', hangover: 4, fill: 3, spicy: 0, value: 4, light: 3, kcal: 500, note: '쫄깃한 면발이 흔들린 정신을 잡아 줍니다.' },
  { name: '규동', cat: '일식', emoji: '🍚', hangover: 1, fill: 4, spicy: 0, value: 4, light: 2, kcal: 750, meat: true, note: '빠르게 먹고 빠르게 낮잠 자고 싶은 마음, 이해합니다.' },
  { name: '연어덮밥', cat: '일식', emoji: '🐠', hangover: 1, fill: 3, spicy: 0, value: 3, light: 4, kcal: 600, note: '오메가3로 오후의 두뇌를 코팅합니다.' },
  { name: '라멘', cat: '일식', emoji: '🍥', hangover: 4, fill: 4, spicy: 1, value: 3, light: 1, kcal: 800, note: '국물까지 마시면 소금과 함께 의지도 충전됩니다.' },
  { name: '떡볶이 + 튀김', cat: '양분', emoji: '🍢', hangover: 1, fill: 4, spicy: 4, value: 5, light: 1, kcal: 850, note: '튀김은 국물에 찍어야 완성. 순대는 선택 사항.' },
  { name: '김밥 + 라면', cat: '양분', emoji: '🍙', hangover: 4, fill: 4, spicy: 2, value: 5, light: 2, kcal: 800, note: '분식집 라면은 의학적으로 라면 그 이상입니다.' },
  { name: '샐러드 볼', cat: '양분', emoji: '🥙', hangover: 1, fill: 2, spicy: 0, value: 2, light: 5, kcal: 350, note: '오후 3시의 졸음을 정면으로 막아 줄 가벼운 방패.' },
  { name: '샌드위치', cat: '양분', emoji: '🥪', hangover: 0, fill: 2, spicy: 0, value: 3, light: 4, kcal: 450, note: '한 손으로 먹으면서 다른 손으로 일하는 직장인의 친구.' },
  { name: '파스타', cat: '양분', emoji: '🍝', hangover: 1, fill: 3, spicy: 0, value: 2, light: 2, kcal: 750, note: '포크에 돌돌 말면 생각도 같이 정리됩니다.' },
  { name: '햄버거', cat: '양분', emoji: '🍔', hangover: 1, fill: 4, spicy: 0, value: 3, light: 1, kcal: 900, meat: true, note: '감자튀김부터 먹는 사람과는 친구가 될 수 있어요.' },
  { name: '쌀국수', cat: '양분', emoji: '🍜', hangover: 5, fill: 3, spicy: 1, value: 3, light: 4, kcal: 450, note: '고수는 호불호. 숙주는 무한 응원.' },
  { name: '부침개 정식', cat: '한식', emoji: '🥞', hangover: 2, fill: 3, spicy: 1, value: 4, light: 2, kcal: 650, note: '비 오는 날 빗소리는 지글지글 소리와 함께 들어야 제맛.' },
  { name: '솥밥 정식', cat: '한식', emoji: '🍚', hangover: 2, fill: 4, spicy: 0, value: 2, light: 3, kcal: 650, note: '누룽지까지 긁어 먹어야 처방이 끝납니다.' },
  { name: '전복죽', cat: '한식', emoji: '🥣', hangover: 3, fill: 3, spicy: 0, value: 2, light: 5, kcal: 450, note: '쓰린 속을 이불처럼 덮어 주는 후루룩 한 그릇.' },
  { name: '맑은 곰탕', cat: '한식', emoji: '🍲', hangover: 5, fill: 4, spicy: 0, value: 3, light: 3, kcal: 500, note: '소금은 식탁에서 각자 알아서. 파는 넉넉히 넣어 드세요.' },
  { name: '밀면', cat: '한식', emoji: '🍜', hangover: 3, fill: 2, spicy: 1, value: 4, light: 5, kcal: 500, note: '새콤달콤 육수가 여름 입맛을 되살립니다.' },
  { name: '콩국수', cat: '한식', emoji: '🥛', hangover: 2, fill: 3, spicy: 0, value: 3, light: 4, kcal: 550, note: '고소함이 더위를 이깁니다. 설탕이냐 소금이냐는 개인의 신념.' },
  { name: '메밀소바', cat: '일식', emoji: '🥢', hangover: 2, fill: 2, spicy: 0, value: 3, light: 5, kcal: 450, note: '쯔유에 와사비 풀고 후루룩. 졸릴 틈이 없습니다.' },
  { name: '회덮밥', cat: '일식', emoji: '🐟', hangover: 3, fill: 4, spicy: 2, value: 3, light: 4, kcal: 650, note: '초장 한 숟갈이 오늘의 기분을 새콤하게 리셋합니다.' },
  { name: '고등어구이 정식', cat: '한식', emoji: '🐟', hangover: 2, fill: 4, spicy: 0, value: 4, light: 4, kcal: 650, note: '등 푸른 생선이 뇌에 오메가3를 배달합니다.' },
  { name: '알탕', cat: '한식', emoji: '🥘', hangover: 5, fill: 3, spicy: 3, value: 3, light: 3, kcal: 450, note: '시원한 국물에 알 한 숟갈, 해장계의 숨은 강자.' },
  { name: '청국장', cat: '한식', emoji: '🥣', hangover: 4, fill: 4, spicy: 1, value: 5, light: 2, kcal: 550, note: '구수함은 강력하지만 옷에도 오래 남아요. 미팅 없는 날에 처방.' },
  { name: '순대국', cat: '한식', emoji: '🍲', hangover: 5, fill: 5, spicy: 2, value: 5, light: 1, kcal: 750, note: '들깻가루 듬뿍, 새우젓 한 점. 직장인 영혼의 보약.' },
  { name: '삼겹살', cat: '한식', emoji: '🥓', hangover: 1, fill: 5, spicy: 0, value: 2, light: 1, kcal: 1000, meat: true, note: '불판 앞에서 굽는 사람이 오늘의 MVP.' },
  { name: '쌈밥 정식', cat: '한식', emoji: '🥬', hangover: 2, fill: 4, spicy: 1, value: 3, light: 4, kcal: 650, note: '쌈 싸 먹는 동안 한숨 돌릴 시간까지 처방됩니다.' },
  { name: '카레', cat: '양분', emoji: '🍛', hangover: 1, fill: 4, spicy: 1, value: 4, light: 2, kcal: 800, note: '노란 국물은 흰 셔츠를 노립니다. 냅킨은 목에 거세요.' },
  { name: '수제버거', cat: '양분', emoji: '🍔', hangover: 1, fill: 5, spicy: 0, value: 2, light: 1, kcal: 1000, meat: true, note: '한입에 안 들어가는 두께가 곧 행복의 두께.' },
  { name: '편의점 도시락', cat: '양분', emoji: '🍱', hangover: 1, fill: 3, spicy: 1, value: 5, light: 2, kcal: 650, note: '전자레인지 돌아가는 2분이 오늘의 휴식.' },
  { name: '버섯전골', cat: '한식', emoji: '🍄', hangover: 4, fill: 3, spicy: 1, value: 2, light: 4, kcal: 450, note: '혼자 먹기엔 큰 냄비, 같이 먹기엔 딱 좋은 온기.' },
];
