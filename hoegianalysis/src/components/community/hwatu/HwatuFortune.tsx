'use client';

import { useEffect, useState } from 'react';
import { KIND_LABEL, GREETINGS, REPEAT_LINES, type Card, type Kind } from '@/lib/hwatuData';
import type { Grade } from '@/lib/hwatuData';
import { readFortune, shuffledDeck, todayKST, type Fortune } from '@/lib/hwatu';
import { yellowButtonClass } from '../formStyles';

// 화투점: 신내림 넙죽이가 세 장(오전·오후·저녁)으로 오늘의 운을 읽어 준다.

const PICK_COUNT = 3;
const SHOWN = 12; // 엎어 놓은 패 수 (48장을 섞은 뒤 앞의 12장 자리에서 고른다)
const storageKey = (date: string) => `hl_hwatu_${date}`;
const IMG = '/hoegilab/hwatu-';

// ---------- 신내림 넙죽이 ----------
type Pose = 'greet' | 'bell' | 'cards' | 'bow';
const POSE_H: Record<Pose, number> = { greet: 112, bell: 104, cards: 104, bow: 78 };
// 총운 등급별 포즈 (등급별 전용 그림이 생기면 여기만 바꾼다)
const GRADE_POSE: Record<Grade, Pose> = { daegil: 'bell', gil: 'greet', pyeong: 'greet', sohyung: 'cards', hyung: 'bow' };

function Shaman({ pose, children }: { pose: Pose; children: React.ReactNode }) {
  return (
    <div className="flex items-end gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${IMG}shaman-${pose}.webp`} alt="" aria-hidden className="w-auto shrink-0 drop-shadow-[0_3px_0_rgba(0,0,0,0.35)]" style={{ height: POSE_H[pose] }} />
      <div className="relative mb-2 rounded-[12px] border-2 border-ink bg-white px-4 py-3 text-[15px] font-bold leading-relaxed">
        <span aria-hidden className="absolute -left-[9px] bottom-5 h-3.5 w-3.5 rotate-45 border-b-2 border-l-2 border-ink bg-white" />
        {children}
      </div>
    </div>
  );
}

// ---------- 화투 카드 ----------
const KIND_STYLE: Record<Kind, { bg: string; fg: string }> = {
  gwang: { bg: '#F2D80E', fg: '#000' },
  yeol: { bg: '#8FD3A6', fg: '#0b3b1e' },
  tti: { bg: '#F27C8E', fg: '#4a0a16' },
  pi: { bg: '#E9E1CC', fg: '#3b3626' },
};
const RIBBON: Record<string, string> = { 홍단: '#d6322b', 청단: '#2b60d6', 초단: '#2f9a4a', '비 띠': '#7a8fb0' };

// 광은 금테 특별 그림, 나머지는 월별 그림
const cardArt = (c: Card) => `${IMG}${c.kind === 'gwang' ? 'g' : 'm'}${String(c.month).padStart(2, '0')}.webp`;

