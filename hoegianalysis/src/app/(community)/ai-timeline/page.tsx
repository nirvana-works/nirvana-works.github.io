import Link from 'next/link';

export const metadata = { title: '2026 AI 모델 진화 타임라인' };

// 시기 (좌: 상반기 → 우: 하반기). 마지막이 지금
const PERIODS = [
  { when: '1~3월', theme: '컨텍스트 확장' },
  { when: '4~5월', theme: '에이전트 자율성' },
  { when: '6~9월', theme: '5·6세대 격돌' },
  { when: '10~11월', theme: '실무 전면 도입' },
] as const;

interface Company {
  name: string;
  product: string;
  review: string;
  color: string; // 회사 색 (글자·왼쪽 띠)
  tint: string; // 헤더 칸 바탕
  stages: { name: string; note: string }[];
}

const COMPANIES: Company[] = [
  {
    name: 'OpenAI',
    product: 'GPT',
    review: '에이전트 대중화와 범용성의 상징',
    color: '#1f9d6b',
    tint: '#DDF2E6',
    stages: [
      { name: 'GPT-5.4', note: '100만 토큰 처리.' },
      { name: 'GPT-5.5', note: '복합 워크플로우 수행.' },
      { name: 'GPT-6 Astra', note: '새로운 세대 지능.' },
      { name: 'GPT-6 롤아웃', note: '지능형 UI 전면화.' },
    ],
  },
  {
    name: 'Google',
    product: 'Gemini',
    review: '구글 생태계 기반 강력한 실무 연동',
    color: '#2B50E6',
    tint: '#DCE5FB',
    stages: [
      { name: 'Gemini 3.5', note: '수백만 문맥 최적화.' },
      { name: '3.5 Ultra', note: '온디바이스 AI 도약.' },
      { name: '4 Argon 발표', note: '프론티어 모델 공개.' },
      { name: '4 Argon 배포', note: '워크스페이스 자율 제어.' },
    ],
  },
  {
    name: 'Anthropic',
    product: 'Claude',
    review: '코딩 특화 및 개발자의 절대적 신뢰',
    color: '#7a4fd6',
    tint: '#E9E0FA',
    stages: [
      { name: 'Claude 4.6', note: '에이전트 팀 구성.' },
      { name: '4.7 / 4.8', note: '코딩 오류 대폭 감소.' },
      { name: 'Fable 5', note: '5세대 프론티어 공개.' },
      { name: '5.5 생태계', note: '속도 최적화 라인업.' },
    ],
  },
];

const GRID = 'sm:grid-cols-[124px_repeat(4,minmax(0,1fr))]';

export default function AiTimelinePage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link href="/" className="inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-bold">
          <span aria-hidden>‹</span> Hoegilab
        </Link>
        <p className="font-latin text-[12px] font-semibold tracking-[0.2em] text-seal">AI MODEL TIMELINE</p>
        <h1 className="mt-1 text-[32px] font-black leading-tight">2026 AI 모델 진화 타임라인</h1>
        <p className="mt-1 text-[14px] leading-snug text-inkMuted">OpenAI, Google, Anthropic의 핵심 업데이트</p>
        <div className="mt-4 flex items-center gap-2 border-t-2 border-ink pt-3 text-[13px] font-bold">
          <span className="rounded-full border-2 border-ink bg-white px-3 py-0.5">상반기</span>
          <span aria-hidden className="h-[3px] flex-1 bg-ink" />
          <span aria-hidden className="-ml-2 text-[16px] leading-none">▶</span>
          <span className="rounded-full border-2 border-ink bg-sticker px-3 py-0.5">하반기 · 지금</span>
        </div>
      </header>

      <section aria-label="회사별 시기별 업데이트" className="flex flex-col gap-5 sm:gap-3">
        {/* 큰 화면: 시기 머리줄 */}
        <div aria-hidden className={`hidden gap-2 sm:grid ${GRID}`}>
          <span />
          {PERIODS.map((p, i) => (
            <div key={p.when} className={`border-b-[4px] pb-1 ${i === PERIODS.length - 1 ? 'border-sticker' : 'border-cube'}`}>
              <p className="font-latin text-[15px] font-semibold leading-tight">{p.when}</p>
              <p className="text-[11px] font-bold leading-tight text-inkMuted">{p.theme}</p>
            </div>
          ))}
        </div>

        {COMPANIES.map((c) => (
          <article key={c.name} className={`grid grid-cols-2 gap-2 ${GRID}`}>
            {/* 회사 칸 */}
            <header
              className="col-span-2 flex flex-col justify-center rounded-[12px] border-2 border-ink px-3 py-2.5 shadow-[0_3px_0_#000] sm:col-span-1"
              style={{ backgroundColor: c.tint, borderLeft: `8px solid ${c.color}` }}
            >
              <h2 className="text-[19px] font-black leading-tight sm:text-[18px]" style={{ color: c.color }}>
                {c.name}
              </h2>
              <p className="font-latin text-[12px] font-semibold text-inkMuted">({c.product})</p>
              <p className="mt-1.5 border-t border-ink/25 pt-1.5 text-[12px] leading-snug">
                <span className="font-black">평가 </span>
                {c.review}
              </p>
            </header>

            {/* 시기별 칸 */}
            {c.stages.map((s, i) => {
              const now = i === PERIODS.length - 1;
              return (
                <div
                  key={s.name}
                  className={`relative flex flex-col gap-1 rounded-[12px] border-2 border-ink p-3 shadow-[0_3px_0_#000] ${now ? 'bg-sticker' : 'bg-white'}`}
                >
                  {/* 작은 화면에서만 시기를 칸 안에 적는다 */}
                  <p className="font-latin text-[11px] font-semibold leading-tight text-inkMuted sm:hidden">
                    {PERIODS[i].when} · {PERIODS[i].theme}
                  </p>
                  <h3 className="text-[16px] font-black leading-tight">{s.name}</h3>
                  <p className="text-[13px] leading-snug">{s.note}</p>
                  {now && <span className="absolute -right-1.5 -top-2.5 rotate-6 rounded-full border-2 border-ink bg-seal px-2 py-0.5 font-latin text-[10px] font-semibold text-white">NOW</span>}
                </div>
              );
            })}
          </article>
        ))}
      </section>

      <p className="text-[12px] text-inkMuted">
        <a href="https://nirvana-works.github.io/Todomanager/" target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-4">
          📋 Todo Manager ↗
        </a>
      </p>
    </div>
  );
}
