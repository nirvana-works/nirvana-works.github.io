'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { COMMENT_LIMIT, NAME_LIMIT, STANCES, STANCE_LABEL, groupOf, tally, type Meta, type Person, type Stance } from '@/lib/kingmakerTypes';
import { fieldClass } from '../formStyles';

const COLOR: Record<Stance | 'unset', { bg: string; fg: string }> = {
  for: { bg: '#2B50E6', fg: '#ffffff' },
  neutral: { bg: '#F2D80E', fg: '#14171f' },
  against: { bg: '#c8322b', fg: '#ffffff' },
  unset: { bg: '#e4e8c4', fg: '#14171f' },
};

type Filter = 'all' | Stance | 'unset' | 'excluded';

async function call(url: string, method: string, body?: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).catch(() => null);
  if (!res) return { ok: false, data: { error: '네트워크 오류예요.' } };
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, data };
}

export function KingBoard({ initialPeople, initialMeta }: { initialPeople: Person[]; initialMeta: Meta }) {
  const router = useRouter();
  const [people, setPeople] = useState(initialPeople);
  const [meta, setMeta] = useState(initialMeta);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [newName, setNewName] = useState('');
  const [paste, setPaste] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const t = useMemo(() => tally(people), [people]);
  const cand = meta.candidate.trim() || '우리 후보';
  const opp = meta.opponent.trim() || '상대 후보';

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

  async function addPerson(e: React.FormEvent) {
    e.preventDefault();
    const r = await call('/api/kingmaker/people', 'POST', { name: newName });
    if (!r.ok) return say(String(r.data.error ?? '추가하지 못했어요.'));
    setNewName('');
    router.refresh();
    const again = await call('/api/kingmaker', 'GET');
    if (again.ok) setPeople(again.data.people as Person[]);
  }

  async function importList() {
    const r = await call('/api/kingmaker/import', 'POST', { text: paste });
    if (!r.ok) return say(String(r.data.error ?? '가져오지 못했어요.'));
    say(`${r.data.added}명을 가져왔어요${r.data.skipped ? ` (이미 있는 ${r.data.skipped}명은 건너뜀)` : ''}.`);
    setPaste('');
    const again = await call('/api/kingmaker', 'GET');
    if (again.ok) setPeople(again.data.people as Person[]);
  }

  async function removePerson(p: Person) {
    if (!window.confirm(`${p.name}님을 명단에서 지울까요?`)) return;
    const r = await call(`/api/kingmaker/people/${p.id}`, 'DELETE');
    if (r.ok) setPeople((list) => list.filter((x) => x.id !== p.id));
    else say(String(r.data.error ?? '지우지 못했어요.'));
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

  // 지도: 묶음(조·모임)별로 사람 칸을 모아 보인다
  const groups = useMemo(() => {
    const m = new Map<string, Person[]>();
    for (const p of people) m.set(groupOf(p), [...(m.get(groupOf(p)) ?? []), p]);
    return [...m.entries()].sort((a, b) => (a[0] === '기타' ? 1 : b[0] === '기타' ? -1 : b[1].length - a[1].length));
  }, [people]);

  const shown = people.filter((p) => {
    if (query && !p.name.includes(query.trim()) && !p.comment.includes(query.trim()) && !p.tags.some((x) => x.includes(query.trim()))) return false;
    if (filter === 'all') return true;
    if (filter === 'excluded') return p.excluded;
    if (p.excluded) return false;
    return filter === 'unset' ? p.stance === null : p.stance === filter;
  });

  // 판세 한 줄 요약
  const reach = t.for + t.neutral;
  let verdict = '';
  if (t.total === 0) verdict = '아직 명단이 없어요. 아래에서 명단을 가져오세요.';
  else if (t.for >= t.majority) verdict = `과반 확보! 지금 투표하면 ${cand} 당선권이에요. (지지 ${t.for} / 과반 ${t.majority})`;
  else if (reach >= t.majority) verdict = `접전이에요. 과반까지 ${t.majority - t.for}표 모자라요. 중도 ${t.neutral}명 중 ${t.majority - t.for}명만 잡아도 넘어요.`;
  else verdict = `아직 열세예요. 과반까지 ${t.majority - t.for}표가 더 필요해요. 설득할 사람은 중도 ${t.neutral}명, 미분류 ${t.unset}명이에요.`;

  const pct = (n: number) => (t.total ? (n / t.total) * 100 : 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-bold text-inkMuted">🔒 비밀 페이지 · 이 주소를 아는 사람만 암호로 들어와요</p>
        <button type="button" onClick={logout} className="text-[13px] underline">
          나가기
        </button>
      </div>

      {/* 후보 */}
      <section aria-label="후보" className="rounded-[14px] border-2 border-ink bg-white p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
          <label className="flex flex-col gap-1 text-[12px] font-bold" style={{ color: COLOR.for.bg }}>
            우리 후보
            <input
              value={meta.candidate}
              maxLength={NAME_LIMIT}
              onChange={(e) => setMeta({ ...meta, candidate: e.target.value })}
              onBlur={() => saveMeta(meta)}
              className="h-11 w-full min-w-0 rounded-[8px] border-2 border-ink px-2 text-[17px] font-black text-ink"
            />
          </label>
          <span className="pb-2 font-latin text-[15px] font-black">VS</span>
          <label className="flex flex-col gap-1 text-[12px] font-bold" style={{ color: COLOR.against.bg }}>
            상대 후보
            <input
              value={meta.opponent}
              maxLength={NAME_LIMIT}
              placeholder="나중에 입력"
              onChange={(e) => setMeta({ ...meta, opponent: e.target.value })}
              onBlur={() => saveMeta(meta)}
              className="h-11 w-full min-w-0 rounded-[8px] border-2 border-ink px-2 text-[17px] font-black text-ink placeholder:font-normal placeholder:text-ink/35"
            />
          </label>
        </div>

        {/* 과반선이 있는 막대 */}
        <div className="relative mt-7">
          <div className="flex h-9 overflow-hidden rounded-[8px] border-2 border-ink">
            {(
              [
                ['for', t.for],
                ['neutral', t.neutral],
                ['unset', t.unset],
                ['against', t.against],
              ] as const
            ).map(([k, n]) => (
              <div key={k} style={{ width: `${pct(n)}%`, background: COLOR[k].bg, color: COLOR[k].fg }} className="flex items-center justify-center text-[13px] font-black">
                {pct(n) > 6 ? n : ''}
              </div>
            ))}
          </div>
          {t.total > 0 && (
            <div aria-hidden className="pointer-events-none absolute -top-2 bottom-[-8px] border-l-[3px] border-dashed border-ink" style={{ left: `${pct(t.majority)}%` }}>
              <span className="absolute -top-4 left-1 whitespace-nowrap font-latin text-[11px] font-bold">과반 {t.majority}</span>
            </div>
          )}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {(
            [
              ['for', `${cand} 지지`, t.for],
              ['neutral', '중도', t.neutral],
              ['unset', '미분류', t.unset],
              ['against', meta.opponent.trim() ? `${opp}측(반대)` : '반대', t.against],
            ] as const
          ).map(([k, label, n]) => (
            <div key={k} className="rounded-[8px] border-2 border-ink py-1.5" style={{ background: COLOR[k].bg, color: COLOR[k].fg }}>
              <div className="font-latin text-[22px] font-black leading-none">{n}</div>
              <div className="mt-0.5 truncate px-1 text-[11px] font-bold">{label}</div>
            </div>
          ))}
        </div>
        <p role="status" className="mt-3 text-[14px] font-bold leading-snug">
          {verdict}
        </p>
        <p className="mt-1 text-[12px] text-inkMuted">
          집계 대상 {t.total}명 · 제외 {t.excluded}명 · 지지+중도 {reach}명 · 과반은 {t.majority}표
        </p>
      </section>

      {/* 세력 지도 */}
      <section aria-label="세력 지도" className="rounded-[14px] border-2 border-ink bg-ink p-4 text-white">
        <h2 className="text-[18px] font-black">세력 지도</h2>
        <p className="mb-3 text-[12px] text-white/70">칸 하나가 한 사람이에요. 누르면 아래 명단의 그 사람으로 이동해요.</p>
        <div className="flex flex-col gap-4">
          {groups.map(([name, list]) => {
            const gt = tally(list);
            return (
              <div key={name}>
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[14px] font-black">
                    {name} <span className="font-latin text-[12px] font-semibold text-white/60">{list.length}명</span>
                  </span>
                  <span className="font-latin text-[12px] font-semibold text-white/70">
                    지지 {gt.for} · 중도 {gt.neutral} · 반대 {gt.against}
                  </span>
                </div>
                <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(54px, 1fr))' }}>
                  {list.map((p) => {
                    const c = COLOR[p.stance ?? 'unset'];
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => jumpTo(p.id)}
                        title={`${p.name}${p.stance ? ` · ${STANCE_LABEL[p.stance]}` : ''}${p.comment ? ` · ${p.comment}` : ''}`}
                        aria-label={`${p.name} ${p.excluded ? '제외' : p.stance ? STANCE_LABEL[p.stance] : '미분류'}`}
                        className={`flex h-11 items-center justify-center rounded-[6px] px-0.5 text-[12px] font-black leading-tight ${p.excluded ? 'border-2 border-dashed border-white/40 opacity-40' : ''}`}
                        style={p.excluded ? { background: 'transparent', color: '#fff' } : { background: c.bg, color: c.fg }}
                      >
                        <span className="truncate">{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[12px]" aria-label="범례">
          {(['for', 'neutral', 'against', 'unset'] as const).map((k) => (
            <li key={k} className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-3 w-3 rounded-[3px]" style={{ background: COLOR[k].bg }} />
              {k === 'unset' ? '미분류' : STANCE_LABEL[k]}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-3 w-3 rounded-[3px] border-2 border-dashed border-white/50" />
            제외
          </li>
        </ul>
      </section>

      {/* 명단 */}
      <section aria-label="명단" className="flex flex-col gap-3">
        <h2 className="text-[18px] font-black">명단 ({shown.length}명)</h2>
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
              className={`h-9 rounded-full border-2 border-ink px-3.5 text-[13px] font-bold ${filter === k ? 'bg-ink text-white' : 'bg-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름·코멘트·조 검색" aria-label="검색" className={fieldClass} />

        <ul className="flex flex-col gap-2">
          {shown.map((p) => (
            <li
              key={p.id}
              id={`kp-${p.id}`}
              className={`rounded-[12px] border-2 border-ink bg-white p-3 transition-shadow ${p.excluded ? 'opacity-60' : ''} ${focusId === p.id ? 'shadow-[0_0_0_4px_#F2D80E]' : ''}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="text-[16px] font-black">{p.name}</span>
                  {p.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-lime px-2 py-0.5 text-[11px] font-bold">
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
                        className="h-10 min-w-[54px] rounded-[8px] border-2 border-ink px-2 text-[14px] font-black"
                        style={on ? { background: COLOR[s].bg, color: COLOR[s].fg } : { background: '#fff' }}
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
                  className="h-10 min-w-0 flex-1 rounded-[8px] border-2 border-ink/40 px-2.5 text-[14px] focus:border-ink focus:outline-none"
                />
                <label className="flex shrink-0 items-center gap-1 text-[12px] font-bold">
                  <input type="checkbox" checked={p.excluded} onChange={(e) => patch(p.id, { excluded: e.target.checked })} className="h-4 w-4" />
                  제외
                </label>
                <button type="button" onClick={() => removePerson(p)} aria-label={`${p.name} 지우기`} className="shrink-0 px-1 text-[16px] text-ink/40 hover:text-seal">
                  ×
                </button>
              </div>
            </li>
          ))}
          {shown.length === 0 && <li className="rounded-[12px] border-2 border-dashed border-ink/30 p-6 text-center text-[14px] text-inkMuted">해당하는 사람이 없어요.</li>}
        </ul>

        <form onSubmit={addPerson} className="flex gap-2" noValidate>
          <input value={newName} maxLength={NAME_LIMIT} onChange={(e) => setNewName(e.target.value)} placeholder="사람 추가 (이름)" aria-label="추가할 이름" className={fieldClass} />
          <button type="submit" className="h-12 shrink-0 rounded-[10px] border-2 border-ink bg-sticker px-5 text-[15px] font-bold">
            추가
          </button>
        </form>
      </section>

      {/* 가져오기·백업 */}
      <details className="rounded-[12px] border-2 border-ink bg-white p-3">
        <summary className="cursor-pointer text-[14px] font-bold">명단 가져오기 · 백업</summary>
        <p className="mt-2 text-[12px] leading-relaxed text-inkMuted">
          엑셀에서 열을 <b>이름 · 태그(조·모임, 쉼표) · 입장(지지/중도/반대) · 코멘트 · 제외(제외라고 쓰면)</b> 순서로 복사해서 붙여 넣으세요. 이미 있는 이름은 건드리지 않고 새 이름만 추가해요.
        </p>
        <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={5} placeholder={'홍길동\t3조\t지지\t골프 좋아함'} className="mt-2 w-full rounded-[8px] border-2 border-ink p-2 font-mono text-[13px]" />
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={importList} disabled={!paste.trim()} className="h-10 rounded-[8px] border-2 border-ink bg-sticker px-4 text-[14px] font-bold disabled:opacity-40">
            가져오기
          </button>
          <button type="button" onClick={copyAll} className="h-10 rounded-[8px] border-2 border-ink bg-white px-4 text-[14px] font-bold">
            지금 명단 복사 (백업)
          </button>
        </div>
      </details>

      {toast && (
        <div role="status" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-[420px] rounded-[10px] border-2 border-ink bg-ink px-4 py-3 text-center text-[14px] font-bold text-white">
          {toast}
        </div>
      )}
    </div>
  );
}
