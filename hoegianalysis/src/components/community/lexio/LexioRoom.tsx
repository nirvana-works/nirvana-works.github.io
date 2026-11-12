'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MIN_SEATS,
  beats,
  evalCombo,
  makeRank,
  sortTiles,
} from '@/lib/lexioCore';
import { LEXIO_NAME_LIMIT, type LexioPlayView, type LexioView } from '@/lib/lexioTypes';
import { fieldClass, yellowButtonClass } from '../formStyles';
import { LexioRules } from './LexioHome';
import { Tile } from './LexioTile';
import { api, loadToken, saveToken } from './storage';

// ---------- 서버 상태 받아오기 ----------

function useLexio(code: string, token: string | null) {
  const [view, setView] = useState<LexioView | null>(null);
  const [problem, setProblem] = useState<{ status: number; message: string } | null>(null);
  const offset = useRef(0);
  const since = useRef(0);

  const tick = useCallback(
    async (force = false) => {
      if (!token) return;
      try {
        const res = await fetch(`/api/lexio/games/${code}?since=${force ? 0 : since.current}`, {
          headers: { 'x-mafia-token': token },
          cache: 'no-store',
        });
        const data = await res.json();
        if (!res.ok) return setProblem({ status: res.status, message: data.error ?? '문제가 생겼어요.' });
        setProblem(null);
        offset.current = (data.unchanged ? data.now : data.view.now) - Date.now();
        if (!data.unchanged) {
          since.current = data.view.version;
          setView(data.view);
        }
      } catch {
        // 잠깐 끊겨도 다음 주기에 다시 받는다
      }
    },
    [code, token],
  );

  useEffect(() => {
    if (!token) return;
    tick(true);
    const id = setInterval(() => !document.hidden && tick(), 1000);
    const onVisible = () => !document.hidden && tick(true);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [token, tick]);

  return { view, problem, offset, refresh: () => tick(true) };
}

function useSecondsLeft(endsAt: number | null, offset: React.MutableRefObject<number>): number | null {
  const calc = () => (endsAt == null ? null : Math.max(0, (endsAt - (Date.now() + offset.current)) / 1000));
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    setLeft(calc());
    const id = setInterval(() => setLeft(calc()), 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt]);
  return left;
}

// ---------- 방 ----------

export function LexioRoom({ code }: { code: string }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => setToken(loadToken(code)), [code]);
  const { view, problem, offset, refresh } = useLexio(code, token ?? null);

  if (token === undefined) return null;
  if (!token || problem?.status === 401) {
    return (
      <JoinCard
        code={code}
        onJoined={(t) => {
          saveToken(code, t);
          setToken(t);
        }}
      />
    );
  }
  if (problem && !view) {
    return (
      <p role="alert" className="rounded-[10px] bg-seal px-5 py-4 text-[15px] font-bold text-white">
        {problem.message}
      </p>
    );
  }
  if (!view) return <p className="py-10 text-center text-[15px] text-inkMuted">방에 들어가는 중…</p>;
  return view.status === 'lobby' ? (
    <Lobby view={view} token={token} refresh={refresh} />
  ) : (
    <Table view={view} token={token} offset={offset} refresh={refresh} />
  );
}

