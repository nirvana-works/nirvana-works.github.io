import { useId } from 'react';

// 시멘트 블록 담장: 위 갓돌, 칠한 블록 벽(청록 위, 벗겨지는 황토 아래), 빗물 얼룩, 바닥.
// 사진 대신 직접 그려서 라이선스 걱정 없이, 색은 사이트(라임·큐브 노랑)와 어울리게 맞췄다
export const WALL = {
  teal: '#7FA597',
  ochre: '#D4B24C',
  bare: '#A3A39A', // 칠이 떨어져 드러난 시멘트
  cap: '#9EA29A',
  ground: '#ADA893',
} as const;

// 황토가 시작되는 높이(벽 몸체 기준 %) — 낙서 색 고를 때도 쓴다
export const OCHRE_FROM = 62;

export const CAP_HEIGHT = 20; // 위 갓돌
export const GROUND_HEIGHT = 48; // 바닥

export function WallBackdrop() {
  // 낙서장이 여러 장이라 SVG 필터·패턴 id가 겹치지 않게
  const uid = `wall${useId().replace(/:/g, '')}`;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* 벽 몸체 */}
      <svg className="absolute inset-x-0 w-full" style={{ top: CAP_HEIGHT, bottom: GROUND_HEIGHT, height: `calc(100% - ${CAP_HEIGHT + GROUND_HEIGHT}px)` }}>
        <defs>
          {/* 시멘트 표면 요철: 노이즈를 빛으로 비춰 칠 위에 곱한다 */}
          <filter id={`${uid}-concrete`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="1.25" numOctaves="2" seed="2" result="noise" />
            <feDiffuseLighting in="noise" surfaceScale="0.9" lightingColor="#ffffff" result="light">
              <feDistantLight azimuth="225" elevation="55" />
            </feDiffuseLighting>
            <feComponentTransfer in="light" result="soft">
              <feFuncR type="linear" slope="0.32" intercept="0.72" />
              <feFuncG type="linear" slope="0.32" intercept="0.72" />
              <feFuncB type="linear" slope="0.32" intercept="0.72" />
            </feComponentTransfer>
            <feBlend in="SourceGraphic" in2="soft" mode="multiply" result="lit" />
            <feComposite in="lit" in2="SourceAlpha" operator="in" />
          </filter>
          {/* 큰 물얼룩 */}
          <filter id={`${uid}-damp`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.008 0.02" numOctaves="3" seed="9" />
            <feColorMatrix values="0 0 0 0 0.16  0 0 0 0 0.22  0 0 0 0 0.19  0 0 0 -1.7 0.95" />
          </filter>
          {/* 칠이 벗겨진 가장자리처럼 윤곽을 잘게 흔든다 */}
          <filter id={`${uid}-peel`} x="-5%" y="-20%" width="110%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.3 0.6" numOctaves="3" seed="5" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {/* 시멘트 블록 줄눈 (블록 120×52, 한 줄씩 엇갈림) */}
          <pattern id={`${uid}-blocks`} width="120" height="104" patternUnits="userSpaceOnUse">
            <g stroke="rgba(28,40,34,0.38)" strokeWidth="2.5">
              <path d="M0 1 H120 M0 53 H120 M1 1 V53 M61 53 V105" />
            </g>
            <g stroke="rgba(255,255,255,0.22)" strokeWidth="1">
              <path d="M0 3.5 H120 M0 55.5 H120 M3.5 3 V52 M63.5 55 V104" />
            </g>
          </pattern>
          {/* 갓돌에서 흘러내린 빗물 자국 */}
          <linearGradient id={`${uid}-streak`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#24302b" stopOpacity="0.35" />
            <stop offset="1" stopColor="#24302b" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${uid}-foot`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b3020" stopOpacity="0" />
            <stop offset="1" stopColor="#3b3020" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* 칠: 청록 + 벗겨지는 황토 + 시멘트가 드러난 자리 → 표면 요철을 함께 입힌다 */}
        <g filter={`url(#${uid}-concrete)`}>
          <rect width="100%" height="100%" fill={WALL.teal} />
          <svg y={`${OCHRE_FROM - 6}%`} width="100%" height={`${106 - OCHRE_FROM}%`} viewBox="0 0 100 40" preserveAspectRatio="none">
            <g filter={`url(#${uid}-peel)`}>
              <path
                d="M-2 6 C3 5 5 1 9 2 C13 3 14 -1 18 0 C22 1 21 5 26 4 C31 3 33 1 37 2 C41 3 40 7 45 6 C50 5 52 3 56 4 C60 5 61 1 65 2 C70 3 71 6 76 5 C80 4 82 1 86 3 C90 5 93 3 96 4 C99 5 100 3 102 4 L102 42 L-2 42 Z"
                fill={WALL.ochre}
              />
              <path d="M14 14 C18 13 21 16 18 19 C15 21 11 18 14 14 Z" fill={WALL.bare} />
              <path d="M62 22 C67 21 70 25 66 28 C62 30 59 26 62 22 Z" fill={WALL.bare} />
              <path d="M84 12 C86 11 88 13 86 15 C84 16 83 14 84 12 Z" fill={WALL.bare} />
            </g>
          </svg>
          <svg width="100%" height="55%" viewBox="0 0 100 50" preserveAspectRatio="none">
            <g filter={`url(#${uid}-peel)`}>
              <path d="M70 18 C74 17 77 20 74 23 C71 25 67 22 70 18 Z" fill={WALL.bare} />
              <path d="M8 34 C11 33 13 35 11 37 C9 38 7 36 8 34 Z" fill={WALL.bare} />
            </g>
          </svg>
        </g>

        <rect width="100%" height="100%" filter={`url(#${uid}-damp)`} opacity="0.45" />
        <rect width="100%" height="100%" fill={`url(#${uid}-blocks)`} />

        {/* 빗물 자국 몇 줄 */}
        <g filter={`url(#${uid}-peel)`}>
          <rect x="18%" width="14" height="38%" fill={`url(#${uid}-streak)`} />
          <rect x="47%" width="22" height="26%" fill={`url(#${uid}-streak)`} />
          <rect x="81%" width="10" height="44%" fill={`url(#${uid}-streak)`} />
        </g>

        {/* 바닥과 닿는 아랫단 흙때 */}
        <rect y="88%" width="100%" height="12%" fill={`url(#${uid}-foot)`} />
      </svg>

      {/* 위 갓돌: 맨 시멘트, 아래로 그림자 */}
      <div
        className="concrete-grain absolute inset-x-0 top-0 border-b-2 border-[#6d726b]"
        style={{ height: CAP_HEIGHT, background: `linear-gradient(${WALL.cap}, #8a8f87)` }}
      />
      <div
        className="absolute inset-x-0"
        style={{ top: CAP_HEIGHT, height: 16, background: 'linear-gradient(rgba(20,28,24,0.32), rgba(20,28,24,0))' }}
      />

      {/* 바닥: 벽 밑 그늘 + 흙바닥 */}
      <div
        className="concrete-grain absolute inset-x-0 bottom-0"
        style={{ height: GROUND_HEIGHT, background: `linear-gradient(#8f8b77, ${WALL.ground} 28%, #b8b39d)` }}
      />
      <div
        className="absolute inset-x-0"
        style={{ bottom: GROUND_HEIGHT - 2, height: 4, background: '#4f564f' }}
      />
    </div>
  );
}
