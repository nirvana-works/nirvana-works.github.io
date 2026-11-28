// 강의 자료 「직장인의 현금흐름 파이프라인 설계」 16장.
// 원본(Next.js 스크롤 슬라이드)의 수치·문장·각주·출처는 그대로 두고, 회기랩 포스터 톤으로만 다시 그렸다.
// 모든 장은 1600×900 캔버스 기준 크기로 짜여 있고, SlideCanvas가 화면에 맞춰 통째로 줄이고 늘린다.

import type { ReactNode } from 'react';

export const CASHFLOW_DECK = {
  slug: 'cashflow',
  title: '직장인의 현금흐름 파이프라인 설계',
  subtitle: '소형 오피스텔 레버리지 포트폴리오 구축 사례 (2018–2026)',
  speaker: '김진현',
};

/* ───────────────────────── 데이터 (원본 그대로) ───────────────────────── */

const TYPES = [
  { emoji: '🏠', name: '둥지형', line: '내 주거 안정이 최고다', note: '아이 학교, 이사 스트레스 없는 삶' },
  { emoji: '🏆', name: '트로피형', line: '자산으로 내 가치를 높이고 싶다', note: '"어디 사세요?"에 답하는 순간을 즐긴다' },
  { emoji: '🎰', name: '잭팟형', line: '큰 시세차익을 단기간에', note: '레버리지, 단기 승부. 한 번만 터지면 된다' },
  { emoji: '👀', name: '포모형', line: '남들이 하니까 나도 한다', note: '옆자리 김 대리가 차를 바꿨다는 소식을 듣고 시작' },
  { emoji: '🌳', name: '유산형', line: '자식에게 물려주고 싶다', note: '내 노후까지 포함한 장기 보유' },
  { emoji: '🎓', name: '인적자본형', line: '내가 최고의 자산이다', note: '여기 계신 분들은 이미 등록금으로 투자 중' },
  { emoji: '🐄', name: '캐시카우형', line: '나는 놀고, 일은 소가 한다', note: '매달 우유처럼 들어오는 현금흐름', highlight: true },
];

const ACTS = [
  {
    no: '1막',
    title: '불안',
    points: ['입사하는 회사마다 다운턴 — 조선업, 그리고 자동차', '거제에서 산 집, 7,000만 원 손해 보고 이직', '말할 수 없는 불안. 출근이 너무 힘들었던 시절'],
  },
  {
    no: '2막',
    title: '농막의 이야기',
    points: ['한 팀장님의 농막에 초대받은 날', '주식으로 큰 손실 → 주말 번역 알바로 다시 종잣돈', '2010년대 초부터 오피스텔을 한 채씩 → 지금은 월 1,000만 원 이상', '그런데도 "회사는 안 그만둔다"'],
  },
];

const RULES = [
  { no: '01', title: '무조건 저렴해야 한다', desc: '싸게 사는 것이 수익률의 출발점' },
  { no: '02', title: '역에서 도보 10분 이내', desc: '공실을 막는 가장 확실한 조건' },
  { no: '03', title: '자기자본 수익률 10% 이상', desc: '이자를 내고도 남는 구조만' },
  { no: '+1', title: '회사는 레버리지 수단이다', desc: "근로소득을 '신용'으로 바꿔 쓴다", hidden: true },
];

/* ───────────────────────── 포스터 부품 ───────────────────────── */

// 노란 형광펜 (원본의 노랑 강조)
function Mark({ children }: { children: ReactNode }) {
  return <span className="bg-sticker px-[0.18em] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">{children}</span>;
}

// 파랑 글씨 (원본의 주황 강조)
function Blue({ children }: { children: ReactNode }) {
  return <span className="text-cube">{children}</span>;
}

function Kicker({ children, center = false }: { children: ReactNode; center?: boolean }) {
  return (
    <p className={`mb-5 inline-flex ${center ? "self-center" : "self-start"} rounded-full border-[3px] border-ink bg-white px-5 py-1.5 font-latin text-[17px] font-semibold tracking-[0.16em]`}>
      {children}
    </p>
  );
}

function H2({ children, size = 52, className = '' }: { children: ReactNode; size?: number; className?: string }) {
  return (
    <h2 className={`mb-7 font-black leading-[1.22] tracking-[-0.02em] ${className}`} style={{ fontSize: size }}>
      {children}
    </h2>
  );
}

type Tone = 'white' | 'yellow' | 'blue' | 'ink' | 'red' | 'olive';
const TONE_BG: Record<Tone, string> = {
  white: 'bg-white text-ink',
  yellow: 'bg-sticker text-ink',
  blue: 'bg-cube text-white',
  ink: 'bg-ink text-white',
  red: 'bg-seal text-white',
  olive: 'bg-inkMuted text-white',
};