function JoinCard({ code, onJoined }: { code: string; onJoined: (token: string) => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await api<{ token: string }>(`/api/lexio/games/${code}/join`, { name });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onJoined(res.data.token);
  }

  return (
    <form onSubmit={join} className="flex flex-col gap-4 rounded-[14px] border-2 border-ink bg-white p-5" noValidate>
      <div>
        <p className="text-[13px] font-bold text-inkMuted">방 코드</p>
        <p className="font-latin text-[40px] font-semibold leading-none tracking-[0.15em]">{code}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="lexio-join-name" className="text-[14px] font-bold">
          내 이름
        </label>
        <input
          id="lexio-join-name"
          value={name}
          maxLength={LEXIO_NAME_LIMIT}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          placeholder="이름 또는 별명"
          className={fieldClass}
        />
      </div>
      {error && (
        <p role="alert" className="text-[14px] text-seal">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className={yellowButtonClass}>
        {busy ? '들어가는 중…' : '입장하기'}
      </button>
    </form>
  );
}

// ---------- 공통 조각 ----------

const AVATARS = [
  '/hoegilab/mafia-citizen.webp',
  '/hoegilab/mafia-police.webp',
  '/hoegilab/mafia-doctor.webp',
  '/hoegilab/mafia-boss.webp',
  '/hoegilab/poker-char-wave.webp',
];

function Avatar({ seat, size = 36 }: { seat: number; size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-[#c9a24a] bg-[#fbf7e9]" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={AVATARS[seat % AVATARS.length]} alt="" aria-hidden width={560} height={694} className="h-full w-full scale-[1.35] object-cover object-[50%_18%]" />
    </span>
  );
}

// 상대 패: 우리를 등지고 서 있는 타일 뒷면. 7장 이상이면 두 줄로 쌓아서 자리를 덜 차지한다
const BACK_FACE =
  'block rounded-[2px] border-t-[4px] border-[#efe7d0] bg-[#2f8a55] shadow-[inset_-2px_0_0_rgba(0,0,0,0.18),0_2px_0_rgba(0,0,0,0.45)]';

// 위쪽 진열대: 상대 패가 한 줄로 서 있다 (최대 12장)
function RackBacks({ count }: { count: number }) {
  return (
    <div className="flex items-end gap-[1px]" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={`${BACK_FACE} h-[26px] w-[17px]`} />
      ))}
    </div>
  );
}

function Backs({ count, rotate }: { count: number; rotate: number }) {
  const upper = count > 6 ? Math.ceil(count / 2) : 0;
  const row = (n: number, key: string, cls = '') => (
    <div key={key} className={`flex gap-[1px] ${cls}`}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={`${BACK_FACE} h-[22px] w-[15px]`} />
      ))}
    </div>
  );
  return (
    <div className="flex flex-col items-center" style={{ transform: `rotate(${rotate}deg)` }} aria-hidden>
      {upper > 0 && row(upper, 'up', '-mb-[9px]')}
      {row(count - upper, 'down')}
    </div>
  );
}

// ---------- 대기실 ----------

