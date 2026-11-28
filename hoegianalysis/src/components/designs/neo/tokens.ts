import type { CSSProperties } from 'react';

// 디자인 시안 1 · 네오 브루탈리즘: 크림 종이 위에 두꺼운 먹선, 판마다 원색 하나, 만화 스티커.
// 색은 CSS 변수(--nb-*)로 깔아 두고 부품은 var(--nb-*)로만 칠한다. 다른 화면(슬라이드 등)에 옮길 때 이 파일만 가져가면 된다

export const NB_COLORS = [
  { key: 'paper', name: '종이 크림', hex: '#F4EAD5', use: '바탕. 모든 판은 이 위에 놓인다' },
  { key: 'ink', name: '먹', hex: '#141414', use: '외곽선·헤드라인·포스터 바깥 바탕. 순검정 대신 살짝 누른 먹색' },
  { key: 'pink', name: '버블 핑크', hex: '#F59BC3', use: '가장 큰 판, 주인공 그림 자리' },
  { key: 'orange', name: '탠저린', hex: '#F77B2E', use: '버튼·메뉴·두 번째 판' },
  { key: 'teal', name: '민트 틸', hex: '#55C3B5', use: '배지·짧은 구호 판' },
  { key: 'yellow', name: '레몬', hex: '#F9D648', use: '작은 버튼·스티커·웃는 얼굴' },
  { key: 'sky', name: '소다 블루', hex: '#8EB2F2', use: '보조 알약·말풍선' },
  { key: 'red', name: '토마토', hex: '#E8452F', use: '아주 작은 강조(십자·점)에만' },
] as const;

export type NbColor = (typeof NB_COLORS)[number]['key'];

// 루트에 깔 CSS 변수
export const nbVars = Object.fromEntries(NB_COLORS.map((c) => [`--nb-${c.key}`, c.hex])) as CSSProperties;

export const nb = (k: NbColor) => `var(--nb-${k})`;

// 부품이 공유하는 규칙
export const NB_RULES = {
  stroke: 3, // 외곽선 px
  radius: 18, // 판 모서리 px
  shadow: 'none', // 그림자 없음. 원본 포스터처럼 평평하게 (회기랩은 아래로 떨어지는 그림자)
};