function Card({ tone = 'white', className = '', children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return <div className={`rounded-[18px] border-[3px] border-ink shadow-[0_6px_0_#000] ${TONE_BG[tone]} ${className}`}>{children}</div>;
}

// 카드 위의 색 딱지 (원본의 색 띠 대신)
function Chip({ tone, children, className = '' }: { tone: Tone; children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full border-[3px] border-ink px-3.5 py-0.5 text-[16px] font-black ${TONE_BG[tone]} ${className}`}>{children}</span>;
}

// 노란 말풍선 박스 (원본의 노랑 테두리 콜아웃)
function Callout({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <Card tone="yellow" className={`px-6 py-4 text-[21px] leading-[1.6] ${className}`}>
      {children}
    </Card>
  );
}

function Foot({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`mt-3 text-[15px] leading-[1.55] text-inkMuted ${className}`}>{children}</p>;
}

function Sub({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`text-inkMuted ${className}`}>{children}</span>;
}

// 3×3 스티커 큐브 (포스터의 루빅스 큐브)
function StickerCube({ center, className = '' }: { center: ReactNode; className?: string }) {
  const tones: Tone[] = ['blue', 'yellow', 'white', 'yellow', 'white', 'blue', 'white', 'blue', 'yellow'];
  return (
    <div className={`grid grid-cols-3 gap-3 rounded-[34px] border-[4px] border-ink bg-ink p-3 shadow-[0_14px_0_rgba(0,0,0,0.25)] ${className}`}>
      {tones.map((t, i) => (
        <div key={i} className={`grid aspect-square place-items-center rounded-[16px] ${TONE_BG[t]}`}>
          {i === 4 ? center : null}
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── 슬라이드 ───────────────────────── */

export type Slide = { title: string; part: string; body: ReactNode };

export const CASHFLOW_SLIDES: Slide[] = [
  // 1. 타이틀
  {
    title: '타이틀',
    part: 'TITLE',
    body: (
      <div className="flex h-full items-center gap-16">
        <div className="min-w-0 flex-1">
          <h1 className="text-[92px] font-black leading-[1.12] tracking-[-0.03em]">
            직장인의
            <br />
            <span className="text-cube">현금흐름 파이프라인</span> 설계
          </h1>
          <p className="mt-8 text-[28px] font-bold text-inkMuted">소형 오피스텔 레버리지 포트폴리오 구축 사례 (2018–2026)</p>
          <p className="mt-12 text-[24px] font-black">김진현</p>
        </div>
        <StickerCube className="w-[380px] shrink-0 rotate-[-6deg]" center={<span className="text-[78px] leading-none">🐄</span>} />
      </div>
    ),
  },

  // 2. 투자 7유형
  {
    title: '투자하는 이유, 7가지',
    part: 'PART 1',
    body: (
      <>
        <Kicker>PART 1 · 사람들은 왜 투자하는가</Kicker>
        <H2>투자하는 이유, 7가지</H2>
        <div className="grid grid-cols-4 gap-5">
          {TYPES.map((t, i) => (
            <Card key={t.name} tone={t.highlight ? 'blue' : 'white'} className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-[38px] leading-none">{t.emoji}</span>
                <span className={`font-latin text-[14px] font-semibold tracking-[0.12em] ${t.highlight ? 'text-white/80' : 'text-inkMuted'}`}>TYPE {i + 1}</span>
              </div>
              <p className={`mt-3 text-[27px] font-black ${t.highlight ? 'text-sticker' : ''}`}>{t.name}</p>
              <p className="mt-1 text-[19px] font-bold leading-snug">{t.line}</p>
              <p className={`mt-2 text-[16px] leading-snug ${t.highlight ? 'text-white/85' : 'text-inkMuted'}`}>{t.note}</p>
            </Card>
          ))}
          <div className="grid place-items-center rounded-[18px] border-[3px] border-dashed border-ink/50 p-5 text-center text-[24px] font-black">
            👉 여러분은 몇 번이십니까?
          </div>
        </div>
      </>
    ),
  },

  // 3. 전환
  {
    title: '저는 캐시카우형입니다',
    part: 'PART 1',
    body: (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="grid h-[180px] w-[180px] rotate-[-4deg] place-items-center rounded-[28px] border-[4px] border-ink bg-sticker text-[112px] leading-none shadow-[0_8px_0_#000]">🐄</div>
        <H2 size={68} className="mt-12">
          저는 <Blue>캐시카우형</Blue>입니다.
        </H2>
        <p className="max-w-[900px] text-[28px] leading-[1.7] text-inkMuted">
          시세차익이 아니라, 현금흐름에 베팅합니다.
          <br />
          그렇게 고른 이유는 제 커리어가 <b className="text-ink">다운턴의 연속</b>이었기 때문입니다.
        </p>
      </div>
    ),
  },

  // 4. 나의 이야기
  {
    title: '투자를 시작한 계기',
    part: 'PART 2',
    body: (
      <>
        <Kicker>PART 2 · 나의 이야기</Kicker>
        <H2>투자를 시작한 계기</H2>
        <div className="grid grid-cols-2 gap-8">
          {ACTS.map((a, i) => (
            <Card key={a.no} className="p-8">
              <Chip tone={i === 0 ? 'olive' : 'yellow'}>{a.no}</Chip>
              <p className="mb-5 mt-3 text-[34px] font-black">{a.title}</p>
              <ul className="flex flex-col gap-3 text-[22px] leading-[1.5]">
                {a.points.map((p) => (
                  <li key={p} className="flex gap-3">
                    <span aria-hidden className="mt-[0.55em] h-[10px] w-[10px] shrink-0 rounded-[3px] bg-cube" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </>
    ),
  },

  // 5. 원칙
  {
    title: '매입 원칙 3 + 1',
    part: 'PART 3',
    body: (
      <>
        <Kicker>PART 3 · 파이프라인 실무</Kicker>
        <H2>매입 원칙 3 + 1</H2>
        <div className="grid gap-4">
          {RULES.map((r) => (
            <Card key={r.no} tone={r.hidden ? 'yellow' : 'white'} className="flex items-center gap-8 px-8 py-[13px]">
              <span className={`grid h-[58px] w-[84px] shrink-0 place-items-center rounded-[14px] border-[3px] border-ink font-latin text-[30px] font-semibold ${r.hidden ? 'bg-ink text-sticker' : 'bg-cube text-white'}`}>{r.no}</span>
              <div>
                <p className="text-[28px] font-black">{r.title}</p>
                <p className="mt-0.5 text-[19px] text-inkMuted">{r.desc}</p>
              </div>
            </Card>
          ))}
        </div>
        <p className="mt-7 text-[22px] text-inkMuted">
          파이프라인은 회사를 떠나기 위한 수단이 아닙니다. <b className="text-ink">근로소득이 곧 레버리지의 원천</b>입니다.
        </p>
      </>
    ),
  },

  // 6. 이 투자에 맞는 사람
  {
    title: '적합한 투자자 유형',
    part: 'WHO IS IT FOR',
    body: (
      <>
        <Kicker>WHO IS IT FOR · 이 투자에 맞는 사람</Kicker>
        <H2 size={46}>
          적합한 투자자 유형: <Blue>무주택 노마드형 · 1주택 정착형</Blue>
        </H2>
        <div className="grid grid-cols-2 gap-8">
          {[
            {
              emoji: '🎒',
              name: '노마드형',
              who: '자가 없이, 가볍게 옮겨 다니며 살고 싶은 사람',
              quote: '집을 사는 게 아니라 소를 삽니다. 소는 일하게 두고, 저는 그 우유로 원하는 동네에 월세로 삽니다.',
              pros: ['청약 무주택 자격 유지', '이동의 자유, 새로운 환경', '오피스텔 수익으로 내 월세를 상쇄'],
              watch: '월세 상승 리스크',
              tone: 'blue' as Tone,
            },
            {
              emoji: '🏡',
              name: '정착형',
              who: '자가가 있고, 이사할 계획이 없는 사람',
              quote: '집은 그대로 두고, 소는 따로 키웁니다.',
              pros: ['주거 안정 위에서 수익 전액 재투자', '새 집 살 일이 없어 취득세 중과 걱정 ↓', '등록임대 시 자가 1주택 비과세 특례'],
              watch: '등록하고, 2년 살고, 6년 버틸 것',
              tone: 'yellow' as Tone,
            },
          ].map((t) => (
            <Card key={t.name} className="flex flex-col p-7">
              <div className="flex items-center gap-4">
                <span className={`grid h-[64px] w-[64px] place-items-center rounded-[14px] border-[3px] border-ink text-[36px] leading-none ${TONE_BG[t.tone]}`}>{t.emoji}</span>
                <div>
                  <p className="text-[32px] font-black leading-none">{t.name}</p>
                  <p className="mt-1.5 text-[19px] font-bold">{t.who}</p>
                </div>
              </div>
              <p className="my-4 text-[18px] italic leading-[1.55] text-inkMuted">&ldquo;{t.quote}&rdquo;</p>
              <ul className="flex flex-col gap-1.5 text-[19px] leading-[1.5]">
                {t.pros.map((p) => (
                  <li key={p} className="flex gap-3">
                    <span aria-hidden className="mt-[0.55em] h-[9px] w-[9px] shrink-0 rounded-[3px] bg-cube" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-auto pt-4">
                <span className="block rounded-[12px] border-[3px] border-ink bg-sticker px-4 py-2 text-[17px]">
                  ⚠️ <b>주의</b> · {t.watch}
                </span>
              </p>
            </Card>
          ))}
        </div>
        <Foot className="mt-5">* 2026년 11월 기준. 세부 요건은 개인 상황에 따라 다르므로 세무 상담이 필요합니다.</Foot>
      </>
    ),
  },

  // 7. 시장
  {
    title: '서울 원룸·1.5룸 오피스텔, 최근 5년',
    part: 'MARKET',
    body: (
      <>
        <Kicker>MARKET · 서울 원룸·1.5룸 오피스텔, 최근 5년</Kicker>
        <H2 size={44} className="!mb-5">
          매매가는 보합, <Blue>임대료는 사상 최고</Blue>
        </H2>

        {/* 5년 국면: 화살표로 이어지는 타임라인 */}
        <div className="mb-5 grid grid-cols-4 gap-3">
          {[
            { y: '2020–21', t: '급등', d: '소형 아파트 대체재로 부상', tone: 'red' as Tone },
            { y: '2022.8–2024.7', t: '23개월 하락', d: '금리 인상 · 전세사기', tone: 'olive' as Tone },
            { y: '2024.8–2025', t: '바닥·보합', d: '반등은 대형 위주', tone: 'white' as Tone },
            { y: '2026', t: '소형만 약세', d: '40㎡↓ 매매 −0.05%/월', tone: 'blue' as Tone },
          ].map((p) => (
            <Card key={p.y} className="px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={`h-[14px] w-[14px] shrink-0 rounded-[4px] border-[2px] border-ink ${TONE_BG[p.tone]}`} />
                <span className="font-latin text-[15px] font-semibold text-inkMuted">{p.y}</span>
              </div>
              <p className="mt-0.5 text-[22px] font-black">{p.t}</p>
              <p className="text-[15px] text-inkMuted">{p.d}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-[1fr_1fr_1.05fr] gap-5">
          {[
            { name: '원룸 (40㎡ 이하)', price: '1년 −0.1% ~ −0.8%', priceNote: '거래도 감소 · 매수자 우위', rent: '평균 81.2만 원', rentNote: '1년 +4.8% · 첫 80만 돌파', tone: 'blue' as Tone },
            { name: '1.5룸 (40~60㎡)', price: '1년 +1.5%', priceNote: '실거주 수요 유입 · 거래 증가', rent: '평균 124.2만 원', rentNote: '1년 +3%대', tone: 'white' as Tone },
          ].map((t) => (
            <Card key={t.name} className="overflow-hidden">
              <p className={`border-b-[3px] border-ink px-5 py-2 text-[21px] font-black ${TONE_BG[t.tone]}`}>{t.name}</p>
              <div className="grid grid-cols-2 gap-3 px-5 py-3">
                <div>
                  <p className="text-[15px] text-inkMuted">매매가</p>
                  <p className="text-[20px] font-black leading-tight">{t.price}</p>
                  <p className="mt-1 text-[14px] text-inkMuted">{t.priceNote}</p>
                </div>
                <div>
                  <p className="text-[15px] text-inkMuted">월세</p>
                  <p className="text-[20px] font-black leading-tight">{t.rent}</p>
                  <p className="mt-1 text-[14px] text-inkMuted">{t.rentNote}</p>
                </div>
              </div>
            </Card>
          ))}

          {/* 수익률 막대 */}
          <Card className="overflow-hidden">
            <p className="border-b-[3px] border-ink bg-sticker px-5 py-2 text-[21px] font-black">서울 임대수익률</p>
            <div className="px-5 pt-2">
              <div className="flex h-[128px] items-end gap-3">
                {[
                  { y: '22', v: 4.3 },
                  { y: '23', v: 4.4 },
                  { y: '24', v: 4.56 },
                  { y: '25', v: 4.73 },
                  { y: '26', v: 4.87 },
                ].map((b) => (
                  <div key={b.y} className="flex flex-1 flex-col items-center">
                    <span className="font-latin text-[13px] font-semibold">{b.v}</span>
                    <div className={`w-full rounded-t-[6px] border-[2px] border-b-0 border-ink ${b.y === '26' ? 'bg-sticker' : 'bg-inkMuted'}`} style={{ height: `${(b.v - 4) * 100}px` }} />
                    <span className="mt-0.5 font-latin text-[13px] text-inkMuted">&apos;{b.y}</span>
                  </div>
                ))}
              </div>
              <p className="pb-2 pt-1 text-[13px] leading-snug text-inkMuted">KB 각 연도 2월 · 2026.9 부동산원 5.15% 역대 최고</p>
            </div>
          </Card>
        </div>

        <Callout className="mt-5 !py-3 !text-[19px]">
          실거주 수요는 큰 평형으로 떠났고, <b>원룸은 순수 임대 상품</b>이 됐습니다. 수익률 관점에서 <b className="text-cube">매수자에게 유리한 구간</b>입니다.
          <br />
          <Sub className="text-[15px]">배경: 서울 오피스텔 입주 2021년 2만1천 실 → 2026년 약 1,700실 · 월세 비중 2020년 47.5% → 2025년 74.6%</Sub>
        </Callout>
        <Foot className="!mt-2.5 !text-[14px]">* 출처: 한국부동산원 오피스텔 가격동향, KB부동산, 국토부 실거래가, 부동산R114 (2026년 11월 확인). 평형 구분은 전용면적 기준.</Foot>
      </>
    ),
  },

  // 8. 실제 사례
  {
    title: '레버리지 효과',
    part: 'CASE',
    body: (
      <>
        <Kicker>CASE · 실제 사례</Kicker>
        <H2 size={46} className="!mb-5">
          레버리지 효과: <Mark>ROE 15.6% vs 7.8%</Mark>
        </H2>
        <div className="grid grid-cols-2 gap-7">
          {[
            {
              tag: 'A · 레버리지 (실제)',
              tone: 'blue' as Tone,
              rows: [
                ['대출 (금리 5%)', '6,300만'],
                ['세입자 보증금', '1,000만'],
                ['부대비용 (취득세 등)', '약 514만'],
                ['실제 내 돈', '약 2,214만'],
                ['연 월세 (55만 × 12)', '660만'],
                ['연 이자', '−315만'],
                ['연 순수익', '345만'],
              ],
              roe: '15.6%',
            },
            {
              tag: 'B · 100% 내 돈',
              tone: 'olive' as Tone,
              rows: [
                ['대출', '0'],
                ['세입자 보증금', '1,000만'],
                ['부대비용 (취득세 등)', '약 514만'],
                ['실제 내 돈', '약 8,514만'],
                ['연 월세 (55만 × 12)', '660만'],
                ['연 이자', '0'],
                ['연 순수익', '660만'],
              ],
              roe: '7.8%',
            },
          ].map((c) => (
            <Card key={c.tag} className="overflow-hidden">
              <p className={`border-b-[3px] border-ink px-6 py-2 text-[21px] font-black ${TONE_BG[c.tone]}`}>{c.tag}</p>
              <table className="mx-6 mt-1 w-[calc(100%-48px)] border-collapse text-[18px]">
                <tbody>
                  {c.rows.map(([k, v]) => (
                    <tr key={k} className={`border-b-[2px] border-dashed border-ink/25 ${k === '실제 내 돈' ? 'bg-sticker/60' : ''}`}>
                      <td className="py-[5px] pl-1 text-inkMuted">{k}</td>
                      <td className={`py-[5px] pr-1 text-right ${k === '실제 내 돈' ? 'font-black' : 'font-bold'}`}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-baseline justify-between px-6 pb-3 pt-2">
                <span className="text-[18px] text-inkMuted">자기자본 수익률</span>
                <span className={`font-latin text-[46px] font-semibold leading-none ${c.tone === 'blue' ? 'text-cube' : 'text-inkMuted'}`}>{c.roe}</span>
              </div>
            </Card>
          ))}
        </div>
        <Callout className="mt-5 !py-3 !text-[20px]">
          같은 8,500만 원이면 → 현금 1채 <b>연 660만</b> vs 레버리지 약 3.8채 <b className="text-cube">연 약 1,330만</b> <Sub className="text-[16px]">(이론상 · 대출 규제는 후술)</Sub>
          <br />
          <Sub className="text-[16px]">은행 레버리지 + 세입자 보증금(이자 0%) = 이중 레버리지 · 금리가 약 7%까지 올라도 ROE 10% 유지</Sub>
        </Callout>
        <Foot className="!mt-2.5">* 이자만 상환 가정, 재산세·수선비·공실·종합소득세 차감 전 기준</Foot>
      </>
    ),
  },

  // 9. 자본 회수 기간
  {
    title: '내 돈이 돌아오는 시간',
    part: 'PAYBACK',
    body: (
      <>
        <Kicker>PAYBACK · 내 돈이 돌아오는 시간</Kicker>
        <H2 size={46} className="!mb-6">
          레버리지는 회수 시간을 <Blue>절반 가까이</Blue> 줄입니다
        </H2>
        <div className="grid gap-5">
          {[
            { name: 'A · 레버리지', eq: '내 돈 약 2,214만', monthly: '초기 월 순익 약 18만', years: 8.2, tone: 'blue' as Tone },
            { name: 'B · 100% 내 돈', eq: '내 돈 약 8,514만', monthly: '초기 월 순익 약 44만', years: 13.4, tone: 'olive' as Tone },
          ].map((r) => (
            <div key={r.name}>
              <div className="mb-2 flex items-baseline justify-between">
                <span className={`text-[24px] font-black ${r.tone === 'blue' ? 'text-cube' : ''}`}>{r.name}</span>
                <span className="text-[19px] text-inkMuted">
                  {r.eq} · {r.monthly}
                </span>
              </div>
              <div className="h-[52px] overflow-hidden rounded-full border-[3px] border-ink bg-white shadow-[0_5px_0_#000]">
                <div className={`flex h-full items-center justify-end border-r-[3px] border-ink pr-5 font-latin text-[24px] font-semibold ${TONE_BG[r.tone]}`} style={{ width: `${(r.years / 14) * 100}%` }}>
                  {r.years}년
                </div>
              </div>
            </div>
          ))}
        </div>
        <Callout className="mt-7 !py-3 !text-[20px]">
          월 순익 약 18만 원으로도 <b className="text-cube">약 8년이면 투하자본을 전액 회수</b>합니다. 이후의 현금흐름은 순수익입니다.
        </Callout>
        <Card className="mt-4 flex gap-5 px-6 py-4 text-[18px] leading-[1.7]">
          <span aria-hidden className="w-[8px] shrink-0 rounded-full bg-cube" />
          <p>
            <b className="text-[21px]">매도를 전제로 하지 않습니다.</b>
            <br />
            소는 평생 일하고, 마지막에는 가죽과 고기를 남깁니다. 오피스텔도 30~40년 운영한 뒤 노후화로 재건축 시점이 오면, 제게는 <b>작은 땅(대지지분)</b>이 남습니다.
            <br />
            <Sub>
              그리고 그 과정에서 매달 들어오는 현금흐름이 주는 <b className="text-ink">마음의 안정과 삶의 자신감</b>, 그것이 수익률보다 더 큰 효용입니다.
            </Sub>
          </p>
        </Card>
        <Foot className="!mt-2.5 !text-[14px]">
          * 가정: 금리 5%(이자만 상환), 월세 55만에서 3년마다 +5만, 연 비용 약 80만(재산세·수선·중개·공실) + 임대소득세 약 50만.
          <br />
          &nbsp;&nbsp;매각 차익·건강보험료 미반영. 추정치이며 개인별 세무 상담 필요.
        </Foot>
      </>
    ),
  },

  // 10. 레버리지를 일으키는 법
  {
    title: '2026년 대출 환경',
    part: 'HOW',
    body: (
      <>
        <Kicker>HOW · 2026년, 현실적으로 레버리지를 일으키는 법</Kicker>
        <H2 size={46} className="!mb-5">
          2026년 대출 환경: <span className="text-seal">제약 조건 하의 레버리지 전략</span>
        </H2>
        <div className="mb-6 flex flex-wrap gap-3">
          {['DSR 40% + 스트레스 DSR', '가계부채 총량 관리', '은행별 MCI·MCG 가입 제한', '다주택자 규제 강화'].map((t) => (
            <span key={t} className="rounded-full border-[3px] border-ink bg-seal px-4 py-1.5 text-[17px] font-bold text-white">
              {t}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-6">
          {[
            { step: 'STEP 1', title: '첫 두 채는 MCI·MCG', body: '방공제 없이 LTV 끝까지 대출. 1인당 2건이 한도라, 자본이 없다면 딱 두 채로 시작합니다.', tip: '대출 전 "MCI 가입 되나요?"부터 묻기' },
            { step: 'STEP 2', title: '그다음은 회사원 신용대출', body: '3호기부터는 방공제만큼 한도가 깎입니다. 그 빈자리를 직장인 신용으로 조금씩 메웁니다.', tip: '근로소득 = 신용' },
            { step: 'STEP 3', title: '월세로 갚고, 다시 한 채', body: '들어오는 월세로 신용대출을 줄이고, 돈이 될 때마다 1~2채씩. 지루함이 규모의 경제가 됩니다.', tip: '속도보다 반복' },
          ].map((s) => (
            <Card key={s.step} className="flex flex-col p-6">
              <Chip tone="blue" className="self-start font-latin !font-semibold tracking-[0.12em]">
                {s.step}
              </Chip>
              <p className="mb-2 mt-3 text-[25px] font-black leading-tight">{s.title}</p>
              <p className="text-[18px] leading-[1.6] text-inkMuted">{s.body}</p>
              <p className="mt-auto pt-4 text-[17px] font-bold text-cube">→ {s.tip}</p>
            </Card>
          ))}
        </div>
        <Callout className="mt-6 !py-3 !text-[20px]">
          세상에 영원한 것은 없습니다. <b>지금의 고금리도, 대출 규제도 영원하지 않습니다.</b>
          <br />
          꾸준히 방향을 만들어 가면, 결국 <b className="text-cube">순풍을 타는 시점</b>이 옵니다.
        </Callout>
        <Foot className="!mt-3">
          ⚠️ 신용대출도 DSR에 포함되고 금리가 더 높습니다. 규제지역 주택 구입과 연계된 신용대출은 제한·회수 대상이 될 수 있으니 약정 조건을 반드시 확인하세요.
        </Foot>
      </>
    ),
  },

  // 11. 세금 구간
  {
    title: '연 임대수입 2,000만 원',
    part: 'TAX',
    body: (
      <>
        <Kicker>TAX · 연 임대수입 2,000만 원 기준</Kicker>
        <H2 size={46} className="!mb-5">
          연 임대수입 <Mark>2,000만 원</Mark>: 과세 구간별 의사결정
        </H2>
        <div className="grid grid-cols-[1fr_1.4fr] gap-7">
          <Card className="overflow-hidden">
            <p className="border-b-[3px] border-ink bg-sticker px-6 py-2 font-latin text-[16px] font-semibold tracking-[0.15em]">STAGE 1</p>
            <div className="px-6 py-5">
              <p className="mb-3 text-[28px] font-black">연 임대수입 2,000만 원</p>
              <ul className="flex flex-col gap-2 text-[19px] leading-[1.55]">
                <li className="flex gap-3">
                  <span aria-hidden className="mt-[0.55em] h-[9px] w-[9px] shrink-0 rounded-[3px] bg-cube" />
                  <span>
                    2,000만 원 이하 → <b>분리과세 14%</b> 선택 가능
                  </span>
                </li>
                <li className="flex gap-3">
                  <span aria-hidden className="mt-[0.55em] h-[9px] w-[9px] shrink-0 rounded-[3px] bg-cube" />
                  <span>
                    초과 → <b>종합과세</b> (근로소득과 합산)
                  </span>
                </li>
                <li className="flex gap-3">
                  <span aria-hidden className="mt-[0.55em] h-[9px] w-[9px] shrink-0 rounded-[3px] bg-cube" />
                  <span>
                    월세 55만 기준 <b className="text-cube">약 3채</b> (월 약 165만)
                  </span>
                </li>
                <li className="flex gap-3 text-inkMuted">
                  <span aria-hidden className="mt-[0.55em] h-[9px] w-[9px] shrink-0 rounded-[3px] bg-inkMuted" />
                  <span>
                    기준은 순익이 아니라 <b>월세 총액</b>
                  </span>
                </li>
              </ul>
            </div>
          </Card>
          <div className="grid gap-4">
            <p className="font-bold text-inkMuted text-[18px]">STAGE 2 · 문 앞에서의 선택</p>
            {[
              {
                tag: 'A',
                title: '세금 구간을 통과한다',
                body: '종합과세를 감수하고 10채로 확장. 연봉 8,000만 원이면 한계세율이 높아지지만, 장부 신고 시 대출 이자 등 실제 경비를 반영할 수 있어 세무사와 비교가 필수.',
                tone: 'blue' as Tone,
              },
              {
                tag: 'B',
                title: '다른 파이프라인을 깐다',
                body: '임대는 2,000만 원에서 멈추고 배당주로 두 번째 파이프. 금융소득도 연 2,000만 원까지는 분리과세, 2026년부터 고배당기업 배당은 2,000만 원을 넘어도 분리과세 특례.',
                tone: 'yellow' as Tone,
              },
            ].map((o) => (
              <Card key={o.tag} className="flex gap-5 p-5">
                <span className={`grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[12px] border-[3px] border-ink font-latin text-[28px] font-semibold ${TONE_BG[o.tone]}`}>{o.tag}</span>
                <div>
                  <p className="text-[23px] font-black">{o.title}</p>
                  <p className="mt-1.5 text-[17px] leading-[1.6] text-inkMuted">{o.body}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
        <Callout className="mt-6 !py-3 !text-[20px]">
          단일 자산 확대보다 <b className="text-cube">소득원별 분리과세 한도를 활용한 다각화</b>가 세후 효율이 높습니다.
        </Callout>
        <Foot className="!mt-2.5 !text-[14px]">
          * 2026년 11월 기준. 월세가 오르면 3채도 2,000만 원을 넘을 수 있음. 소형주택(전용 40㎡·기준시가 2억 이하) 간주임대료 특례 기한 확인 필요.
          <br />
          &nbsp;&nbsp;고배당 분리과세는 한시 제도. 건강보험료 영향 별도. 개인별 세무 상담 필요.
        </Foot>
      </>
    ),
  },

  // 12. 시뮬레이션
  {
    title: '10채 포트폴리오 구축까지',
    part: 'SIMULATION',
    body: (
      <>
        <Kicker>SIMULATION · A의 길 · 연봉 8,000만 원 직장인</Kicker>
        <H2 size={46} className="!mb-5">
          10채 포트폴리오 구축까지 <Blue>약 7.4년</Blue>
        </H2>
        <div className="mb-5 flex flex-wrap gap-3">
          {['시작 자본: 2채분 약 4,400만', '신용대출 한도 8,000만 (6%)', '연봉의 30% = 연 2,400만 저축', '3호기부터 지방 매물 (방공제 2,500)'].map((t) => (
            <span key={t} className="rounded-full border-[3px] border-ink bg-white px-4 py-1.5 text-[17px] font-bold">
              {t}
            </span>
          ))}
        </div>
        {/* 타임라인: 소 한 마리씩 늘어난다 */}
        <div className="relative grid grid-cols-9 gap-3">
          <span aria-hidden className="absolute left-4 right-4 top-1/2 h-[4px] -translate-y-1/2 bg-ink" />
          {[
            { y: '시작', n: 2 },
            { y: '0.1년', n: 3 },
            { y: '0.5년', n: 4 },
            { y: '2.0년', n: 5 },
            { y: '3.3년', n: 6 },
            { y: '4.5년', n: 7 },
            { y: '5.6년', n: 8 },
            { y: '6.5년', n: 9 },
            { y: '7.4년', n: 10 },
          ].map((p) => (
            <Card key={p.n} tone={p.n === 10 ? 'blue' : 'white'} className="relative px-1 py-3 text-center">
              <p className="text-[24px] leading-none">🐄</p>
              <p className={`mt-1 text-[23px] font-black ${p.n === 10 ? 'text-sticker' : ''}`}>{p.n}채</p>
              <p className={`text-[15px] ${p.n === 10 ? 'text-white/85' : 'text-inkMuted'}`}>{p.y}</p>
            </Card>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-3 gap-6">
          <Card tone="blue" className="p-5">
            <p className="text-[17px] text-white/85">10채 달성 시 월 순익</p>
            <p className="text-[38px] font-black text-sticker">약 274만 원</p>
            <p className="text-[15px] text-white/85">신용대출 이자 차감 후</p>
          </Card>
          <Card className="p-5">
            <p className="text-[17px] text-inkMuted">신용대출 완납 (약 8.8년)</p>
            <p className="text-[38px] font-black">약 330만 원</p>
            <p className="text-[15px] text-inkMuted">근로소득 외 현금흐름</p>
          </Card>
          <Card tone="yellow" className="p-5">
            <p className="text-[17px] font-bold">현실 체크</p>
            <ul className="mt-1.5 flex flex-col gap-1 text-[17px] leading-[1.5]">
              <li>· 세후 저축 연 1,800만 → 8.7년</li>
              <li>· 서울 매물만 → 11.7년</li>
              <li>· DSR을 근로소득만으로 보면 9채에서 멈춤</li>
            </ul>
          </Card>
        </div>
        <Foot className="!mt-4 !text-[14px]">
          * 1~2호기 MCI·MCG(대출 6,300), 3호기~ 담보대출 3,800 + 부족분 신용대출. 매물 9,000만·보증금 1,000·월세 55(3년마다 +5), 담보 5%·신용 6% 이자만 상환,
          <br />
          &nbsp;&nbsp;채당 연 비용·세금 약 130만, 남는 현금은 신용대출 상환 우선. DSR은 임대소득 인정 시 통과 가정. 추정치이며 은행·세무 상담 필요.
        </Foot>
      </>
    ),
  },

  // 13. MY NEXT
  {
    title: '다음 단계',
    part: 'MY NEXT',
    body: (
      <>
        <Kicker>MY NEXT · 현재 포트폴리오와 다음 단계</Kicker>
        <H2 size={46} className="!mb-5">
          다음 단계: <Blue>임대 현금흐름 기반 자산배분</Blue>
        </H2>

        {/* 여정 */}
        <div className="mb-5 grid grid-cols-4 gap-4">
          {[
            { y: '2018', t: '첫 매입', d: '멘토에게 배운 원칙으로 시작', tone: 'yellow' as Tone },
            { y: '~2026', t: '10채 이상', d: '시뮬레이션 7.4년 ≈ 실제 약 8년', tone: 'blue' as Tone },
            { y: '지금', t: '종합과세 진입', d: '오피스텔 추가 매입은 잠시 멈춤', tone: 'red' as Tone },
            { y: 'NEXT', t: '적립식 투자', d: '월세 현금흐름 → 주식 · 배당주', tone: 'ink' as Tone },
          ].map((s) => (
            <Card key={s.y} className="px-5 py-4">
              <Chip tone={s.tone} className="font-latin !text-[14px] !font-semibold">
                {s.y}
              </Chip>
              <p className="mt-2 text-[24px] font-black">{s.t}</p>
              <p className="mt-1 text-[16px] text-inkMuted">{s.d}</p>
            </Card>
          ))}
        </div>

        {/* 진정한 분산 */}
        <p className="mb-3 text-[18px] font-bold text-inkMuted">목표 · 진정한 분산투자</p>
        <div className="grid grid-cols-3 gap-5">
          {[
            { e: '🐄', t: '실물 현금흐름', s: '오피스텔 10+채', d: '매달 들어오는 월세. 이 모든 것의 엔진', tone: 'blue' as Tone },
            { e: '🌳', t: '성장', s: '주식 적립식', d: '부동산이 못 주는 유동성 · 글로벌 성장', tone: 'white' as Tone },
            { e: '🍎', t: '두 번째 현금흐름', s: '배당주', d: '정책·금리·지역에 덜 묶인 또 하나의 파이프', tone: 'yellow' as Tone },
          ].map((p) => (
            <Card key={p.t} className="flex gap-4 p-5">
              <span className={`grid h-[60px] w-[60px] shrink-0 place-items-center rounded-[14px] border-[3px] border-ink text-[34px] leading-none ${TONE_BG[p.tone]}`}>{p.e}</span>
              <div>
                <p className="text-[23px] font-black leading-tight">{p.t}</p>
                <p className="text-[18px] font-bold">{p.s}</p>
                <p className="mt-1 text-[16px] leading-[1.5] text-inkMuted">{p.d}</p>
              </div>
            </Card>
          ))}
        </div>

        <Callout className="mt-6 !py-3 !text-[20px]">
          오피스텔만 10채는 <b>분산이 아니라 한 바구니에 10개</b>입니다.
          <br />
          정책 · 금리 · 지역 리스크가 한 방향이기 때문에, 이제는 <b className="text-cube">다른 바구니</b>를 채울 차례입니다.
        </Callout>
      </>
    ),
  },

  // 14. 두 번째 질문
  {
    title: '할 말을 참아본 적',
    part: 'ONE MORE QUESTION',
    body: (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <Kicker center>ONE MORE QUESTION</Kicker>
        <H2 size={84} className="mt-4 !leading-[1.25]">
          회사에서 <Mark>할 말</Mark>을
          <br />
          참아본 적 있으십니까?
        </H2>
        <p className="max-w-[900px] text-[30px] text-inkMuted">버틸 수 있는 달이 짧을수록, 삼켜야 하는 말은 길어집니다.</p>
      </div>
    ),
  },

  // 15. 3막
  {
    title: '현금흐름이 바꾼 것',
    part: '3막',
    body: (
      <>
        <Kicker>3막 · 현금흐름이 바꾼 것</Kicker>
        <H2 size={58}>
          재무적 안전마진은 <Blue>직장에서의 협상력</Blue>이 됩니다
        </H2>
        <div className="grid max-w-[1180px] gap-4">
          {[
            { before: '고용 불안에 위에서 시키는 대로', after: '내 의견을 말하기 시작' },
            { before: '눈치 보며 버티던 회의실', after: '오히려 윗사람들이 인정해 주기 시작' },
            { before: '출근이 두려웠던 아침', after: '삶이 평안해진 하루' },
          ].map((r) => (
            <Card key={r.before} className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 px-7 py-[18px]">
              <span className="text-[22px] text-inkMuted line-through decoration-[2px]">{r.before}</span>
              <span aria-hidden className="grid h-[44px] w-[44px] place-items-center rounded-full border-[3px] border-ink bg-cube text-[22px] font-black text-white">
                →
              </span>
              <span className="text-[25px] font-black">{r.after}</span>
            </Card>
          ))}
        </div>
        <p className="mt-8 text-[26px] leading-[1.7] text-inkMuted">
          저는 지금도 출근합니다. 다만 이제는 <b className="text-ink">일을 해야 해서가 아니라, 선택해서</b> 합니다.
        </p>
      </>
    ),
  },

  // 16. 클로징
  {
    title: '클로징',
    part: 'CLOSING',
    body: (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <p className="max-w-[900px] text-[28px] leading-[1.8] text-inkMuted">팀장님은 이 이야기를 많은 사람에게 했지만</p>
        <h2 className="mb-10 mt-4 text-[84px] font-black leading-[1.2] tracking-[-0.02em]">&ldquo;아무도 따라오지 않았다&rdquo;</h2>
        <p className="max-w-[1000px] text-[34px] leading-[1.7]">
          현금흐름이 준 것은 돈이 아니라
          <br />
          <b className="text-cube">선택권</b>이었습니다.
        </p>
        <p className="mt-12 inline-flex rounded-[14px] border-[3px] border-ink bg-sticker px-6 py-2.5 text-[26px] font-bold shadow-[0_6px_0_#000]">차이를 만드는 것은 정보가 아니라, 실행입니다.</p>
      </div>
    ),
  },
];
