import { CARDS, CLOSINGS, GRADE_TEXT, KIND_LABEL, KIND_LINES, KIND_SCORE, MONTHS, SLOT_NAMES, type Card, type Grade } from './hwatuData';

// 화투점 풀이: 세 장(오전·오후·저녁)을 뽑아 월의 뜻과 패의 등급으로 읽는다. 서버 없이 화면에서만 쓴다.

export interface ReadCard {
  card: Card;
  slot: string; // 오전 / 오후 / 저녁
  title: string; // "3월 벚꽃 · 벚꽃 막 (광)"
  keyword: string;
  text: string;
  score: number;
}

export interface Fortune {
  date: string; // YYYY-MM-DD (한국 시간)
  cards: ReadCard[];
  total: number;
  grade: Grade;
  gradeName: string;
  gradeText: string;
  fields: { label: string; text: string }[];
  lucky: { color: string; number: number; direction: string; food: string };
  closing: string;
}

export const todayKST = (): string => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

// 섞은 48장 (브라우저의 안전한 난수 사용)
export function shuffledDeck(rnd: () => number = Math.random): Card[] {
  const a = [...CARDS];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const pick = <T,>(list: T[], rnd: () => number): T => list[Math.floor(rnd() * list.length)];

function gradeOf(total: number): Grade {
  // 세 장 합계(보통 6~7점)를 기준으로 대길 12% · 길 27% · 평 35% · 소흉 21% · 흉 5% 쯤 나오게 나눈다
  if (total >= 10) return 'daegil';
  if (total >= 8) return 'gil';
  if (total >= 6) return 'pyeong';
  if (total >= 4) return 'sohyung';
  return 'hyung';
}

export function readFortune(cards: [Card, Card, Card], rnd: () => number = Math.random, date = todayKST()): Fortune {
  const read: ReadCard[] = cards.map((card, i) => {
    const m = MONTHS[card.month - 1];
    const score = KIND_SCORE[card.kind] + m.bias;
    return {
      card,
      slot: SLOT_NAMES[i],
      title: `${card.month}월 ${m.name} · ${card.name} (${KIND_LABEL[card.kind]})`,
      keyword: m.keyword,
      text: `${m.slots[i]} ${pick(KIND_LINES[card.kind], rnd)}`,
      score,
    };
  });
  const total = read.reduce((n, r) => n + r.score, 0);
  const grade = gradeOf(total);
  const lowest = read.reduce((a, b) => (b.score < a.score ? b : a));
  const month = (i: number) => MONTHS[read[i].card.month - 1];
  // 분야별: 일(오전 패), 재물(오후 패), 사랑(저녁 패), 건강(가장 약한 패)
  const fields = [
    { label: '일', text: month(0).work },
    { label: '재물', text: month(1).money },
    { label: '사랑', text: month(2).love },
    { label: '건강', text: MONTHS[lowest.card.month - 1].health },
  ];
  // 행운: 가장 센 패의 달 기운을 따른다
  const best = read.reduce((a, b) => (b.score > a.score ? b : a));
  const lm = MONTHS[best.card.month - 1].lucky;
  return {
    date,
    cards: read,
    total,
    grade,
    gradeName: GRADE_TEXT[grade].name,
    gradeText: pick(GRADE_TEXT[grade].lines, rnd),
    fields,
    lucky: { color: lm.color, number: best.card.month, direction: lm.direction, food: lm.food },
    closing: pick(CLOSINGS, rnd),
  };
}