function Lobby({ view, token, refresh }: { view: LexioView; token: string; refresh: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/games/lexio/${view.code}` : '';
  const n = view.seats.length;

  async function call(path: string, body: object) {
    setBusy(true);
    setError('');
    const res = await api(`/api/lexio/games/${view.code}/${path}`, body, token);
    setBusy(false);
    if (!res.ok) setError(res.error);
    refresh();
  }

  return (
    <div className="flex flex-col gap-4 rounded-[14px] border-2 border-ink bg-white p-5">
      <h2 className="text-[24px] font-black">대기실</h2>
      <div className="flex flex-col gap-2 rounded-[10px] bg-lime p-4">
        <p className="text-[13px] font-bold text-inkMuted">친구에게 이 코드나 링크를 보내 주세요</p>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              // 복사가 막힌 브라우저는 코드를 직접 알려 주면 된다
            }
          }}
          className="self-start text-left"
        >
          <span className="block font-latin text-[44px] font-semibold leading-none tracking-[0.2em] text-ink">{view.code}</span>
          <span className="text-[13px] font-bold text-ink underline">{copied ? '링크를 복사했어요' : '눌러서 링크 복사'}</span>
        </button>
      </div>

      <div>
        <p className="mb-2 text-[14px] font-bold">
          참가자 {n} / {view.maxPlayers}명
        </p>
        <ul className="flex flex-col gap-2">
          {view.seats.map((s, i) => (
            <li key={i} className={`flex items-center justify-between gap-2 rounded-[10px] border-2 border-ink px-3 py-2 ${s.isYou ? 'bg-sticker' : 'bg-white'}`}>
              <span className="flex min-w-0 items-center gap-2">
                <Avatar seat={i} />
                <span className="truncate text-[15px] font-bold">{s.name}</span>
                {s.isYou && <span className="text-[11px]">(나)</span>}
                {s.bot && <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-white">봇</span>}
                {i === 0 && <span className="rounded-full border border-ink px-2 py-0.5 text-[11px] font-bold">방장</span>}
              </span>
              {view.isHost && i > 0 && (
                <button type="button" disabled={busy} onClick={() => call('lobby', { op: 'remove', index: i })} aria-label={`${s.name} 내보내기`} className="grid h-9 w-9 place-items-center rounded-full text-[18px] text-seal">
                  ×
                </button>
              )}
            </li>
          ))}
          {Array.from({ length: Math.max(0, view.maxPlayers - n) }, (_, i) => (
            <li key={`e${i}`} className="rounded-[10px] border-2 border-dashed border-ink/25 px-3 py-3 text-[14px] text-ink/40">
              빈 자리
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <p role="alert" className="text-[14px] text-seal">
          {error}
        </p>
      )}
      {view.isHost ? (
        <div className="flex flex-col gap-2">
          {n < view.maxPlayers && (
            <button type="button" disabled={busy} onClick={() => call('lobby', { op: 'addbot' })} className="h-11 rounded-[10px] border-2 border-ink bg-white text-[15px] font-bold">
              + 봇 추가
            </button>
          )}
          <button type="button" disabled={busy || n < MIN_SEATS} onClick={() => call('start', {})} className={yellowButtonClass}>
            {n < MIN_SEATS ? `${MIN_SEATS - n}명 더 필요해요` : '게임 시작'}
          </button>
        </div>
      ) : (
        <p className="rounded-[10px] bg-lime px-4 py-3 text-center text-[15px] font-bold">방장이 시작하기를 기다리고 있어요…</p>
      )}
      <LexioRules />
    </div>
  );
}

// ---------- 둥근 테이블 ----------

// 내 자리는 맨 아래(손 위)이고, 상대는 시계 방향으로 왼쪽 → 위 → 오른쪽에 앉는다 (최대 3명). 판 그림 위 좌표(%)
// rack: 위쪽 나무 진열대에 패가 선다 (그림의 진열대 자리)
const SEAT_SLOTS: Record<number, { x: number; y: number; rack?: boolean }[]> = {
  1: [{ x: 50, y: 21.5, rack: true }],
  2: [
    { x: 13, y: 52 },
    { x: 50, y: 21.5, rack: true },
  ],
  3: [
    { x: 13, y: 52 },
    { x: 50, y: 21.5, rack: true },
    { x: 87, y: 52 },
  ],
};

function Table({ view, token, offset, refresh }: { view: LexioView; token: string; offset: React.MutableRefObject<number>; refresh: () => void }) {
  const rk = useMemo(() => makeRank(view.maxNum), [view.maxNum]);
  const [selected, setSelected] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<'rank' | 'suit'>('rank');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const left = useSecondsLeft(view.turnEndsAt, offset);
  const n = view.seats.length;
  const me = view.you;
  const ended = view.status === 'ended';

  // 손에서 사라진 타일은 선택에서도 뺀다
  useEffect(() => setSelected((sel) => sel.filter((t) => view.myHand.includes(t))), [view.myHand]);
  // 내 차례가 아니면 선택을 풀어 둔다
  useEffect(() => {
    if (!view.myTurn) setSelected([]);
  }, [view.myTurn]);

  const hand = useMemo(() => sortTiles(view.myHand, rk, sortBy), [view.myHand, rk, sortBy]);
  // 7장 이상이면 두 줄로 쌓는다 (앞 절반은 뒷줄, 나머지는 앞줄)
  const backCount = hand.length > 6 ? Math.ceil(hand.length / 2) : 0;
  const backTiles = hand.slice(0, backCount);
  const frontTiles = hand.slice(backCount);

  // 낼 때 선택한 타일이 가운데로 날아가는 애니메이션
  const tileEls = useRef(new Map<number, HTMLElement>());
  const centerRef = useRef<HTMLDivElement>(null);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [flying, setFlying] = useState<Set<number>>(new Set());
  const ghostTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function launchGhosts(ids: number[]): void {
    const c = centerRef.current?.getBoundingClientRect();
    if (!c || ids.length === 0) return;
    const cw = ids.length > 3 ? 44 : 52;
    const anchor = Math.max(...ids.map((id) => tileEls.current.get(id)?.getBoundingClientRect().left ?? 0)); // 팔은 가장 오른쪽 타일을 쥔다
    const next: Ghost[] = [];
    ids.forEach((id, i) => {
      const r = tileEls.current.get(id)?.getBoundingClientRect();
      if (!r) return;
      const tx = c.left + c.width / 2 + (i - (ids.length - 1) / 2) * (cw + 4) - cw / 2;
      const ty = c.top + c.height / 2 - (cw * 1.42) / 2;
      next.push({ id, x: r.left, y: r.top, w: r.width, dx: tx - r.left, dy: ty - r.top, s: cw / r.width, arm: r.left >= anchor - 1 });
    });
    setGhosts(next);
    setFlying(new Set(ids));
    if (ghostTimer.current) clearTimeout(ghostTimer.current);
    ghostTimer.current = setTimeout(() => {
      setGhosts([]);
      setFlying(new Set());
    }, 1300);
  }

  const renderHandTile = (t: number) => (
    <Tile
      key={t}
      id={t}
      w={48}
      selected={selected.includes(t)}
      invisible={flying.has(t)}
      tileRef={(el) => {
        if (el) tileEls.current.set(t, el);
        else tileEls.current.delete(t);
      }}
      onClick={() => view.myTurn && setSelected((sel) => (sel.includes(t) ? sel.filter((x) => x !== t) : [...sel, t]))}
    />
  );
  const tableCombo = useMemo(() => (view.table ? evalCombo(view.table.tiles, rk) : null), [view.table, rk]);
  const selCombo = useMemo(() => evalCombo(selected, rk), [selected, rk]);
  const canPlay = view.myTurn && selCombo !== null && (!tableCombo || beats(selCombo, tableCombo));

  let hint = '';
  if (view.myTurn) {
    if (selected.length === 0) hint = view.table ? `${view.seats[view.table.seat].name}의 ${view.table.label}보다 센 패를 고르세요` : '먼저 낼 차례예요. 낼 타일을 고르세요';
    else if (!selCombo) hint = '낼 수 없는 조합이에요 (같은 숫자 2~3장, 또는 5장 조합)';
    else if (tableCombo && !beats(selCombo, tableCombo)) hint = `${selCombo.label}: 앞 패보다 약하거나 종류가 달라요`;
    else hint = `${selCombo.label}: 낼 수 있어요!`;
  }

  async function send(body: { type: string; tiles?: number[] }) {
    setBusy(true);
    setError('');
    if (body.type === 'play' && body.tiles) launchGhosts(body.tiles);
    const res = await api(`/api/lexio/games/${view.code}/action`, body, token);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      setGhosts([]); // 못 냈으면 타일을 되돌린다
      setFlying(new Set());
    } else setSelected([]);
    refresh();
  }

  const opponents = view.seats.map((s, i) => ({ s, i, r: (i - me + n) % n })).filter((x) => x.r !== 0).sort((a, b) => a.r - b.r);
  const slots = SEAT_SLOTS[opponents.length] ?? SEAT_SLOTS[3];
  const seatPos = new Map<number, { x: number; y: number; rack?: boolean }>();
  opponents.forEach((o, idx) => seatPos.set(o.i, slots[idx]));

  const flyFrom = (seat: number) => {
    const p = seatPos.get(seat);
    return p ? { '--fx': `${(p.x - 50) * 3.4}px`, '--fy': `${(p.y - 64) * 4}px` } : { '--fx': '0px', '--fy': '170px' };
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="mx-auto flex w-full max-w-[420px] items-center justify-between px-1 text-[12px] font-bold text-ink/65">
        <span>
          {view.round}판 · 인원 {n}명
        </span>
        {left !== null && view.status === 'playing' && <span className="font-latin text-[13px] font-semibold tabular-nums">{Math.ceil(left)}초</span>}
      </div>
      {/* 플레이 판: 금색 무늬 펠트 위에 상대 자리와 가운데 패가 놓인다 */}
      <div className="lexio-board relative mx-auto h-[390px] w-full max-w-[420px] overflow-hidden rounded-[14px]" style={{ backgroundColor: '#12342f' }}>
        {/* 3D 장면: 나무 테이블 테두리, 진열대, 원근감 있는 펠트. 아래쪽은 같은 펠트색으로 이어 붙인다 */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[87%]" style={{ backgroundImage: 'url(/hoegilab/lexio-scene.webp)', backgroundSize: 'auto 100%', backgroundPosition: '50% 0', backgroundRepeat: 'no-repeat' }}>
          <div className="absolute inset-x-0 bottom-0 h-[24%] bg-gradient-to-b from-transparent to-[#12342f]" />
        </div>

        {opponents.map(({ s, i }) => {
          const p = seatPos.get(i)!;
          if (p.rack) {
            return (
              <div key={i}>
                {/* 진열대 위에 서 있는 상대 패, 나무 앞판에 이름표 */}
                <div className="absolute -translate-x-1/2" style={{ left: `${p.x}%`, top: 38 }}>
                  <RackBacks count={s.count} />
                </div>
                <div className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                  <div className={`flex items-center gap-1.5 rounded-full px-1.5 py-0.5 ${s.isTurn ? 'bg-sticker text-ink ring-2 ring-white' : 'bg-[#0b2a2a]/90 text-white'}`}>
                    <Avatar seat={i} size={28} />
                    <span className="max-w-[80px] truncate text-[13px] font-bold">{s.name}</span>
                    <span className="font-latin text-[12px] font-semibold">
                      {s.count}장 · <span className={s.total >= 0 ? 'text-[#ffe36e]' : 'text-[#ffb1a8]'}>{s.total > 0 ? `+${s.total}` : s.total}</span>
                    </span>
                  </div>
                  {s.passed && !ended && <span className="rounded-full bg-white/90 px-2 text-[11px] font-black text-ink">패스</span>}
                </div>
              </div>
            );
          }
          return (
            <div key={i} className="absolute flex w-[110px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
              <div className={`flex items-center gap-1.5 rounded-full px-1.5 py-0.5 ${s.isTurn ? 'bg-sticker text-ink ring-2 ring-white' : 'bg-[#0f3d30]/90 text-white'}`}>
                <Avatar seat={i} size={32} />
                <span className="max-w-[64px] truncate text-[13px] font-bold">{s.name}</span>
              </div>
              <Backs count={s.count} rotate={p.x < 30 ? 8 : p.x > 70 ? -8 : 0} />
              <p className="text-[12px] font-bold text-white drop-shadow">
                {s.count}장 · <span className={s.total >= 0 ? 'text-[#ffe36e]' : 'text-[#ffb1a8]'}>{s.total > 0 ? `+${s.total}` : s.total}</span>
              </p>
              {s.passed && !ended && <span className="rounded-full bg-white/90 px-2 text-[11px] font-black text-ink">패스</span>}
            </div>
          );
        })}

        {/* 가운데: 낸 패가 모이는 자리 */}
        <div ref={centerRef} className="absolute left-1/2 top-[64%] flex w-[78%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1">
          {view.table ? <CenterPlays view={view} fly={flyFrom} hold={ghosts.length > 0} /> : <p className="text-center text-[13px] font-bold leading-snug text-white/85">{ended ? '판이 끝났어요' : view.turn !== null ? `${view.seats[view.turn].name} 님이 먼저 내요` : ''}</p>}
        </div>
      </div>

      {ended ? (
        <EndPanel view={view} token={token} refresh={refresh} />
      ) : (
        <div className="flex flex-col gap-2 rounded-[14px] border-2 border-ink bg-[#14224f] p-3 text-white">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar seat={me} size={34} />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold">{view.seats[me].name}</p>
                <p className="text-[12px] text-white/70">
                  {view.myHand.length}장 · 누적 {view.seats[me].total > 0 ? `+${view.seats[me].total}` : view.seats[me].total}
                </p>
              </div>
            </div>
            <p className={`rounded-full px-3 py-1 text-[13px] font-black ${view.myTurn ? 'bg-sticker text-ink' : 'bg-white/10 text-white/70'}`}>
              {view.myTurn ? `내 차례 ${left !== null ? Math.ceil(left) : ''}초` : view.turn !== null ? `${view.seats[view.turn].name} 차례` : ''}
            </p>
          </div>

          {view.myTurn && left !== null && (
            <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-white/15">
              <div className={`h-full transition-[width] duration-200 ${left <= 5 ? 'bg-seal' : 'bg-sticker'}`} style={{ width: `${Math.min(100, (left / view.turnSecs) * 100)}%` }} />
            </div>
          )}

          <div className="flex items-center justify-between text-[12px] text-white/70">
            <span>내 패</span>
            <button type="button" onClick={() => setSortBy((s) => (s === 'rank' ? 'suit' : 'rank'))} className="rounded-full border border-white/40 px-3 py-1 font-bold">
              {sortBy === 'rank' ? '숫자순' : '무늬순'} ⇄
            </button>
          </div>
          {/* 내 앞에 놓인 패 진열대: 뒷줄이 앞줄 뒤에 겹쳐 서 있다 */}
          <div className="lexio-rack pb-1 pt-3">
            {backTiles.length > 0 && (
              <div className="relative z-0 -mb-[20px]">
                <div className="flex justify-center gap-[3px] px-1">{backTiles.map(renderHandTile)}</div>
                <div className="lexio-ledge" aria-hidden />
              </div>
            )}
            <div className="relative z-10">
              <div className="flex justify-center gap-[3px] px-1">{frontTiles.map(renderHandTile)}</div>
              <div className="lexio-ledge lexio-ledge-front" aria-hidden />
            </div>
          </div>

          <p className="min-h-[20px] text-[13px] font-bold" aria-live="polite">
            {hint}
          </p>
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            <button
              type="button"
              disabled={busy || !view.canPass}
              onClick={() => send({ type: 'pass' })}
              className="min-h-[52px] rounded-[10px] border-2 border-white/50 bg-white/10 px-3 text-[16px] font-bold text-white disabled:opacity-35"
            >
              패스
            </button>
            <button
              type="button"
              disabled={busy || !canPlay}
              onClick={() => send({ type: 'play', tiles: selected })}
              className="min-h-[52px] rounded-[10px] border-2 border-ink bg-sticker px-3 text-[16px] font-bold text-ink hover:bg-[#e3c900] disabled:opacity-35"
            >
              {selCombo && canPlay ? `${selCombo.label} 내기` : '내기'}
            </button>
          </div>
          {error && (
            <p role="alert" className="text-[13px] text-[#ff8a80]">
              {error}
            </p>
          )}
        </div>
      )}
      <LexioRules />
      {ghosts.map((g) => (
        <GhostTile key={g.id} g={g} />
      ))}
    </div>
  );
}

interface Ghost {
  arm: boolean;
  id: number;
  x: number;
  y: number;
  w: number;
  dx: number;
  dy: number;
  s: number;
}

// 넙죽이 팔이 타일을 쥐고 내 진열대에서 판 가운데로 옮겨 놓는 애니메이션 (화면 좌표 기준)
// 팔 그림(lexio-arm.webp)은 타일을 쥔 손 모양이라, 타일 너비 185 기준으로 위치를 맞춘다
const ARM = { w: 250, h: 396, tileX: -73 * (250 / 327), tileY: 8 * (250 / 327), tileW: 185 * (250 / 327) };

function GhostTile({ g }: { g: Ghost }) {
  const group = useRef<HTMLDivElement>(null);
  const arm = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const T = 1250;
    const mid = { x: g.dx * 0.5, y: g.dy * 0.5 - 46 };
    // 타일: 잠깐 집힌 뒤 들려 올라가 판 위에 살짝 기울어져 내려앉는다
    group.current?.animate(
      [
        { transform: 'translate(0,0) scale(1) rotate(0deg)', offset: 0 },
        { transform: 'translate(0,0) scale(1) rotate(0deg)', offset: 0.14 },
        { transform: `translate(${mid.x}px,${mid.y}px) scale(${1 + (g.s - 1) * 0.5 + 0.1}) rotate(-3deg)`, offset: 0.42 },
        { transform: `translate(${g.dx}px,${g.dy}px) scale(${g.s}) rotate(0deg)`, offset: 0.64 },
        { transform: `translate(${g.dx}px,${g.dy}px) scale(${g.s}) rotate(0deg)`, offset: 1 },
      ],
      { duration: T, easing: 'cubic-bezier(0.35,0.1,0.3,1)', fill: 'forwards' },
    );
    // 팔: 아래에서 올라와 타일을 쥐고, 내려놓은 뒤 뒤로 빠진다
    arm.current?.animate(
      [
        { transform: `translate(${g.w * 1.1}px,${g.w * 2.4}px)`, opacity: 0, offset: 0 },
        { transform: 'translate(0,0)', opacity: 1, offset: 0.14 },
        { transform: 'translate(0,0)', opacity: 1, offset: 0.64 },
        { transform: `translate(${g.w * 0.5}px,${g.w * 0.9}px)`, opacity: 1, offset: 0.78 },
        { transform: `translate(${g.w * 1.3}px,${g.w * 2.8}px)`, opacity: 0, offset: 1 },
      ],
      { duration: T, easing: 'ease-in-out', fill: 'forwards' },
    );
  }, [g]);
  const k = g.w / ARM.tileW; // 팔 그림을 타일 크기에 맞춘 배율
  return (
    <div ref={group} aria-hidden className="pointer-events-none fixed z-[60]" style={{ left: g.x, top: g.y, width: g.w, transformOrigin: '0 0' }}>
      <Tile id={g.id} w={g.w} />
      {g.arm && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={arm}
          src="/hoegilab/lexio-arm.webp"
          alt=""
          width={ARM.w}
          height={ARM.h}
          className="absolute max-w-none"
          style={{ left: -ARM.tileX * k, top: -ARM.tileY * k, width: ARM.w * k, height: ARM.h * k, opacity: 0 }}
        />
      )}
    </div>
  );
}

function CenterPlays({ view, fly, hold }: { view: LexioView; fly: (seat: number) => Record<string, string>; hold: boolean }) {
  const plays = view.trick.slice(-3);
  const top = plays[plays.length - 1];
  const older = plays.slice(0, -1);
  const mine = (p: LexioPlayView) => p.seat === view.you;
  return (
    <div className="flex flex-col items-center gap-1" style={{ perspective: 640 }}>
      {older.length > 0 && (
        <div className="flex gap-1 opacity-45" style={{ transform: 'rotateX(36deg)', transformOrigin: '50% 100%' }} aria-hidden>
          {older[older.length - 1].tiles.map((t) => (
            <Tile key={t} id={t} w={28} />
          ))}
        </div>
      )}
      <div
        key={`${top.seat}-${top.tiles.join('-')}`}
        className={mine(top) ? '' : 'tile-fly'}
        style={{ ...(fly(top.seat) as React.CSSProperties), opacity: mine(top) && hold ? 0 : 1 }}
      >
        {/* 타일이 판 위에 눕혀 놓인 것처럼 기울인다 */}
        <div className="flex flex-wrap justify-center gap-1" style={{ transform: 'rotateX(34deg)', transformOrigin: '50% 100%' }}>
          {top.tiles.map((t) => (
            <Tile key={t} id={t} w={top.tiles.length > 3 ? 44 : 52} />
          ))}
        </div>
      </div>
      <p className="rounded-full bg-black/35 px-3 py-0.5 text-[12px] font-bold text-white">
        {mine(top) ? '나' : view.seats[top.seat].name} · {top.label}
      </p>
    </div>
  );
}

function EndPanel({ view, token, refresh }: { view: LexioView; token: string; refresh: () => void }) {
  const [busy, setBusy] = useState(false);
  const win = view.winner === view.you;
  const rows = view.seats.map((s, i) => ({ s, i, d: view.delta?.[i] ?? 0, rem: view.remaining?.[i] ?? 0 }));
  async function next() {
    setBusy(true);
    await api(`/api/lexio/games/${view.code}/action`, { type: 'next' }, token);
    setBusy(false);
    refresh();
  }
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border-2 border-ink bg-white p-4">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={win ? '/hoegilab/poker-ev-win.webp' : '/hoegilab/poker-ev-loss.webp'} alt="" aria-hidden width={640} height={700} className="h-24 w-auto rounded-[8px]" />
        <div>
          <p className="text-[24px] font-black leading-tight">{win ? '승리!' : `${view.seats[view.winner ?? 0].name} 님의 승리`}</p>
          <p className="text-[13px] text-inkMuted">먼저 모든 타일을 냈어요.</p>
        </div>
      </div>
      <ul className="flex flex-col gap-1.5">
        {rows.map(({ s, i, d, rem }) => (
          <li key={i} className={`flex items-center justify-between gap-2 rounded-[10px] border-2 px-3 py-2 ${i === view.winner ? 'border-ink bg-sticker' : 'border-ink/20'}`}>
            <span className="flex min-w-0 items-center gap-2">
              <Avatar seat={i} size={30} />
              <span className="truncate text-[14px] font-bold">{s.name}{s.isYou ? ' (나)' : ''}</span>
            </span>
            <span className="shrink-0 text-right text-[13px]">
              <span className="text-inkMuted">남은 {rem}장 </span>
              <b className={`font-latin text-[16px] ${d >= 0 ? 'text-ink' : 'text-seal'}`}>{d > 0 ? `+${d}` : d}</b>
              <span className="block text-[11px] text-inkMuted">누적 {s.total > 0 ? `+${s.total}` : s.total}</span>
            </span>
          </li>
        ))}
      </ul>
      <button type="button" disabled={busy} onClick={next} className={yellowButtonClass}>
        다음 판
      </button>
    </div>
  );
}
