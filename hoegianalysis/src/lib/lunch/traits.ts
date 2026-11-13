// 메뉴별 상황 속성 (정밀 진단에서 쓴다)
export interface Traits {
  fast: number; // 0 오래 걸림 / 1 보통 / 2 빠름 / 3 아주 빠름
  desk: boolean; // 책상 앞에서 먹기 좋음 (포장·배달·편의점)
  solo: boolean; // 혼밥 성지
  group: boolean; // 여럿이 먹어야 제맛 (혼자면 눈치)
  bossNo: boolean; // 어려운 자리에서 불편함 (튐, 먹기 불편, 흐트러짐)
  smell: boolean; // 냄새가 남음 (마늘·파·진한 향)
  hot: boolean; // 뜨끈한 국물
  cold: boolean; // 시원한 메뉴
  rainy: boolean; // 비 오는 날 메뉴
  mild: boolean; // 속이 편함
  fried: boolean; // 튀김류
  sore: boolean; // 입안이 헐었을 때 자극 (바삭함, 짠 국물, 얼얼함)
  flour: boolean; // 밀가루
  carbBomb: boolean; // 고탄수화물 폭탄 (식곤증)
  fresh: boolean; // 해산물·채소 위주
  meatMain: boolean; // 고기가 메인
}

const D: Traits = { fast: 1, desk: false, solo: false, group: false, bossNo: false, smell: false, hot: false, cold: false, rainy: false, mild: false, fried: false, sore: false, flour: false, carbBomb: false, fresh: false, meatMain: false };

const T: Record<string, Partial<Traits>> = {
  김치찌개: { fast: 2, hot: true, sore: true, solo: true },
  순두부찌개: { fast: 2, hot: true, mild: true, solo: true },
  '된장찌개 백반': { fast: 2, hot: true, mild: true, solo: true },
  제육볶음: { fast: 3, solo: true },
  비빔밥: { fast: 2, solo: true, fresh: true },
  설렁탕: { fast: 2, hot: true, mild: true, meatMain: true, solo: true },
  뼈해장국: { fast: 2, hot: true, bossNo: true, meatMain: true, solo: true },
  콩나물국밥: { fast: 3, hot: true, mild: true, fresh: true, solo: true },
  '불고기 정식': { fast: 2, meatMain: true },
  물냉면: { fast: 2, cold: true, solo: true },
  칼국수: { hot: true, rainy: true, flour: true, solo: true },
  닭갈비: { fast: 0, group: true, sore: true, smell: true, meatMain: true },
  부대찌개: { group: true, hot: true, sore: true, meatMain: true },
  '보쌈 정식': { group: true, smell: true, meatMain: true },
  '생선구이 백반': { fresh: true, solo: true },
  갈비탕: { fast: 2, hot: true, mild: true, meatMain: true },
  짜장면: { fast: 3, carbBomb: true, flour: true, bossNo: true, solo: true, desk: true },
  짬뽕: { fast: 2, hot: true, rainy: true, flour: true, smell: true, bossNo: true, sore: true, solo: true },
  볶음밥: { fast: 3, carbBomb: true, solo: true, desk: true },
  마라탕: { hot: true, smell: true, bossNo: true, sore: true, solo: true },
  마파두부덮밥: { fast: 2, carbBomb: true, solo: true },
  '탕수육 정식': { fried: true, sore: true, flour: true, meatMain: true },
  돈카츠: { fast: 0, fried: true, sore: true, flour: true, meatMain: true, solo: true },
  초밥: { fresh: true, solo: true },
  우동: { fast: 2, hot: true, mild: true, flour: true, rainy: true, solo: true },
  규동: { fast: 3, solo: true, meatMain: true, carbBomb: true, desk: true },
  연어덮밥: { fresh: true, solo: true },
  라멘: { hot: true, flour: true, sore: true, solo: true },
  '떡볶이 + 튀김': { fast: 3, bossNo: true, fried: true, sore: true, flour: true, desk: true, solo: true },
  '김밥 + 라면': { fast: 3, hot: true, flour: true, solo: true, desk: true },
  '샐러드 볼': { fast: 3, fresh: true, cold: true, desk: true, solo: true },
  샌드위치: { fast: 3, flour: true, desk: true, solo: true },
  파스타: { fast: 0, flour: true, solo: true },
  햄버거: { fast: 3, meatMain: true, flour: true, desk: true, solo: true },
  쌀국수: { fast: 2, hot: true, fresh: true, mild: true, solo: true },
  '부침개 정식': { rainy: true, fried: true, sore: true, flour: true },
  '솥밥 정식': { fast: 0, hot: true, mild: true },
  전복죽: { fast: 2, hot: true, mild: true, desk: true, solo: true },
  '맑은 곰탕': { fast: 2, hot: true, mild: true, meatMain: true, solo: true },
  밀면: { fast: 2, cold: true, flour: true, solo: true },
  콩국수: { fast: 2, cold: true, flour: true, solo: true },
  메밀소바: { fast: 2, cold: true, fresh: true, solo: true },
  회덮밥: { fast: 2, fresh: true, solo: true },
  '고등어구이 정식': { fresh: true, solo: true },
  알탕: { hot: true, fresh: true, sore: true },
  청국장: { hot: true, smell: true, bossNo: true, solo: true },
  순대국: { fast: 3, hot: true, smell: true, sore: true, meatMain: true, solo: true },
  삼겹살: { fast: 0, group: true, smell: true, meatMain: true },
  '쌈밥 정식': { bossNo: true, fresh: true },
  카레: { fast: 3, bossNo: true, carbBomb: true, solo: true, desk: true },
  수제버거: { fast: 0, bossNo: true, meatMain: true, flour: true },
  '편의점 도시락': { fast: 3, desk: true, solo: true },
  버섯전골: { fast: 0, group: true, hot: true, mild: true, fresh: true },
};

export function traitsOf(name: string): Traits {
  return { ...D, ...(T[name] ?? {}) };
}
