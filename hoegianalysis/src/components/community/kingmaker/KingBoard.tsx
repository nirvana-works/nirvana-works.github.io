'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CAMPUS_H, CAMPUS_W, CELLS, HEX_R, ZONES } from '@/lib/kingmakerCampus';
import { COMMENT_LIMIT, NAME_LIMIT, STANCES, STANCE_LABEL, groupOf, tally, type Meta, type Person, type Stance } from '@/lib/kingmakerTypes';

// 방송 개표 화면처럼: 득표판, 과반 막대, 캠퍼스 위의 육각 칸 지도, 속보 자막.
// 파랑=우리 후보 지지, 빨강=반대(상대측), 노랑=중도, 회청색=아직 분류 안 함

const C = {
  navy: '#0A1F44',
  panel: 'rgba(255,255,255,0.06)',
  line: 'rgba(255,255,255,0.16)',
};
const FILL: Record<Stance | 'unset', { a: string; b: string; side: string; text: string }> = {
  for: { a: '#5B82FF', b: '#2447D6', side: '#1A33A0', text: '#fff' },
  neutral: { a: '#FFD84D', b: '#E0A800', side: '#A87D00', text: '#1a1a1f' },
  against: { a: '#EF6A5C', b: '#C0302A', side: '#8A1F1B', text: '#fff' },
  unset: { a: '#B6BECF', b: '#7B8598', side: '#566074', text: '#14171f' },
};

type Filter = 'all' | Stance | 'unset' | 'excluded';

async function call(url: string, method: string, body?: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).catch(() => null);
  if (!res) return { ok: false, data: { error: '네트워크 오류예요.' } };
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, data };
}

// 같은 그룹끼리 모으고, 그룹 안에서는 가나다 순. 캠퍼스 칸은 구역 순서대로 이 차례로 채운다
function orderPeople(people: Person[]): Person[] {
  const g = new Map<string, Person[]>();
  for (const p of people) g.set(groupOf(p), [...(g.get(groupOf(p)) ?? []), p]);
  const names = [...g.keys()].sort((a, b) => (a === '기타' ? 1 : b === '기타' ? -1 : (g.get(b)?.length ?? 0) - (g.get(a)?.length ?? 0) || a.localeCompare(b, 'ko')));
  return names.flatMap((n) => (g.get(n) ?? []).slice().sort((x, y) => x.name.localeCompare(y.name, 'ko')));
}

function hexPoints(x: number, y: number, r: number): string {
  return [0, 1, 2, 3, 4, 5].map((k) => `${(x + r * Math.cos(((60 * k + 30) * Math.PI) / 180)).toFixed(1)},${(y + r * Math.sin(((60 * k + 30) * Math.PI) / 180)).toFixed(1)}`).join(' ');
}

function Avatar({ tone }: { tone: 'blue' | 'red' }) {
  return (
    <svg viewBox="0 0 48 48" className="h-11 w-11 shrink-0" aria-hidden>
      <circle cx="24" cy="24" r="23" fill={tone === 'blue' ? '#1B3BB5' : '#8F1F19'} stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
      <circle cx="24" cy="19" r="8" fill="rgba(255,255,255,0.75)" />
      <path d="M8 41c2-9 9-13 16-13s14 4 16 13" fill="rgba(255,255,255,0.75)" />
    </svg>
  );
}

