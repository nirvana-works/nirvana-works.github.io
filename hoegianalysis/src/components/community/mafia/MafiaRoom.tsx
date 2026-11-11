'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MIN_PLAYERS,
  NAME_LIMIT,
  ROLES,
  mafiaCount,
  type ActionKind,
  type MafiaView,
  type Role,
  type ViewPlayer,
} from '@/lib/mafiaTypes';
import { fieldClass, stickerButtonClass, yellowButtonClass } from '../formStyles';
import { RoleAvatar } from './RoleAvatar';
import { api, loadToken, saveToken } from './storage';

// ---------- 서버 상태를 계속 받아오기 ----------

type Problem = { status: number; message: string } | null;

function useMafia(code: string, token: string | null) {
  const [view, setView] = useState<MafiaView | null>(null);
  const [problem, setProblem] = useState<Problem>(null);
  const offset = useRef(0); // 서버 시각 - 내 시각
  const since = useRef(0);

  const tick = useCallback(
    async (force = false) => {
      if (!token) return;
      try {
        const res = await fetch(`/api/mafia/games/${code}?since=${force ? 0 : since.current}`, {
          headers: { 'x-mafia-token': token },
          cache: 'no-store',
        });
        const data = await res.json();
        if (!res.ok) return setProblem({ status: res.status, message: data.error ?? '문제가 생겼어요.' });
        setProblem(null);
        offset.current = data.unchanged ? data.now - Date.now() : data.view.now - Date.now();
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
    const id = setInterval(() => !document.hidden && tick(), 1500);
    const onVisible = () => !document.hidden && tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [token, tick]);

  return { view, problem, offset, refresh: () => tick(true) };
}

function useSecondsLeft(endsAt: number | null, offset: React.MutableRefObject<number>): number | null {
  const calc = () => (endsAt == null ? null : Math.max(0, Math.ceil((endsAt - (Date.now() + offset.current)) / 1000)));
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    setLeft(calc());
    const id = setInterval(() => setLeft(calc()), 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt]);
  return left;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// ---------- 방 ----------

export function MafiaRoom({ code }: { code: string }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => setToken(loadToken(code)), [code]);

  const { view, problem, offset, refresh } = useMafia(code, token ?? null);

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

  return <Game view={view} token={token} offset={offset} refresh={refresh} />;
}

function JoinCard({ code, onJoined }: { code: string; onJoined: (token: string) => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await api<{ token: string }>(`/api/mafia/games/${code}/join`, { name });
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
        <label htmlFor="mafia-name" className="text-[14px] font-bold">
          내 이름
        </label>
        <input
          id="mafia-name"
          value={name}
          maxLength={NAME_LIMIT}
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

// ---------- 게임 화면 ----------

interface Ctx {
  view: MafiaView;
  token: string;
  offset: React.MutableRefObject<number>;
  refresh: () => void;
}

function nameOf(view: MafiaView, id: string | null | undefined): string {
  return view.players.find((p) => p.id === id)?.name ?? '누군가';
}

function roleOf(view: MafiaView, id: string | null | undefined): string {
  const r = view.players.find((p) => p.id === id)?.role;
  return r ? ROLES[r].label : '';
}

// 밤·낮 결과 안내 문구
function eventText(view: MafiaView): string | null {
  const e = view.event;
  if (!e) return null;
  if (e.type === 'night') {
    if (e.killedId) {
      const role = roleOf(view, e.killedId);
      return `${nameOf(view, e.killedId)} 님이 밤사이 마피아에게 희생되었습니다.${role ? ` (${role})` : ''}`;
    }
    return e.attacked ? '마피아가 누군가를 노렸지만 의사가 살려냈습니다.' : '조용한 밤이었습니다. 아무 일도 없었어요.';
  }
  if (e.executedId) {
    const role = roleOf(view, e.executedId);
    return `${nameOf(view, e.executedId)} 님이 투표로 처형되었습니다.${role ? ` (${role})` : ''}`;
  }
  return e.tie ? '동점이라 아무도 처형되지 않았습니다.' : '투표가 없어 아무도 처형되지 않았습니다.';
}

function Game(ctx: Ctx) {
  const { view } = ctx;
  const night = view.phase === 'night';
  // 밤에는 어둡게, 낮에는 밝게
  const shell = night ? 'bg-[#14183a] text-white' : 'bg-white text-ink';

  return (
    <div className={`flex flex-col gap-5 rounded-[14px] border-2 border-ink p-5 transition-colors ${shell}`}>
      <Header {...ctx} />
      {view.phase === 'lobby' ? (
        <Lobby {...ctx} />
      ) : view.viewer === 'moderator' ? (
        <Board {...ctx} />
      ) : (
        <PlayerScreen {...ctx} />
      )}
    </div>
  );
}

const PHASE_TITLE: Record<string, string> = {
  lobby: '대기실',
  night: '밤',
  day_talk: '낮 · 토론',
  day_vote: '낮 · 투표',
  vote_result: '투표 결과',
  ended: '게임 끝',
};

function Header({ view, offset }: Ctx) {
  const left = useSecondsLeft(view.phaseEndsAt, offset);
  const night = view.phase === 'night';
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className={`text-[13px] font-bold ${night ? 'text-white/60' : 'text-inkMuted'}`}>
          방 코드 <span className="font-latin tracking-[0.15em]">{view.code}</span>
          {view.dayNo > 0 && view.phase !== 'ended' && <> · {view.dayNo}일차</>}
        </p>
        <h2 className="text-[28px] font-black leading-tight">
          <span aria-hidden>{night ? '🌙 ' : view.phase === 'lobby' || view.phase === 'ended' ? '' : '☀️ '}</span>
          {PHASE_TITLE[view.phase]}
        </h2>
      </div>
      {left != null && view.phase !== 'ended' && (
        <p aria-live="off" className="font-latin text-[34px] font-semibold leading-none tabular-nums">
          {mmss(left)}
        </p>
      )}
    </div>
  );
}

// ---------- 대기실 ----------

function Lobby({ view, token, refresh }: Ctx) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/games/mafia/${view.code}` : '';
  const [copied, setCopied] = useState(false);
  const n = view.players.length;
  const m = mafiaCount(Math.max(n, MIN_PLAYERS));

  async function start() {
    setBusy(true);
    setError('');
    const res = await api(`/api/mafia/games/${view.code}/start`, {}, token);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    refresh();
  }

  async function kick(id: string) {
    await api(`/api/mafia/games/${view.code}/kick`, { playerId: id }, token);
    refresh();
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hoegilab/mafia-group.webp"
        alt="마피아 게임 캐릭터: 시민, 마피아, 경찰, 의사 넙죽이"
        width={1100}
        height={566}
        className="mx-auto -mb-1 w-full max-w-[360px]"
      />
      <div className="flex flex-col gap-2 rounded-[10px] bg-lime p-4">
        <p className="text-[13px] font-bold text-inkMuted">친구들에게 이 코드나 링크를 보내 주세요</p>
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
          참가자 {n}명{view.mode === 'host_moderates' && <span className="font-normal"> · 전광판 모드 (진행자는 참가하지 않아요)</span>}
        </p>
        {n === 0 ? (
          <p className="text-[14px] text-inkMuted">아직 아무도 없어요.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {view.players.map((p) => (
              <li key={p.id} className={`flex items-center gap-1 rounded-full border-2 border-ink py-1 pl-3 text-[15px] font-bold ${view.isHost && !p.isYou ? 'pr-1' : 'pr-3'} ${p.isYou ? 'bg-sticker' : 'bg-white'}`}>
                {p.name}
                {p.isYou && <span className="text-[11px]">(나)</span>}
                {view.isHost && !p.isYou && (
                  <button type="button" onClick={() => kick(p.id)} aria-label={`${p.name} 내보내기`} className="grid h-7 w-7 place-items-center rounded-full text-[16px] text-seal">
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-[13px] leading-relaxed text-inkMuted">
        밤 {view.settings.nightSecs}초 · 낮 토론 {Math.round(view.settings.talkSecs / 60)}분 · 투표 {view.settings.voteSecs}초
        {n >= MIN_PLAYERS ? ` · 마피아 ${m}명, 경찰 1명, 의사 1명, 시민 ${n - m - 2}명` : ` · ${MIN_PLAYERS}명 이상이 되면 시작할 수 있어요`}
      </p>

      {error && (
        <p role="alert" className="text-[14px] text-seal">
          {error}
        </p>
      )}
      {view.isHost ? (
        <button type="button" onClick={start} disabled={busy || n < MIN_PLAYERS} className={yellowButtonClass}>
          {n < MIN_PLAYERS ? `${MIN_PLAYERS - n}명 더 필요해요` : busy ? '시작하는 중…' : '게임 시작'}
        </button>
      ) : (
        <p className="rounded-[10px] bg-lime px-4 py-3 text-center text-[15px] font-bold text-ink">방장이 시작하기를 기다리고 있어요…</p>
      )}
    </>
  );
}

// ---------- 참가자 화면 ----------

function RoleCard({ role }: { role: Role }) {
  const r = ROLES[role];
  return (
    <div className={`relative min-h-[150px] overflow-hidden rounded-[10px] border-2 border-ink p-4 pr-[118px] ${r.team === 'mafia' ? 'bg-seal text-white' : 'bg-sticker text-ink'}`}>
      <p className="text-[13px] font-bold opacity-80">내 직업</p>
      <p className="text-[32px] font-black leading-tight">{r.label}</p>
      <p className="mt-1 text-[14px] leading-snug">{r.desc}</p>
      <RoleAvatar role={role} className="absolute bottom-1 right-1 h-[140px] w-auto" />
    </div>
  );
}

function Picker({
  players,
  selectedId,
  onPick,
  tone,
  votes,
}: {
  players: ViewPlayer[];
  selectedId: string | null;
  onPick: (id: string) => void;
  tone: 'night' | 'day';
  votes?: Record<string, string> | null;
}) {
  const counts: Record<string, number> = {};
  for (const t of Object.values(votes ?? {})) counts[t] = (counts[t] ?? 0) + 1;
  return (
    <ul className="grid grid-cols-2 gap-2">
      {players.map((p) => {
        const on = selectedId === p.id;
        return (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onPick(p.id)}
              aria-pressed={on}
              className={`flex min-h-[52px] w-full items-center justify-between gap-2 rounded-[10px] border-2 px-3 text-left text-[16px] font-bold ${
                on
                  ? 'border-sticker bg-sticker text-ink'
                  : tone === 'night'
                    ? 'border-white/40 bg-white/10 text-white'
                    : 'border-ink bg-white text-ink'
              }`}
            >
              <span className="truncate">{p.name}</span>
              {counts[p.id] ? <span className="rounded-full bg-seal px-2 py-0.5 font-latin text-[13px] text-white">{counts[p.id]}</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function AliveList({ view }: { view: MafiaView }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {view.players.map((p) => (
        <li
          key={p.id}
          className={`rounded-full border-2 px-3 py-1 text-[14px] font-bold ${p.alive ? 'border-ink bg-white text-ink' : 'border-ink/30 bg-ink/10 text-ink/50 line-through'}`}
        >
          {p.name}
          {!p.alive && p.role ? ` · ${ROLES[p.role].label}` : ''}
        </li>
      ))}
    </ul>
  );
}

function PlayerScreen(ctx: Ctx) {
  const { view, token, refresh } = ctx;
  const you = view.you;
  const [error, setError] = useState('');
  if (!you) return null;

  async function act(kind: ActionKind, targetId: string) {
    setError('');
    const res = await api(`/api/mafia/games/${view.code}/action`, { kind, targetId }, token);
    if (!res.ok) setError(res.error);
    refresh();
  }

  const alivePlayers = view.players.filter((p) => p.alive);
  const announcement = eventText(view);

  if (view.phase === 'ended') return <EndScreen view={view} />;

  return (
    <>
      {you.role && <RoleCard role={you.role} />}
      {!you.alive && (
        <p className="rounded-[10px] bg-ink/10 px-4 py-3 text-[14px] font-bold text-inkMuted">
          당신은 죽었어요. 이제는 지켜보며 입을 다물어 주세요 🤫
        </p>
      )}
      {view.phase === 'night' && <NightPanel {...ctx} alivePlayers={alivePlayers} onAct={act} />}

      {view.phase === 'day_talk' && (
        <>
          {announcement && <Announcement text={announcement} />}
          <p className="text-[15px] font-bold">모여서 이야기하세요. 누가 마피아일까요?</p>
          <AliveList view={view} />
        </>
      )}

      {view.phase === 'day_vote' && (
        <>
          <p className="text-[15px] font-bold">
            {you.alive ? '처형할 사람을 고르세요. 가장 많은 표를 받은 사람이 처형돼요.' : '투표 중이에요.'}
          </p>
          {you.alive ? (
            <Picker
              players={alivePlayers.filter((p) => !p.isYou)}
              selectedId={view.myTargetId}
              onPick={(id) => act('vote', id)}
              tone="day"
              votes={view.votes}
            />
          ) : (
            <AliveList view={view} />
          )}
          {view.votes && (
            <p className="text-[13px] text-inkMuted">
              {Object.keys(view.votes).length} / {alivePlayers.length}명 투표했어요
            </p>
          )}
        </>
      )}

      {view.phase === 'vote_result' && (
        <>
          {announcement && <Announcement text={announcement} />}
          <AliveList view={view} />
          <p className="text-[13px] text-inkMuted">곧 밤이 됩니다…</p>
        </>
      )}
      {error && (
        <p role="alert" className="text-[14px] text-seal">
          {error}
        </p>
      )}
    </>
  );
}

function Announcement({ text }: { text: string }) {
  return <p className="rounded-[10px] border-2 border-ink bg-lime px-4 py-3 text-[17px] font-black leading-snug text-ink">{text}</p>;
}

function NightPanel({
  view,
  alivePlayers,
  onAct,
}: Ctx & { alivePlayers: ViewPlayer[]; onAct: (kind: ActionKind, id: string) => void }) {
  const you = view.you!;
  if (!you.alive || you.role === 'citizen' || !you.role) {
    return (
      <p className="py-6 text-center text-[18px] font-bold leading-relaxed text-white/80">
        밤이 되었습니다.
        <br />
        눈을 감고 기다려 주세요.
      </p>
    );
  }
  const role = you.role;
  const mafiaMates = view.players.filter((p) => p.role === 'mafia' && !p.isYou);
  const prompt = { mafia: '오늘 밤 처단할 사람을 고르세요', police: '조사할 사람을 고르세요', doctor: '살릴 사람을 고르세요' }[role];
  const choices = alivePlayers.filter((p) => (role === 'mafia' ? p.role !== 'mafia' : role === 'police' ? !p.isYou : true));
  const votes = view.mafiaVotes;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[17px] font-bold">{prompt}</p>
      {role === 'mafia' && mafiaMates.length > 0 && (
        <p className="text-[13px] text-white/70">동료 마피아: {mafiaMates.map((p) => p.name).join(', ')} · 표가 가장 많은 사람이 희생돼요 (동점이면 무작위)</p>
      )}
      <Picker players={choices} selectedId={view.myTargetId} onPick={(id) => onAct(role as ActionKind, id)} tone="night" votes={role === 'mafia' ? votes : null} />
      {role === 'mafia' && votes && Object.keys(votes).length > 0 && (
        <ul className="text-[13px] text-white/70">
          {Object.entries(votes).map(([voter, target]) => (
            <li key={voter}>
              {nameOf(view, voter)} → {nameOf(view, target)}
            </li>
          ))}
        </ul>
      )}
      {role === 'police' && view.policeResults && view.policeResults.length > 0 && (
        <div className="rounded-[10px] bg-white/10 p-3 text-[14px]">
          <p className="mb-1 font-bold">조사 기록</p>
          {view.policeResults.map((r) => (
            <p key={r.dayNo + r.targetId}>
              {r.dayNo}일차 · {nameOf(view, r.targetId)}: <b className={r.isMafia ? 'text-[#ff8a80]' : 'text-[#9be7a6]'}>{r.isMafia ? '마피아입니다' : '마피아가 아닙니다'}</b>
            </p>
          ))}
        </div>
      )}
      {view.myTargetId && <p className="text-[13px] text-white/70">고른 사람: {nameOf(view, view.myTargetId)} (시간 안에는 바꿀 수 있어요)</p>}
    </div>
  );
}

function EndScreen({ view }: { view: MafiaView }) {
  const win = view.winner;
  const youTeam = view.you?.role ? ROLES[view.you.role].team : null;
  return (
    <>
      <div className={`rounded-[10px] border-2 border-ink p-5 text-center ${win === 'mafia' ? 'bg-seal text-white' : 'bg-sticker text-ink'}`}>
        <p className="text-[14px] font-bold opacity-80">{view.you && youTeam ? (youTeam === win ? '승리!' : '패배') : '결과'}</p>
        <p className="text-[30px] font-black leading-tight">{win === 'mafia' ? '마피아의 승리' : '시민의 승리'}</p>
      </div>
      {eventText(view) && <Announcement text={eventText(view)!} />}
      <RoleTable view={view} />
      <a href="/games/mafia" className={`${stickerButtonClass} self-start`}>
        새 게임 하러 가기
      </a>
    </>
  );
}

function RoleTable({ view }: { view: MafiaView }) {
  return (
    <ul className="grid grid-cols-2 gap-2">
      {view.players.map((p) => (
        <li key={p.id} className={`flex items-center gap-2 rounded-[10px] border-2 px-3 py-2 ${p.alive ? 'border-ink bg-white text-ink' : 'border-ink/30 bg-ink/10 text-ink/60'}`}>
          {p.role && <RoleAvatar role={p.role} className={`h-11 w-auto shrink-0 ${p.alive ? '' : 'opacity-50 grayscale'}`} />}
          <div className="min-w-0">
            <p className={`truncate text-[15px] font-bold ${p.alive ? '' : 'line-through'}`}>{p.name}</p>
            <p className={`text-[13px] font-bold ${p.role === 'mafia' ? 'text-seal' : ''}`}>{p.role ? ROLES[p.role].label : '?'}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------- 전광판 (진행자) ----------

function Board({ view, token, refresh }: Ctx) {
  const [busy, setBusy] = useState(false);
  async function ctl(body: object) {
    setBusy(true);
    await api(`/api/mafia/games/${view.code}/control`, body, token);
    setBusy(false);
    refresh();
  }
  const announcement = eventText(view);
  const night = view.phase === 'night';
  const alive = view.players.filter((p) => p.alive);

  return (
    <>
      {view.phase === 'ended' ? (
        <>
          <div className={`rounded-[10px] border-2 border-ink p-5 text-center ${view.winner === 'mafia' ? 'bg-seal text-white' : 'bg-sticker text-ink'}`}>
            <p className="text-[34px] font-black">{view.winner === 'mafia' ? '마피아의 승리' : '시민의 승리'}</p>
          </div>
          {announcement && <Announcement text={announcement} />}
        </>
      ) : (
        <>
          {announcement && !night && <Announcement text={announcement} />}
          {night && <p className="text-[18px] font-bold text-white/80">모두 눈을 감고 있어요. 마피아·경찰·의사가 폰으로 선택하는 중…</p>}
          {view.phase === 'day_vote' && view.votes && (
            <p className="text-[15px] font-bold">
              투표 {Object.keys(view.votes).length} / {alive.length}명
            </p>
          )}
        </>
      )}

      {/* 진행자에게만 보이는 전체 상황 */}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {view.players.map((p) => (
          <li key={p.id} className={`rounded-[10px] border-2 px-3 py-2 ${p.alive ? 'border-white/40 bg-white/10' : 'border-white/15 bg-black/20 text-white/40'} ${night ? '' : 'border-ink bg-white text-ink'} ${!p.alive && !night ? '!bg-ink/10 !text-ink/50' : ''}`}>
            <div className="flex items-center gap-2">
              {p.role && <RoleAvatar role={p.role} className={`h-12 w-auto shrink-0 ${p.alive ? '' : 'opacity-40 grayscale'}`} />}
              <div className="min-w-0">
                <p className={`truncate text-[16px] font-bold ${p.alive ? '' : 'line-through'}`}>{p.name}</p>
                <p className={`text-[13px] font-bold ${p.role === 'mafia' && night ? 'text-[#ff8a80]' : p.role === 'mafia' ? 'text-seal' : ''}`}>{p.role ? ROLES[p.role].label : ''}</p>
                {view.votes && view.votes[p.id] && <p className="text-[12px]">→ {nameOf(view, view.votes[p.id])}</p>}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {night && (
        <div className="rounded-[10px] bg-white/10 p-3 text-[14px] leading-relaxed">
          <p>
            마피아 표:{' '}
            {view.mafiaVotes && Object.keys(view.mafiaVotes).length
              ? Object.entries(view.mafiaVotes).map(([v, t]) => `${nameOf(view, v)}→${nameOf(view, t)}`).join(', ')
              : '아직 없음'}
          </p>
          <p>경찰 조사: {view.nightActions?.police ? nameOf(view, view.nightActions.police) : '아직 없음'}</p>
          <p>의사 보호: {view.nightActions?.doctor ? nameOf(view, view.nightActions.doctor) : '아직 없음'}</p>
        </div>
      )}

      {view.phase !== 'ended' ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => ctl({ type: 'skip' })} className={stickerButtonClass}>
            다음 단계로
          </button>
          <button type="button" disabled={busy} onClick={() => ctl({ type: 'extend', secs: 30 })} className="h-11 rounded-[10px] border-2 border-current px-4 text-[15px] font-bold">
            +30초
          </button>
          <button type="button" disabled={busy} onClick={() => ctl({ type: 'extend', secs: -30 })} className="h-11 rounded-[10px] border-2 border-current px-4 text-[15px] font-bold">
            −30초
          </button>
        </div>
      ) : (
        <a href="/games/mafia" className={`${stickerButtonClass} self-start`}>
          새 게임 하러 가기
        </a>
      )}
    </>
  );
}
