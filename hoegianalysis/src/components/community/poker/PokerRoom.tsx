'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { POKER_NAME_LIMIT, type PokerResultView, type PokerView } from '@/lib/pokerTypes';
import { fieldClass, yellowButtonClass } from '../formStyles';
import { Rules } from './PokerHome';
import { api, loadToken, saveToken } from './storage';

// ---------- 서버 상태 받아오기 ----------

function usePoker(code: string, token: string | null) {
  const [view, setView] = useState<PokerView | null>(null);
  const [problem, setProblem] = useState<{ status: number; message: string } | null>(null);
  const offset = useRef(0);
  const since = useRef(0);

  const tick = useCallback(
    async (force = false) => {
      if (!token) return;
      try {
        const res = await fetch(`/api/poker/games/${code}?since=${force ? 0 : since.current}`, {
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

export function PokerRoom({ code }: { code: string }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => setToken(loadToken(code)), [code]);
  const { view, problem, offset, refresh } = usePoker(code, token ?? null);

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
  return <Table view={view} token={token} offset={offset} refresh={refresh} />;
}

function JoinCard({ code, onJoined }: { code: string; onJoined: (token: string) => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await api<{ token: string }>(`/api/poker/games/${code}/join`, { name });
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
        <label htmlFor="poker-join-name" className="text-[14px] font-bold">
          내 이름
        </label>
        <input
          id="poker-join-name"
          value={name}
          maxLength={POKER_NAME_LIMIT}
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

// ---------- 카드·칩 ----------

// 카드 디자인: 남색 테두리 + 금색 안쪽 선 + 왕관(K). 1~9는 흰 바탕에 넙죽이, 10은 불꽃 왕 카드, 뒷면은 넙죽이 포커 문양
const CARD_W = 112;
const CARD_H = 157;

function CardFace({ value }: { value: number }) {
  if (value === 10) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/hoegilab/poker-ten.webp" alt="" aria-hidden width={420} height={588} className="h-full w-full rounded-[12px]" />;
  }
  const spoon = value <= 4; // 낮은 숫자는 수줍은 넙죽이, 높은 숫자는 신난 넙죽이
  return (
    <div className="relative h-full w-full rounded-[12px] bg-[#14224f] p-[5px]">
      <div className="relative h-full w-full rounded-[8px] border border-[#c9a24a] bg-[#fbfaf4]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hoegilab/poker-crown.webp" alt="" aria-hidden width={160} height={93} className="absolute -top-[9px] left-1/2 w-[46px] -translate-x-1/2" />
        <span className="absolute left-1.5 top-1 flex flex-col items-center font-latin text-[22px] font-semibold leading-none text-[#14224f]">
          {value}
          <span aria-hidden className="text-[14px]">
            ♠
          </span>
        </span>
        <span className="absolute bottom-1 right-1.5 flex flex-col items-center font-latin text-[22px] font-semibold leading-none text-[#14224f]">
          <span aria-hidden className="text-[14px]">
            ♠
          </span>
          {value}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={spoon ? '/hoegilab/poker-char-spoon.webp' : '/hoegilab/poker-char-wave.webp'}
          alt=""
          aria-hidden
          width={300}
          height={380}
          className="absolute left-1/2 top-1/2 h-[64%] w-auto max-w-none -translate-x-1/2 -translate-y-[42%]"
        />
      </div>
    </div>
  );
}

function PlayingCard({ value, label, flip }: { value: number | null; label: string; flip?: boolean }) {
  const hidden = value === null;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        key={hidden ? 'back' : value}
        aria-label={hidden ? `${label}: 보이지 않음` : `${label}: ${value}`}
        style={{ width: CARD_W, height: CARD_H }}
        className={`relative rounded-[12px] shadow-[0_5px_0_rgba(0,0,0,0.4)] ${flip && !hidden ? 'card-flip' : ''}`}
      >
        {hidden ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/hoegilab/poker-back.webp" alt="" aria-hidden width={420} height={588} className="h-full w-full rounded-[12px]" />
        ) : (
          <CardFace value={value} />
        )}
      </div>
      <p className="text-[12px] font-bold text-[#e8d9a8]">{label}</p>
    </div>
  );
}

function Chip({ n, big }: { n: number; big?: boolean }) {
  return (
    <span
      className={`inline-grid place-items-center rounded-full border-2 border-ink bg-sticker font-latin font-semibold text-ink ${
        big ? 'h-9 min-w-9 px-1 text-[17px]' : 'h-7 min-w-7 px-1 text-[14px]'
      }`}
    >
      {n}
    </span>
  );
}

function PlayerBar({ name, chips, bet, bot, active }: { name: string; chips: number; bet: number; bot?: boolean; active: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-[10px] px-3 py-2 ${active ? 'bg-white/20 ring-2 ring-sticker' : 'bg-white/10'}`}>
      <div className="flex min-w-0 items-center gap-2">
        {bot && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/hoegilab/mafia-boss.webp" alt="" aria-hidden width={560} height={694} className="h-9 w-auto shrink-0" />
        )}
        <p className="truncate text-[16px] font-bold">{name}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-[13px]">
        <span className="flex items-center gap-1.5">
          칩 <Chip n={chips} />
        </span>
        <span className="flex items-center gap-1.5 text-white/70">
          건 칩 <b className="font-latin text-[15px] text-white">{bet}</b>
        </span>
      </div>
    </div>
  );
}

function resultText(r: PokerResultView): string {
  const who = (s: 'me' | 'opp') => (s === 'me' ? '내가' : '상대가');
  if (r.kind === 'tie') return `같은 숫자(${r.cards[0]})! 판돈 ${r.pot}칩은 다음 라운드로 이월돼요.`;
  if (r.kind === 'showdown') {
    return `내 카드 ${r.cards[0]} vs 상대 카드 ${r.cards[1]} → ${r.winner === 'me' ? '내가' : '상대가'} 이겨 판돈 ${r.pot}칩을 가져가요.`;
  }
  const folder = r.folder!;
  const base = `${who(folder)} 폴드! 내 카드 ${r.cards[0]}, 상대 카드 ${r.cards[1]}. 판돈 ${r.pot}칩은 ${folder === 'me' ? '상대' : '나'}에게 가요.`;
  if (!r.penalty) return base;
  const why = r.penaltyReason === 'ten' ? '10을 들고 폴드' : '더 높은 카드로 폴드';
  return `${base} (${why}해서 페널티 ${r.penalty}칩)`;
}

// ---------- 상황 그림 팝업 ----------

interface Popup {
  key: string;
  img: string;
  title: string;
  text: string;
  secs: number;
  tone: 'good' | 'bad' | 'neutral';
}

const IMG = (n: string) => `/hoegilab/poker-ev-${n}.webp`;

// 이 화면에서 새로 생긴 상황마다 (그림이 있는 경우만) 팝업 후보를 만든다. 우선순위: 게임 끝 > 라운드 결과 > 베팅 중 사건
function popupCandidates(v: PokerView): Popup[] {
  const out: Popup[] = [];
  const r = v.result;

  if (v.status === 'ended' && v.winner) {
    const win = v.winner === 'me';
    out.push({
      key: `end-${r?.round ?? v.round}`,
      img: IMG(win ? 'win' : 'loss'),
      title: win ? '승리!' : '패배…',
      text: win ? '상대의 칩을 모두 가져왔어요.' : '칩을 모두 잃었어요.',
      secs: 6,
      tone: win ? 'good' : 'bad',
    });
  }
  if (r && (v.status === 'reveal' || v.status === 'ended')) {
    const key = `res-${r.round}`;
    const [mine, theirs] = r.cards;
    const pen = r.penalty > 0 ? ` 페널티 ${r.penalty}칩까지 더해져요.` : '';
    if (r.kind === 'tie') {
      out.push({ key, img: IMG('tie'), title: '무승부!', text: `같은 숫자(${mine})예요. 판돈 ${r.pot}칩은 다음 라운드로 넘어가요.`, secs: 3.4, tone: 'neutral' });
    } else if (r.kind === 'fold' && r.penaltyReason === 'ten') {
      const me = r.folder === 'me';
      out.push({
        key,
        img: IMG('tenfold'),
        title: me ? '10을 들고 폴드…' : '상대가 10을 들고 폴드!',
        text: me ? `내 카드가 10이었어요. 판돈 ${r.pot}칩에${pen}` : `판돈 ${r.pot}칩을 가져와요.${pen}`,
        secs: 3.6,
        tone: me ? 'bad' : 'good',
      });
    } else if (r.kind === 'fold' && r.penaltyReason === 'higher') {
      const me = r.folder === 'me';
      out.push(
        me
          ? { key, img: IMG('highfold'), title: '높은 카드로 폴드…', text: `내 카드(${mine})가 상대(${theirs})보다 높았어요. 판돈 ${r.pot}칩을 주고${pen}`, secs: 3.6, tone: 'bad' }
          : { key, img: IMG('bluff'), title: '블러핑 성공!', text: `내 카드는 ${mine}뿐이었는데 상대가 ${theirs}을 들고 폴드했어요. 판돈 ${r.pot}칩을 가져와요.${pen}`, secs: 3.6, tone: 'good' },
      );
    } else if (r.kind === 'showdown' && r.allIn) {
      const win = r.winner === 'me';
      out.push({
        key,
        img: IMG('allinres'),
        title: '올인 대결!',
        text: `내 카드 ${mine} vs 상대 카드 ${theirs}. ${win ? '내가 이겨서' : '상대가 이겨서'} 판돈 ${r.pot}칩이 ${win ? '내게' : '상대에게'} 가요.`,
        secs: 3.6,
        tone: win ? 'good' : 'bad',
      });
    }
  }
  if (v.event && v.status === 'betting') {
    const e = v.event;
    if (e.kind === 'allin') {
      const me = e.who === 'me';
      out.push({
        key: `ev-${e.id}`,
        img: IMG('allin'),
        title: me ? '올인!' : '상대가 올인!',
        text: me ? '남은 칩을 모두 걸었어요. 상대가 콜하면 바로 카드 대결!' : '콜하면 바로 카드 대결, 폴드하면 페널티를 조심하세요.',
        secs: 2.8,
        tone: 'neutral',
      });
    } else {
      out.push({ key: `ev-${e.id}`, img: IMG('tense'), title: '팽팽한 눈치 싸움', text: `판돈이 ${v.pot}칩까지 커졌어요.`, secs: 2.6, tone: 'neutral' });
    }
  }
  return out;
}

// 새 상황이 생길 때마다 그림 팝업을 몇 초 띄운다. 처음 들어올 때 이미 있던 상황은 다시 띄우지 않는다
function useSituationPopup(view: PokerView): [Popup | null, () => void] {
  const seen = useRef<Set<string> | null>(null);
  const [popup, setPopup] = useState<Popup | null>(null);

  useEffect(() => {
    const cands = popupCandidates(view);
    if (seen.current === null) {
      seen.current = new Set(cands.map((c) => c.key));
      return;
    }
    const fresh = cands.filter((c) => !seen.current!.has(c.key));
    if (fresh.length === 0) return;
    for (const c of cands) seen.current.add(c.key);
    setPopup(fresh[0]);
  }, [view]);

  useEffect(() => {
    if (!popup) return;
    const id = setTimeout(() => setPopup(null), popup.secs * 1000);
    return () => clearTimeout(id);
  }, [popup]);

  return [popup, () => setPopup(null)];
}

function PopupCard({ popup, onClose, inline }: { popup: Popup; onClose: () => void; inline?: boolean }) {
  const ring = popup.tone === 'good' ? 'border-sticker' : popup.tone === 'bad' ? 'border-seal' : 'border-white/70';
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={`${popup.title} ${popup.text} (눌러서 닫기)`}
      className={`${inline ? 'block w-full' : 'card-flip absolute inset-x-3 top-14 z-20'} overflow-hidden rounded-[14px] border-[3px] bg-white text-left text-ink shadow-[0_10px_30px_rgba(0,0,0,0.55)] ${ring}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={popup.img} alt="" aria-hidden className="block max-h-[250px] w-full object-contain" />
      <span className="block border-t-2 border-ink px-4 py-3">
        <span className="block text-[20px] font-black leading-tight">{popup.title}</span>
        <span className="mt-0.5 block text-[14px] leading-snug text-inkMuted">{popup.text}</span>
      </span>
      <span aria-hidden className="block h-1.5 bg-ink/10">
        <span className="popup-timer block h-full bg-sticker" style={{ animationDuration: `${popup.secs}s` }} />
      </span>
    </button>
  );
}

// ---------- 테이블 ----------

function Table({ view, token, offset, refresh }: { view: PokerView; token: string; offset: React.MutableRefObject<number>; refresh: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const left = useSecondsLeft(view.turnEndsAt, offset);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/games/poker/${view.code}` : '';
  const [copied, setCopied] = useState(false);
  const [popup, closePopup] = useSituationPopup(view);

  async function act(action: 'call' | 'raise' | 'fold' | 'allin') {
    setBusy(true);
    setError('');
    const res = await api(`/api/poker/games/${view.code}/action`, { action }, token);
    setBusy(false);
    if (!res.ok) setError(res.error);
    refresh();
  }

  async function rematch() {
    await api(`/api/poker/games/${view.code}/rematch`, {}, token);
    refresh();
  }

  if (view.status === 'waiting') {
    return (
      <div className="flex flex-col gap-4 rounded-[14px] border-2 border-ink bg-white p-5">
        <h2 className="text-[24px] font-black">상대를 기다리는 중</h2>
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
        <p className="text-[14px] text-inkMuted">{view.names.me} 님이 방을 만들었어요. 친구가 들어오면 바로 시작합니다.</p>
        <Rules />
      </div>
    );
  }

  const bot = view.mode === 'bot';
  const oppName = view.names.opp ?? '상대';
  const ended = view.status === 'ended';
  const reveal = view.status === 'reveal' || ended;
  const total = view.turnSecs;
  const pct = left === null ? 0 : Math.max(0, Math.min(100, (left / total) * 100));
  const lowTime = left !== null && left <= 5;

  return (
    <div className="poker-table relative flex flex-col gap-4 rounded-[14px] p-4 text-white">
      {popup && <PopupCard popup={popup} onClose={closePopup} />}
      <div className="flex items-baseline justify-between text-[13px] font-bold text-white/70">
        <span>
          {bot ? '봇과 대결' : '친구와 대결'} · {view.round}라운드
        </span>
        <span>덱 {view.deckLeft}장 남음</span>
      </div>

      <PlayerBar name={oppName} chips={view.chips.opp} bet={view.bets.opp} bot={bot} active={view.status === 'betting' && !view.myTurn} />

      <div className="flex items-end justify-center gap-5">
        <PlayingCard value={view.oppCard} label={`${oppName}의 카드`} flip={reveal} />
        <div className="flex flex-col items-center gap-1 pb-7 text-center">
          <p className="text-[12px] font-bold text-white/60">판돈</p>
          <Chip n={reveal && view.result ? view.result.pot : view.pot} big />
          {view.carry > 0 && <p className="text-[12px] text-sticker">이월 {view.carry}칩 포함</p>}
        </div>
        <PlayingCard value={view.myCard} label="내 카드" flip={reveal} />
      </div>

      {/* 결과 공개 */}
      {view.result && (
        <p
          role="status"
          className={`rounded-[10px] px-3 py-2 text-[14px] font-bold leading-snug ${
            view.result.kind === 'tie' ? 'bg-white/15' : view.result.winner === 'me' ? 'bg-sticker text-ink' : 'bg-seal text-white'
          }`}
        >
          {resultText(view.result)}
        </p>
      )}

      <PlayerBar name={view.names.me} chips={view.chips.me} bet={view.bets.me} active={view.myTurn} />

      {ended ? (
        <div className="flex flex-col items-center gap-3 rounded-[10px] bg-white/10 p-4 text-center">
          <p className="text-[28px] font-black">{view.winner === 'me' ? '🎉 승리!' : '패배…'}</p>
          <p className="text-[14px] text-white/70">{view.winner === 'me' ? '상대의 칩을 모두 가져왔어요.' : '칩을 모두 잃었어요.'}</p>
          <button type="button" onClick={rematch} className={yellowButtonClass}>
            한 판 더
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {view.status === 'betting' && (
            <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-white/15">
              <div className={`h-full transition-[width] duration-200 ${lowTime ? 'bg-seal' : 'bg-sticker'}`} style={{ width: `${pct}%` }} />
            </div>
          )}
          <p className="min-h-[20px] text-[14px] font-bold">
            {view.status === 'reveal'
              ? '결과 확인 중…'
              : view.myTurn
                ? view.raised
                  ? `상대가 레이즈했어요! 콜 ${view.legal.callAmount}칩 / 폴드 / 레이즈 · ${left !== null ? Math.ceil(left) : ''}초`
                  : `내 차례예요 · ${left !== null ? Math.ceil(left) : ''}초`
                : `${oppName} 차례…`}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <ActionButton disabled={busy || !view.legal.call} onClick={() => act('call')}>
              콜{view.legal.callAmount > 0 ? ` (+${view.legal.callAmount})` : ''}
            </ActionButton>
            <ActionButton disabled={busy || !view.legal.raise} onClick={() => act('raise')}>
              레이즈 (총 {view.legal.raiseTo})
            </ActionButton>
            <ActionButton disabled={busy || !view.legal.allin} onClick={() => act('allin')}>
              올인 (총 {view.legal.allinTo})
            </ActionButton>
            <ActionButton danger disabled={busy || !view.legal.call} onClick={() => act('fold')}>
              폴드
            </ActionButton>
          </div>
          <p className="text-[12px] leading-snug text-white/60">
            폴드 주의: 내 카드가 더 높거나 10이면 추가로 칩을 잃어요. 시간이 끝나면 레이즈가 없을 땐 자동 콜, 받았으면 자동 폴드예요.
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-[14px] text-[#ff8a80]">
          {error}
        </p>
      )}
      <div className="text-ink">
        <Rules />
      </div>
    </div>
  );
}

function ActionButton({ children, onClick, disabled, danger }: { children: React.ReactNode; onClick: () => void; disabled: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[52px] rounded-[10px] border-2 px-3 text-[16px] font-bold disabled:opacity-35 ${
        danger ? 'border-seal bg-seal text-white' : 'border-ink bg-sticker text-ink hover:bg-[#e3c900]'
      }`}
    >
      {children}
    </button>
  );
}