export function KingBoard({ initialPeople, initialMeta }: { initialPeople: Person[]; initialMeta: Meta }) {
  const router = useRouter();
  const [people, setPeople] = useState(initialPeople);
  const [meta, setMeta] = useState(initialMeta);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [newName, setNewName] = useState('');
  const [paste, setPaste] = useState('');
  const [last, setLast] = useState('');
  const [tick, setTick] = useState(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const scroller = useRef<HTMLDivElement>(null);

  const t = useMemo(() => tally(people), [people]);
  const cand = meta.candidate.trim() || '우리 후보';
  const opp = meta.opponent.trim() || '상대 후보';
  const sel = people.find((p) => p.id === selId) ?? null;

  useEffect(() => {
    const iv = setInterval(() => setTick((n) => n + 1), 4500);
    return () => clearInterval(iv);
  }, []);

  // 좁은 화면에서는 지도를 가운데로
  useEffect(() => {
    const el = scroller.current;
    if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, []);

  function say(msg: string) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  }

  // 화면을 먼저 바꾸고 서버에 저장한다. 실패하면 되돌린다
  async function patch(id: string, change: Partial<Pick<Person, 'stance' | 'comment' | 'excluded'>>) {
    const before = people.find((p) => p.id === id);
    if (!before) return;
    setPeople((list) => list.map((p) => (p.id === id ? { ...p, ...change } : p)));
    if ('stance' in change) setLast(change.stance ? `${before.name}님이 ${STANCE_LABEL[change.stance]}로 분류됐어요` : `${before.name}님의 분류를 취소했어요`);
    const r = await call(`/api/kingmaker/people/${id}`, 'PATCH', change);
    if (!r.ok) {
      setPeople((list) => list.map((p) => (p.id === id ? before : p)));
      say(String(r.data.error ?? '저장하지 못했어요.'));
      if (r.data.error === '로그인이 필요해요.') router.refresh();
    }
  }

  async function saveMeta(next: Meta) {
    const r = await call('/api/kingmaker/meta', 'PUT', next);
    if (!r.ok) say(String(r.data.error ?? '저장하지 못했어요.'));
  }

  async function reload() {
    const again = await call('/api/kingmaker', 'GET');
    if (again.ok) setPeople(again.data.people as Person[]);
  }

  async function addPerson(e: React.FormEvent) {
    e.preventDefault();
    const r = await call('/api/kingmaker/people', 'POST', { name: newName });
    if (!r.ok) return say(String(r.data.error ?? '추가하지 못했어요.'));
    setNewName('');
    await reload();
  }

  async function importList() {
    const r = await call('/api/kingmaker/import', 'POST', { text: paste });
    if (!r.ok) return say(String(r.data.error ?? '가져오지 못했어요.'));
    say(`${r.data.added}명을 가져왔어요${r.data.skipped ? ` (이미 있는 ${r.data.skipped}명은 건너뜀)` : ''}.`);
    setPaste('');
    await reload();
  }

  async function removePerson(p: Person) {
    if (!window.confirm(`${p.name}님을 명단에서 지울까요?`)) return;
    const r = await call(`/api/kingmaker/people/${p.id}`, 'DELETE');
    if (r.ok) {
      setPeople((list) => list.filter((x) => x.id !== p.id));
      setSelId(null);
    } else say(String(r.data.error ?? '지우지 못했어요.'));
  }

  async function copyAll() {
    const tsv = people.map((p) => [p.name, p.tags.join(','), p.stance ? STANCE_LABEL[p.stance] : '', p.comment, p.excluded ? '제외' : ''].join('\t')).join('\n');
    try {
      await navigator.clipboard.writeText(tsv);
      say('명단을 복사했어요. (백업용)');
    } catch {
      say('복사가 막힌 브라우저예요.');
    }
  }

  async function logout() {
    await call('/api/kingmaker/login', 'DELETE');
    router.refresh();
  }

  function jumpTo(id: string) {
    setFilter('all');
    setQuery('');
    setFocusId(id);
    setTimeout(() => document.getElementById(`kp-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
    setTimeout(() => setFocusId((cur) => (cur === id ? null : cur)), 2200);
  }

  // ---------- 캠퍼스 칸 배치 ----------
  const ordered = useMemo(() => orderPeople(people), [people]);
  const dxHex = Math.sqrt(3) * HEX_R * 1.05;
  const perRow = Math.max(1, Math.floor((CAMPUS_W - 40) / dxHex));
  const placed = useMemo(
    () =>
      ordered.map((p, i) => {
        if (i < CELLS.length) return { p, x: CELLS[i].x, y: CELLS[i].y };
        const j = i - CELLS.length; // 칸이 모자라면 캠퍼스 아래에 줄지어 놓는다
        return { p, x: 30 + (j % perRow) * dxHex + (Math.floor(j / perRow) % 2 ? dxHex / 2 : 0), y: CAMPUS_H + 30 + Math.floor(j / perRow) * HEX_R * 1.6 };
      }),
    [ordered, dxHex, perRow],
  );
  const extraRows = Math.max(0, Math.ceil((ordered.length - CELLS.length) / perRow));
  const viewH = CAMPUS_H + (extraRows ? 30 + extraRows * HEX_R * 1.6 : 0);
  const emptyCells = CELLS.slice(Math.min(ordered.length, CELLS.length));
  // 그룹 이름표는 그 그룹의 첫 칸 바로 위에 붙인다
  const groupLabels = useMemo(() => {
    const m = new Map<string, { x: number; y: number; n: number }>();
    for (const q of placed) {
      const g = groupOf(q.p);
      if (g === '기타') continue;
      const cur = m.get(g);
      m.set(g, cur ? { ...cur, n: cur.n + 1 } : { x: q.x, y: q.y, n: 1 });
    }
    return [...m.entries()].filter(([, v]) => v.n >= 2).map(([g, v]) => ({ g, x: v.x, y: v.y }));
  }, [placed]);
  const selPos = sel ? placed.find((q) => q.p.id === sel.id) : null;

  const shown = people.filter((p) => {
    if (query && !p.name.includes(query.trim()) && !p.comment.includes(query.trim()) && !p.tags.some((x) => x.includes(query.trim()))) return false;
    if (filter === 'all') return true;
    if (filter === 'excluded') return p.excluded;
    if (p.excluded) return false;
    return filter === 'unset' ? p.stance === null : p.stance === filter;
  });

  // ---------- 판세 ----------
  const reach = t.for + t.neutral;
  let verdict = '';
  if (t.total === 0) verdict = '아직 명단이 없어요. 아래에서 명단을 가져오세요.';
  else if (t.for >= t.majority) verdict = `과반 확보! 지금 투표하면 ${cand} 당선권이에요.`;
  else if (reach >= t.majority) verdict = `접전이에요. 과반까지 ${t.majority - t.for}표 모자라요. 중도 ${t.neutral}명 중 ${t.majority - t.for}명만 잡아도 넘어요.`;
  else verdict = `아직 열세예요. 과반까지 ${t.majority - t.for}표가 더 필요해요. 설득할 사람은 중도 ${t.neutral}명, 미분류 ${t.unset}명이에요.`;
  const pct = (n: number) => (t.total ? (n / t.total) * 100 : 0);
  const counted = t.for + t.neutral + t.against;
  const winning = t.total > 0 && t.for >= t.majority;

  const groupStats = useMemo(() => {
    const m = new Map<string, Person[]>();
    for (const p of people) m.set(groupOf(p), [...(m.get(groupOf(p)) ?? []), p]);
    return [...m.entries()].filter(([g]) => g !== '기타').map(([g, list]) => ({ g, ...tally(list) }));
  }, [people]);
  const ticker = [
    last || `${cand} ${t.for}표 · 과반까지 ${Math.max(0, t.majority - t.for)}표`,
    verdict,
    ...groupStats.slice(0, 3).map((s) => `${s.g}: 지지 ${s.for} · 중도 ${s.neutral} · 반대 ${s.against} / ${s.total}명`),
    `개표율 ${t.total ? Math.round((counted / t.total) * 100) : 0}% · 미분류 ${t.unset}명`,
  ];
  const tickerText = ticker[tick % ticker.length];

  const glass = { background: C.panel, border: `1px solid ${C.line}` };

  return (
    <div className="flex flex-col gap-3 rounded-[18px] p-3 text-white sm:p-4" style={{ background: `radial-gradient(120% 60% at 50% 0%, #17306b 0%, ${C.navy} 55%, #07142e 100%)` }}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-bold text-white/60">🔒 비밀 페이지 · 암호로만 들어와요</p>
        <button type="button" onClick={logout} className="text-[12px] text-white/70 underline">
          나가기
        </button>
      </div>

      {/* 득표판 */}
      <section aria-label="후보" className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-2">
        <div className="rounded-[14px] p-3" style={{ background: 'linear-gradient(160deg,#3563FF,#1B3FC4)', boxShadow: '0 6px 0 #14297f, inset 0 0 0 1px rgba(255,255,255,0.25)' }}>
          <div className="flex items-center gap-2">
            <Avatar tone="blue" />
            <label className="min-w-0 flex-1 text-[10px] font-bold uppercase tracking-wider text-white/70">
              우리 후보
              <input
                value={meta.candidate}
                maxLength={NAME_LIMIT}
                onChange={(e) => setMeta({ ...meta, candidate: e.target.value })}
                onBlur={() => saveMeta(meta)}
                className="mt-0.5 block w-full min-w-0 border-b border-white/40 bg-transparent text-[18px] font-black text-white focus:border-white focus:outline-none"
              />
            </label>
          </div>
          <div className="mt-2 font-latin text-[56px] font-black leading-none tabular-nums" style={{ textShadow: '0 3px 0 rgba(0,0,0,0.3)' }}>
            {t.for}
          </div>
          <div className="text-[11px] font-bold text-white/70">지지</div>
        </div>
        <div className="flex items-center">
          <span className="rounded-[8px] border border-white/30 bg-white/10 px-2 py-1 font-latin text-[15px] font-black">VS</span>
        </div>
        <div className="rounded-[14px] p-3" style={{ background: 'linear-gradient(200deg,#E5483A,#A8261E)', boxShadow: '0 6px 0 #6e1713, inset 0 0 0 1px rgba(255,255,255,0.25)' }}>
          <div className="flex items-center gap-2">
            <Avatar tone="red" />
            <label className="min-w-0 flex-1 text-[10px] font-bold uppercase tracking-wider text-white/70">
              상대 후보
              <input
                value={meta.opponent}
                maxLength={NAME_LIMIT}
                placeholder="나중에 입력"
                onChange={(e) => setMeta({ ...meta, opponent: e.target.value })}
                onBlur={() => saveMeta(meta)}
                className="mt-0.5 block w-full min-w-0 border-b border-white/40 bg-transparent text-[18px] font-black text-white placeholder:font-normal placeholder:text-white/40 focus:border-white focus:outline-none"
              />
            </label>
          </div>
          <div className="mt-2 font-latin text-[56px] font-black leading-none tabular-nums" style={{ textShadow: '0 3px 0 rgba(0,0,0,0.3)' }}>
            {t.against}
          </div>
          <div className="text-[11px] font-bold text-white/70">{meta.opponent.trim() ? `${opp}측 (반대)` : '반대'}</div>
        </div>
      </section>

      {/* 과반 막대 */}
      <section aria-label="판세" className="rounded-[14px] p-3" style={glass}>
        <div className="mb-3 flex items-end justify-between gap-2">
          <h2 className="text-[14px] font-black tracking-wide">과반까지의 길</h2>
          <span className="rounded-[6px] bg-white/10 px-2 py-0.5 font-latin text-[12px] font-bold">개표율 {t.total ? Math.round((counted / t.total) * 100) : 0}%</span>
        </div>
        <div className="relative pt-7">
          <div className="flex h-9 overflow-hidden rounded-[8px] border border-white/30">
            {(
              [
                ['for', t.for],
                ['neutral', t.neutral],
                ['unset', t.unset],
                ['against', t.against],
              ] as const
            ).map(([k, n]) => (
              <div key={k} style={{ width: `${pct(n)}%`, background: `linear-gradient(180deg, ${FILL[k].a}, ${FILL[k].b})`, color: FILL[k].text }} className="flex items-center justify-center font-latin text-[14px] font-black">
                {pct(n) > 6 ? n : ''}
              </div>
            ))}
          </div>
          {t.total > 0 && (
            <div aria-hidden className="pointer-events-none absolute bottom-[-6px] top-2 border-l-[3px] border-dashed border-white" style={{ left: `${pct(t.majority)}%` }}>
              <span className="absolute -top-0 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[6px] bg-white px-2 py-0.5 text-[11px] font-black text-[#0A1F44]">과반 {t.majority}</span>
            </div>
          )}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5 text-center text-[11px] font-bold">
          {(
            [
              ['for', '지지', t.for],
              ['neutral', '중도', t.neutral],
              ['unset', '미분류', t.unset],
              ['against', '반대', t.against],
            ] as const
          ).map(([k, label, n]) => (
            <div key={k} className="rounded-[8px] py-1.5" style={{ background: `linear-gradient(180deg, ${FILL[k].a}, ${FILL[k].b})`, color: FILL[k].text }}>
              <div className="font-latin text-[20px] font-black leading-none">{n}</div>
              <div className="mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 판세 해설 */}
      <section aria-label="판세 해설" className="rounded-[14px] p-3" style={glass}>
        <h2 className="text-[14px] font-black tracking-wide">판세 해설</h2>
        <p role="status" className="mt-1.5 text-[14px] font-bold leading-snug">
          {verdict}
        </p>
        <p className="mt-1 text-[12px] text-white/60">
          집계 대상 {t.total}명 · 제외 {t.excluded}명 · 지지+중도 {reach}명 · 과반은 {t.majority}표
        </p>
        {groupStats.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1 text-[12px] text-white/80">
            {groupStats.map((s) => (
              <li key={s.g} className="flex justify-between gap-2">
                <span className="font-bold">{s.g}</span>
                <span className="font-latin">
                  지지 {s.for} · 중도 {s.neutral} · 반대 {s.against} / {s.total}명
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 캠퍼스 지도 */}
      <section aria-label="세력 지도" className="relative rounded-[14px] p-3" style={glass}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[14px] font-black tracking-wide">세력 지도 · 캠퍼스</h2>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/75" aria-label="범례">
            {(['for', 'neutral', 'against', 'unset'] as const).map((k) => (
              <li key={k} className="flex items-center gap-1">
                <span aria-hidden className="inline-block h-2.5 w-2.5 rotate-45 rounded-[2px]" style={{ background: FILL[k].b }} />
                {k === 'unset' ? '미분류' : STANCE_LABEL[k]}
              </li>
            ))}
          </ul>
        </div>
        {winning && (
          <div className="absolute right-3 top-10 z-10 flex items-center gap-1.5 rounded-[8px] border border-[#d9b14a] bg-[#0f2a66]/90 px-2 py-1 text-[11px] font-black text-[#f3d27a]">
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path d="M12 2l8 3v6c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V5z" fill="#2447D6" stroke="#f3d27a" strokeWidth="1.6" />
              <path d="M8 12l3 3 5-6" fill="none" stroke="#f3d27a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            당선 유력
          </div>
        )}
        <div ref={scroller} className="overflow-x-auto">
          <div className="relative min-w-[520px]">
            <svg viewBox={`0 0 ${CAMPUS_W} ${viewH}`} className="block w-full select-none" role="group" aria-label="캠퍼스 위의 사람 칸">
              <defs>
                {(['for', 'neutral', 'against', 'unset'] as const).map((k) => (
                  <linearGradient key={k} id={`kg-${k}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={FILL[k].a} />
                    <stop offset="1" stopColor={FILL[k].b} />
                  </linearGradient>
                ))}
              </defs>
              {ZONES.map((z) => (
                <path key={z.id} d={z.d} fill="rgba(120,160,255,0.07)" stroke="rgba(150,185,255,0.45)" strokeWidth={1.4} fillRule="evenodd" />
              ))}
              {emptyCells.map((c, i) => (
                <polygon key={`e${i}`} points={hexPoints(c.x, c.y, HEX_R * 0.88)} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="3 3" />
              ))}
              {placed.map(({ p, x, y }) => {
                const k: Stance | 'unset' = p.stance ?? 'unset';
                const f = FILL[k];
                const on = selId === p.id;
                return (
                  <g
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${p.name} ${p.excluded ? '제외' : p.stance ? STANCE_LABEL[p.stance] : '미분류'}`}
                    onClick={() => setSelId(on ? null : p.id)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelId(on ? null : p.id)}
                    style={{ cursor: 'pointer', opacity: p.excluded ? 0.35 : 1, filter: on ? 'drop-shadow(0 0 5px #9fe3ff)' : undefined }}
                  >
                    <polygon points={hexPoints(x, y + 3.5, HEX_R * 0.9)} fill={f.side} />
                    <polygon points={hexPoints(x, y, HEX_R * 0.9)} fill={`url(#kg-${k})`} stroke={on ? '#ffffff' : 'rgba(255,255,255,0.45)'} strokeWidth={on ? 2.6 : 1} />
                    <text x={x} y={y + HEX_R * 0.27} textAnchor="middle" fontSize={HEX_R * 0.78} fontWeight={800} fill={f.text} style={{ pointerEvents: 'none' }}>
                      {p.name.slice(0, 1)}
                    </text>
                  </g>
                );
              })}
              {groupLabels.map((l) => (
                <g key={l.g} pointerEvents="none">
                  <rect x={l.x - 22} y={l.y - HEX_R * 1.95} width={44} height={17} rx={4} fill="rgba(10,31,68,0.9)" stroke="rgba(255,255,255,0.55)" strokeWidth={1} />
                  <text x={l.x} y={l.y - HEX_R * 1.95 + 12} textAnchor="middle" fontSize={11} fontWeight={800} fill="#fff">
                    {l.g}
                  </text>
                </g>
              ))}
            </svg>

            {/* 칸을 누르면 뜨는 말풍선: 바로 분류하고 코멘트를 남긴다 */}
            {sel && selPos && (
              <div
                className="absolute z-20 w-[250px] rounded-[12px] border border-white/40 bg-[#0d2557]/95 p-3 shadow-xl"
                style={{
                  left: `${Math.min(86, Math.max(14, (selPos.x / CAMPUS_W) * 100))}%`,
                  top: `${(selPos.y / viewH) * 100}%`,
                  transform: selPos.y / viewH < 0.3 ? 'translate(-50%, 18px)' : 'translate(-50%, calc(-100% - 20px))',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-black">{sel.name}</p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {sel.tags.map((x) => (
                        <span key={x} className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-bold">
                          {x}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button type="button" onClick={() => setSelId(null)} aria-label="닫기" className="px-1 text-[18px] leading-none text-white/70">
                    ×
                  </button>
                </div>
                <div className="mt-2 flex gap-1.5">
                  {STANCES.map((s) => {
                    const on = sel.stance === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={on}
                        onClick={() => patch(sel.id, { stance: on ? null : s })}
                        className="h-9 flex-1 rounded-[8px] text-[13px] font-black"
                        style={on ? { background: `linear-gradient(180deg, ${FILL[s].a}, ${FILL[s].b})`, color: FILL[s].text } : { background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                      >
                        {STANCE_LABEL[s]}
                      </button>
                    );
                  })}
                </div>
                <input
                  key={`${sel.id}-${sel.comment}`}
                  defaultValue={sel.comment}
                  maxLength={COMMENT_LIMIT}
                  placeholder="한 줄 코멘트"
                  aria-label={`${sel.name} 코멘트`}
                  onBlur={(e) => e.target.value.trim() !== sel.comment && patch(sel.id, { comment: e.target.value.trim() })}
                  onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                  className="mt-2 h-9 w-full rounded-[8px] border border-white/30 bg-white/10 px-2 text-[13px] text-white placeholder:text-white/40 focus:border-white focus:outline-none"
                />
                <div className="mt-2 flex items-center justify-between text-[12px]">
                  <label className="flex items-center gap-1 font-bold">
                    <input type="checkbox" checked={sel.excluded} onChange={(e) => patch(sel.id, { excluded: e.target.checked })} className="h-4 w-4" />
                    제외
                  </label>
                  <button type="button" onClick={() => jumpTo(sel.id)} className="underline">
                    명단에서 보기
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="mt-1.5 text-[11px] text-white/50">같은 그룹끼리 가까이, 그 안에서는 가나다 순으로 놓여요. 칸을 누르면 바로 분류할 수 있어요. 좁은 화면에선 좌우로 밀어 보세요.</p>
      </section>

      {/* 속보 자막 */}
      <div className="flex overflow-hidden rounded-[8px] border border-white/25" aria-live="polite">
        <span className="flex shrink-0 items-center bg-[#D63C2F] px-3 text-[12px] font-black tracking-wide">
          <span className="font-latin text-[10px] opacity-80">BREAKING&nbsp;</span>속보
        </span>
        <p key={tick} className="min-w-0 flex-1 truncate bg-[#102a63] px-3 py-2.5 text-[13px] font-bold">
          {tickerText}
        </p>
      </div>

      {/* 명단 */}
      <section aria-label="명단" className="mt-1 flex flex-col gap-3">
        <h2 className="text-[16px] font-black">명단 ({shown.length}명)</h2>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['all', '전체'],
              ['for', '지지'],
              ['neutral', '중도'],
              ['against', '반대'],
              ['unset', '미분류'],
              ['excluded', '제외'],
            ] as [Filter, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              aria-pressed={filter === k}
              className={`h-9 rounded-full border px-3.5 text-[13px] font-bold ${filter === k ? 'border-white bg-white text-[#0A1F44]' : 'border-white/30 bg-white/5 text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름·코멘트·조 검색"
          aria-label="검색"
          className="h-11 w-full rounded-[10px] border border-white/30 bg-white/10 px-3 text-[15px] text-white placeholder:text-white/40 focus:border-white focus:outline-none"
        />

        <ul className="flex flex-col gap-2">
          {shown.map((p) => (
            <li
              key={p.id}
              id={`kp-${p.id}`}
              className={`rounded-[12px] p-3 transition-shadow ${p.excluded ? 'opacity-55' : ''} ${focusId === p.id ? 'shadow-[0_0_0_3px_#F2B705]' : ''}`}
              style={glass}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="text-[16px] font-black">{p.name}</span>
                  {p.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-bold">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  {STANCES.map((s) => {
                    const on = p.stance === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={on}
                        onClick={() => patch(p.id, { stance: on ? null : s })}
                        className="h-10 min-w-[54px] rounded-[8px] px-2 text-[14px] font-black"
                        style={on ? { background: `linear-gradient(180deg, ${FILL[s].a}, ${FILL[s].b})`, color: FILL[s].text } : { background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                      >
                        {STANCE_LABEL[s]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  key={`${p.id}-${p.comment}`}
                  defaultValue={p.comment}
                  maxLength={COMMENT_LIMIT}
                  placeholder="한 줄 코멘트 (예: 3조, 골프 좋아함)"
                  aria-label={`${p.name} 코멘트`}
                  onBlur={(e) => e.target.value.trim() !== p.comment && patch(p.id, { comment: e.target.value.trim() })}
                  onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                  className="h-10 min-w-0 flex-1 rounded-[8px] border border-white/25 bg-white/5 px-2.5 text-[14px] text-white placeholder:text-white/35 focus:border-white focus:outline-none"
                />
                <label className="flex shrink-0 items-center gap-1 text-[12px] font-bold">
                  <input type="checkbox" checked={p.excluded} onChange={(e) => patch(p.id, { excluded: e.target.checked })} className="h-4 w-4" />
                  제외
                </label>
                <button type="button" onClick={() => removePerson(p)} aria-label={`${p.name} 지우기`} className="shrink-0 px-1 text-[16px] text-white/40 hover:text-[#ff8a80]">
                  ×
                </button>
              </div>
            </li>
          ))}
          {shown.length === 0 && <li className="rounded-[12px] border border-dashed border-white/30 p-6 text-center text-[14px] text-white/60">해당하는 사람이 없어요.</li>}
        </ul>

        <form onSubmit={addPerson} className="flex gap-2" noValidate>
          <input
            value={newName}
            maxLength={NAME_LIMIT}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="사람 추가 (이름)"
            aria-label="추가할 이름"
            className="h-11 min-w-0 flex-1 rounded-[10px] border border-white/30 bg-white/10 px-3 text-[15px] text-white placeholder:text-white/40 focus:border-white focus:outline-none"
          />
          <button type="submit" className="h-11 shrink-0 rounded-[10px] bg-[#F2B705] px-5 text-[15px] font-black text-[#0A1F44]">
            추가
          </button>
        </form>
      </section>

      {/* 가져오기·백업 */}
      <details className="rounded-[12px] p-3" style={glass}>
        <summary className="cursor-pointer text-[14px] font-bold">명단 가져오기 · 백업</summary>
        <p className="mt-2 text-[12px] leading-relaxed text-white/65">
          엑셀에서 열을 <b>이름 · 태그(조·모임, 쉼표) · 입장(지지/중도/반대) · 코멘트 · 제외(제외라고 쓰면)</b> 순서로 복사해서 붙여 넣으세요. 이미 있는 이름은 건드리지 않고 새 이름만 추가해요.
        </p>
        <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={5} placeholder={'홍길동\t3조\t지지\t골프 좋아함'} className="mt-2 w-full rounded-[8px] border border-white/30 bg-white/10 p-2 font-mono text-[13px] text-white placeholder:text-white/35" />
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={importList} disabled={!paste.trim()} className="h-10 rounded-[8px] bg-[#F2B705] px-4 text-[14px] font-black text-[#0A1F44] disabled:opacity-40">
            가져오기
          </button>
          <button type="button" onClick={copyAll} className="h-10 rounded-[8px] border border-white/40 px-4 text-[14px] font-bold">
            지금 명단 복사 (백업)
          </button>
        </div>
      </details>

      {toast && (
        <div role="status" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-[420px] rounded-[10px] border border-white/40 bg-[#0A1F44] px-4 py-3 text-center text-[14px] font-bold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