function CardBack({ n, selected }: { n?: number; selected?: boolean }) {
  return (
    <span className={`relative block h-full w-full rounded-[8px] transition-transform ${selected ? '-translate-y-2 ring-[3px] ring-sticker' : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${IMG}back.webp`} alt="" aria-hidden className="h-full w-full rounded-[8px] shadow-[0_3px_0_rgba(0,0,0,0.4)]" />
      {n ? <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-sticker font-latin text-[13px] font-black text-ink">{n}</span> : null}
    </span>
  );
}

// 카드 그림 위에 월 숫자(그림의 빈 동그라미 자리), 띠 리본, 등급 표시를 얹는다
function CardFace({ card }: { card: Card }) {
  const st = KIND_STYLE[card.kind];
  const ribbon = card.kind === 'tti' ? (RIBBON[card.name] ?? '#d6322b') : null;
  return (
    <div className="relative h-full w-full" style={{ containerType: 'inline-size' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cardArt(card)} alt="" aria-hidden className="h-full w-full rounded-[8px] shadow-[0_3px_0_rgba(0,0,0,0.4)]" style={card.kind === 'pi' ? { filter: 'saturate(0.75)' } : undefined} />
      <span
        aria-hidden
        className="absolute grid place-items-center rounded-full font-latin font-black leading-none text-[#8a1c1c]"
        style={{ left: '5.2%', top: '3.6%', width: '19.5%', aspectRatio: '1', fontSize: '12cqw' }}
      >
        {card.month}
      </span>
      {ribbon && (
        <span aria-hidden className="absolute right-[8%] top-[12%] h-[52%] w-[10%] rounded-[2px] border border-ink/60 shadow-sm" style={{ background: ribbon }}>
          <span className="absolute inset-x-[22%] top-[8%] bottom-[8%] border-x border-white/70" />
        </span>
      )}
      <span className="absolute bottom-[3.5%] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-ink px-[6%] py-[1%] font-bold leading-tight shadow" style={{ background: st.bg, color: st.fg, fontSize: '9.5cqw' }}>
        {KIND_LABEL[card.kind]}
      </span>
    </div>
  );
}

// ---------- 총운 도장 ----------
const SEAL: Record<Grade, { shape: string; text: string; size: number }> = {
  daegil: { shape: 'circle', text: '대길', size: 92 },
  gil: { shape: 'square', text: '길', size: 84 },
  pyeong: { shape: 'diamond', text: '평', size: 82 },
  sohyung: { shape: 'octagon', text: '소흉', size: 86 },
  hyung: { shape: 'oval', text: '흉', size: 78 },
};

function Seal({ grade }: { grade: Grade }) {
  const s = SEAL[grade];
  return (
    <span aria-hidden className="absolute right-3 top-3 grid -rotate-[10deg] place-items-center opacity-90" style={{ width: s.size, height: s.size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${IMG}seal-${s.shape}.webp`} alt="" className="absolute inset-0 h-full w-full object-contain" />
      <span className="relative font-brush text-[#aa1214]" style={{ fontSize: s.size * 0.42, lineHeight: 1 }}>
        {s.text}
      </span>
    </span>
  );
}

function Icon({ name, size = 34 }: { name: string; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`${IMG}icon-${name}.webp`} alt="" aria-hidden className="shrink-0 object-contain" style={{ width: size, height: size }} />;
}

const FIELD_ICON: Record<string, string> = { 일: 'work', 재물: 'money', 사랑: 'love', 건강: 'health' };

export function HwatuFortune() {
  const [phase, setPhase] = useState<'loading' | 'intro' | 'pick' | 'result'>('loading');
  const [deck, setDeck] = useState<Card[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [fortune, setFortune] = useState<Fortune | null>(null);
  const [repeat, setRepeat] = useState(false);
  const [greeting, setGreeting] = useState(GREETINGS[0]);
  const [copied, setCopied] = useState(false);

  // 오늘 이미 점을 쳤으면 그 결과를 다시 보여 준다
  useEffect(() => {
    setGreeting(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
    try {
      const saved = localStorage.getItem(storageKey(todayKST()));
      if (saved) {
        setFortune(JSON.parse(saved) as Fortune);
        setRepeat(true);
        setPhase('result');
        return;
      }
    } catch {
      // 저장소를 못 쓰는 브라우저면 매번 새로 점친다
    }
    setPhase('intro');
  }, []);

  function start() {
    setDeck(shuffledDeck());
    setPicked([]);
    setPhase('pick');
  }

  // 빠르게 연속으로 눌러도 빠지지 않도록 이전 상태 기준으로 쌓는다
  function choose(i: number) {
    setPicked((prev) => (prev.includes(i) || prev.length >= PICK_COUNT ? prev : [...prev, i]));
  }

  // 세 장이 모이면 잠깐 뜸을 들인 뒤 점괘를 읽는다
  useEffect(() => {
    if (phase !== 'pick' || picked.length !== PICK_COUNT) return;
    const id = setTimeout(() => {
      const f = readFortune([deck[picked[0]], deck[picked[1]], deck[picked[2]]]);
      setFortune(f);
      setRepeat(false);
      setPhase('result');
      try {
        localStorage.setItem(storageKey(f.date), JSON.stringify(f));
      } catch {
        // 저장 실패는 무시
      }
    }, 800);
    return () => clearTimeout(id);
  }, [phase, picked, deck]);

  function again() {
    try {
      localStorage.removeItem(storageKey(todayKST()));
    } catch {
      // 무시
    }
    setFortune(null);
    start();
  }

  async function copy() {
    if (!fortune) return;
    const lines = [
      `🔮 신내림 넙죽이의 오늘의 화투점 (${fortune.date})`,
      ...fortune.cards.map((c) => `${c.slot}: ${c.title}`),
      `총운: ${fortune.gradeName}`,
      fortune.gradeText,
      ...fortune.fields.map((f) => `${f.label} - ${f.text}`),
      `행운: ${fortune.lucky.color} · ${fortune.lucky.number} · ${fortune.lucky.direction} · ${fortune.lucky.food}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 복사가 막힌 브라우저
    }
  }

  return (
    // 점집 배경 위에 모든 화면을 올린다
    <div
      className="relative overflow-hidden rounded-[18px] border-2 border-ink bg-[#2a2150] bg-cover bg-top p-4 shadow-[0_6px_0_rgba(0,0,0,0.25)]"
      style={{ backgroundImage: 'url(/hoegilab/hwatu-bg.webp)' }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#1a1238]/55 via-transparent to-[#1a1238]/45" />
      <div className="relative flex flex-col gap-5">
        <header className="flex flex-col items-center gap-1 pt-2 text-center">
          <h1 className="font-brush text-[64px] leading-none text-[#f6d57a] drop-shadow-[0_3px_0_rgba(0,0,0,0.55)]">화투점</h1>
          <p className="rounded-full bg-black/55 px-4 py-1.5 text-[13px] font-bold text-white">신내림 넙죽이가 세 장으로 오늘의 운을 읽어 줘요. 재미로만 보세요!</p>
        </header>

        {phase === 'intro' && (
          <section className="flex flex-col gap-4">
            <Shaman pose="greet">{greeting}</Shaman>
            <div className="rounded-[14px] border-2 border-ink bg-white p-4 text-[14px] leading-relaxed">
              <p className="font-black">점 보는 법</p>
              <ol className="mt-1 list-decimal pl-5">
                <li>엎어 놓은 패 12장 중 마음이 가는 패를 세 장 고르세요.</li>
                <li>첫 장은 오전, 둘째 장은 오후, 셋째 장은 저녁의 기운이에요.</li>
                <li>패의 달과 등급(광·열끗·띠·피)으로 하루를 읽어 드려요.</li>
              </ol>
            </div>
            <button type="button" onClick={start} className={yellowButtonClass}>
              복채 0원, 점 보러 가기
            </button>
          </section>
        )}

        {phase === 'pick' && (
          <section className="flex flex-col gap-4">
            <Shaman pose="bell">
              {picked.length < PICK_COUNT ? `마음이 가는 패 세 장을 고르거라. (${picked.length}/${PICK_COUNT})` : '좋다, 신령님께 여쭙고 있느니라… 짤랑짤랑.'}
            </Shaman>
            <div className="grid grid-cols-4 gap-3 pt-2">
              {Array.from({ length: SHOWN }, (_, i) => {
                const order = picked.indexOf(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => choose(i)}
                    aria-label={`${i + 1}번째 패${order >= 0 ? ` (${order + 1}번째로 고름)` : ''}`}
                    aria-pressed={order >= 0}
                    className="aspect-[3/4.4] w-full"
                    disabled={picked.length >= PICK_COUNT && order < 0}
                  >
                    <CardBack n={order >= 0 ? order + 1 : undefined} selected={order >= 0} />
                  </button>
                );
              })}
            </div>
            {picked.length > 0 && picked.length < PICK_COUNT && (
              <button type="button" onClick={() => setPicked([])} className="self-start rounded-full border-2 border-ink bg-white px-4 py-1.5 text-[13px] font-bold">
                다시 고르기
              </button>
            )}
          </section>
        )}

        {phase === 'result' && fortune && (
          <section className="flex flex-col gap-5">
            <Shaman pose={GRADE_POSE[fortune.grade]}>{repeat ? REPEAT_LINES[Math.floor(fortune.total % REPEAT_LINES.length)] : '자, 패가 나왔느니라. 잘 듣거라.'}</Shaman>

            {/* 세 장 */}
            <div className="grid grid-cols-3 gap-3">
              {fortune.cards.map((c, i) => (
                <div key={c.card.id} className="flex flex-col items-center gap-1.5">
                  <span className="rounded-full bg-black/45 px-3 py-0.5 text-[12px] font-black text-[#f6d57a]">{c.slot}</span>
                  <div className="card-flip aspect-[3/4.4] w-full" style={{ animationDelay: `${i * 350}ms`, animationFillMode: 'backwards' }}>
                    <CardFace card={c.card} />
                  </div>
                  <span className="text-center text-[11px] font-bold leading-tight text-white/90">{c.card.name}</span>
                </div>
              ))}
            </div>

            {fortune.cards.map((c) => (
              <article key={c.card.id} className="flex flex-col gap-1 rounded-[14px] border-2 border-ink bg-white p-4">
                <p className="text-[12px] font-black text-inkMuted">
                  {c.slot} · {c.keyword}
                </p>
                <h2 className="text-[17px] font-black">{c.title}</h2>
                <p className="text-[15px] leading-relaxed">{c.text}</p>
              </article>
            ))}

            {/* 총운 */}
            <div className="relative flex flex-col gap-1 rounded-[14px] border-2 border-ink bg-sticker p-4 pr-[110px]">
              <Seal grade={fortune.grade} />
              <p className="text-[12px] font-black">오늘의 총운</p>
              <p className="text-[28px] font-black leading-tight">{fortune.gradeName}</p>
              <p className="text-[15px] font-bold leading-relaxed">{fortune.gradeText}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {fortune.fields.map((f) => (
                <div key={f.label} className="flex items-start gap-2 rounded-[12px] border-2 border-ink bg-white p-3">
                  <Icon name={FIELD_ICON[f.label]} size={34} />
                  <div className="min-w-0">
                    <p className="text-[12px] font-black text-inkMuted">{f.label}</p>
                    <p className="text-[14px] font-bold leading-snug">{f.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-[14px] border-2 border-dashed border-ink bg-white/90 p-4">
              <p className="mb-2 text-[14px] font-black">오늘의 행운</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[14px]">
                {[
                  ['color', '색', fortune.lucky.color],
                  ['number', '숫자', String(fortune.lucky.number)],
                  ['direction', '방향', fortune.lucky.direction],
                  ['food', '음식', fortune.lucky.food],
                ].map(([icon, label, value]) => (
                  <div key={icon} className="flex items-center gap-2">
                    <Icon name={icon} size={30} />
                    <span>
                      <span className="text-[11px] text-inkMuted">{label}</span>
                      <b className="block leading-tight">{value}</b>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Shaman pose="bow">{fortune.closing}</Shaman>

            <div className="flex flex-col gap-2">
              <button type="button" onClick={copy} className={yellowButtonClass}>
                {copied ? '복사했어요!' : '점괘 복사하기'}
              </button>
              <button type="button" onClick={again} className="h-12 w-full rounded-[10px] border-2 border-ink bg-white text-[16px] font-bold">
                복채 한 번 더 내고 다시 점치기
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
