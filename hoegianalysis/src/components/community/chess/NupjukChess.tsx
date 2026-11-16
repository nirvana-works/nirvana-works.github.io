'use client';

import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BOT_LEVELS, pickBotMove, type BotLevel } from '@/lib/chessBot';

// 넙죽이 체스: 봇과 두거나(link 없음), 방에서 친구와 둔다(link 있음). 판·말은 public/hoegilab/chess-*.webp 그림을 쓴다

export type ChessMsg =
  | { t: 'move'; n: number; from: string; to: string; promotion?: string; gn: number }
  | { t: 'resign'; gn: number }
  | { t: 'offer'; gn: number }
  | { t: 'accept'; gn: number }
  | { t: 'decline'; gn: number }
  | { t: 'new'; gn: number }
  | { t: 'sync'; gn: number; pgn: string; end: End | null };

export interface ChessLink {
  role: 'host' | 'guest';
  names: [string, string];
  side: number; // 0 랜덤 · 1 방장 백 · 2 방장 흑
  code: string;
  linked: boolean;
  send: (m: ChessMsg) => void;
  subscribe: (fn: (m: ChessMsg) => void) => () => void;
}

type End = { kind: 'resign'; loser: Color } | { kind: 'agreed' };

const FILES = 'abcdefgh';
const PIECE_NAME: Record<PieceSymbol, string> = { k: '킹', q: '퀸', r: '룩', b: '비숍', n: '나이트', p: '폰' };
const PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
// 말풍선의 넙죽이: 폰 모양 캐릭터가 기분에 따라 몸짓을 바꾼다
const MOOD_STYLE: Record<Mood, string> = {
  idle: '',
  cheer: 'animate-bounce',
  wow: '-translate-y-1 scale-110',
  worry: '-rotate-6',
  over: 'rotate-12 translate-y-1 saturate-50',
};
function PawnMascot({ mood, className }: { mood: Mood; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/hoegilab/chess-mascot.webp" alt="" aria-hidden className={`w-auto origin-bottom transition-transform duration-300 drop-shadow-[0_3px_0_rgba(20,23,31,0.3)] ${MOOD_STYLE[mood]} ${className}`} />;
}
type Mood = 'idle' | 'cheer' | 'wow' | 'worry' | 'over';

function hostIsWhite(side: number, code: string, gn: number): boolean {
  if (side === 1) return gn % 2 === 0;
  if (side === 2) return gn % 2 === 1;
  return (parseInt(code, 10) + gn) % 2 === 0;
}

// 말 그림: 칸 하나를 꽉 채우는 정사각 투명 이미지 (바닥이 아래쪽에 닿게 그려져 있다)
const ART = '/hoegilab/chess-';
function PieceView({ type, color, className = '' }: { type: PieceSymbol; color: Color; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`${ART}${color}${type}.webp`} alt="" aria-hidden draggable={false} className={`pointer-events-none select-none object-contain object-bottom ${className}`} />;
}

export function NupjukChess({ link }: { link?: ChessLink }) {
  const gameRef = useRef(new Chess());
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);

  const [gn, setGn] = useState(0); // 몇 번째 판 (친구와 둘 때 판마다 색이 바뀐다)
  const gnRef = useRef(0);
  gnRef.current = gn;
  const [end, setEnd] = useState<End | null>(null);
  const endRef = useRef<End | null>(null);
  endRef.current = end;

  // 봇 설정
  const [started, setStarted] = useState(!!link);
  const [level, setLevel] = useState<BotLevel>(2);
  const [botPick, setBotPick] = useState<'w' | 'b' | 'r'>('w');
  const [botColor, setBotColor] = useState<Color>('b');
  const [thinking, setThinking] = useState(false);

  const [selected, setSelected] = useState<Square | null>(null);
  const [pending, setPending] = useState<{ from: Square; to: Square } | null>(null);
  const [flip, setFlip] = useState(false);
  const [last, setLast] = useState<{ from: string; to: string } | null>(null);
  const [offerFrom, setOfferFrom] = useState<'me' | 'them' | null>(null);
  const [mood, setMood] = useState<Mood>('idle');
  const [line, setLine] = useState('한 판 둬 볼까요?');

  const game = gameRef.current;
  const myColor: Color = link ? (hostIsWhite(link.side, link.code, gn) === (link.role === 'host') ? 'w' : 'b') : botColor === 'w' ? 'b' : 'w';
  const myColorRef = useRef(myColor);
  myColorRef.current = myColor;

  const over = !!end || game.isGameOver();
  const turn = game.turn();
  const history = game.history({ verbose: true });
  const lastMove = history[history.length - 1] ?? null;

  const names = link ? (hostIsWhite(link.side, link.code, gn) ? link.names : ([link.names[1], link.names[0]] as [string, string])) : (['나', '넙죽이'] as [string, string]);
  // names[0]=백, names[1]=검. 봇 대국에서는 내가 흰/검에 따라 바꾼다
  const whiteName = link ? names[0] : myColor === 'w' ? '나' : BOT_LEVELS.find((b) => b.level === level)!.name;
  const blackName = link ? names[1] : myColor === 'b' ? '나' : BOT_LEVELS.find((b) => b.level === level)!.name;

  // ---------- 결과 문구 ----------
  const result = useMemo(() => {
    if (end?.kind === 'resign') return { text: `${end.loser === 'w' ? whiteName : blackName}님이 기권했어요.`, winner: (end.loser === 'w' ? 'b' : 'w') as Color | null };
    if (end?.kind === 'agreed') return { text: '비기기로 합의했어요.', winner: null };
    if (game.isCheckmate()) return { text: `체크메이트! ${turn === 'w' ? blackName : whiteName}님 승리`, winner: (turn === 'w' ? 'b' : 'w') as Color | null };
    if (game.isStalemate()) return { text: '스테일메이트. 둘 수가 없어서 무승부예요.', winner: null };
    if (game.isInsufficientMaterial()) return { text: '남은 말로는 이길 수 없어서 무승부예요.', winner: null };
    if (game.isThreefoldRepetition()) return { text: '같은 모양이 세 번 나와서 무승부예요.', winner: null };
    if (game.isDraw()) return { text: '50수 규칙으로 무승부예요.', winner: null };
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [end, history.length, whiteName, blackName]);

  // 끝났을 때 넙죽이 반응
  useEffect(() => {
    if (!result) return;
    if (result.winner === null) {
      setMood('worry');
      setLine('비겼네요. 아슬아슬했어요.');
    } else if (result.winner === myColor) {
      setMood('cheer');
      setLine(link ? '이겼어요! 멋져요!' : '으악, 제가 졌어요! 한 판 더요!');
    } else {
      setMood('over');
      setLine(link ? '아쉬워요. 다음 판에 갚아요.' : '제가 이겼어요! 다음엔 봐드릴게요.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.text]);

  // ---------- 수 두기 ----------
  const afterMove = useCallback(
    (m: Move, mine: boolean) => {
      setLast({ from: m.from, to: m.to });
      setSelected(null);
      setPending(null);
      setOfferFrom(null);
      if (game.isCheckmate()) return; // 결과 문구는 result가 처리
      if (game.isCheck()) {
        setMood('wow');
        setLine(mine ? '체크! 상대가 놀랐어요.' : '체크예요! 킹을 지켜요!');
      } else if (m.captured) {
        setMood(mine ? 'cheer' : 'worry');
        setLine(mine ? `${PIECE_NAME[m.captured]}을(를) 잡았어요!` : `${PIECE_NAME[m.captured]}을(를) 잡혔어요…`);
      } else if (m.san.startsWith('O-O')) {
        setMood('idle');
        setLine('캐슬링! 킹이 안전해졌어요.');
      } else {
        setMood('idle');
        setLine(mine ? '좋은 수예요.' : '음… 생각해 볼게요.');
      }
    },
    [game],
  );

  const play = useCallback(
    (from: string, to: string, promotion: string | undefined, mine: boolean): Move | null => {
      try {
        const m = game.move({ from, to, promotion });
        afterMove(m, mine);
        bump();
        return m;
      } catch {
        return null;
      }
    },
    [afterMove, bump, game],
  );

  // 친구 대국 메시지 받기
  useEffect(() => {
    if (!link) return;
    return link.subscribe((m) => {
      if (m.t === 'sync') {
        const mineLen = gameRef.current.history().length;
        const newer = m.gn > gnRef.current;
        const longer = m.gn === gnRef.current && m.pgn && (() => {
          const t = new Chess();
          try {
            t.loadPgn(m.pgn);
          } catch {
            return false;
          }
          return t.history().length > mineLen;
        })();
        if (newer || longer) {
          const g = gameRef.current;
          g.reset();
          if (m.pgn) {
            try {
              g.loadPgn(m.pgn);
            } catch {
              g.reset();
            }
          }
          setGn(m.gn);
          setEnd(m.end);
          const h = g.history({ verbose: true });
          const lm = h[h.length - 1];
          setLast(lm ? { from: lm.from, to: lm.to } : null);
          setSelected(null);
          setPending(null);
          bump();
        } else if (m.gn === gnRef.current && m.end && !endRef.current) setEnd(m.end);
        return;
      }
      if (m.gn !== gnRef.current) {
        if (m.t === 'new' && m.gn > gnRef.current) startNew(m.gn, false);
        return;
      }
      if (m.t === 'move') {
        const g = gameRef.current;
        if (m.n !== g.history().length || g.turn() === myColorRef.current) return; // 이미 반영됐거나 내 차례
        play(m.from, m.to, m.promotion, false);
      } else if (m.t === 'resign') {
        setEnd({ kind: 'resign', loser: myColorRef.current === 'w' ? 'b' : 'w' });
      } else if (m.t === 'offer') {
        setOfferFrom('them');
      } else if (m.t === 'accept') {
        setOfferFrom(null);
        setEnd({ kind: 'agreed' });
      } else if (m.t === 'decline') {
        setOfferFrom(null);
        setLine('무승부 제안을 거절했어요.');
      } else if (m.t === 'new') {
        startNew(m.gn, false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link, play, bump]);

  // 연결되면 서로 현재 판을 알려 준다 (끊겼다 돌아와도 이어서 둘 수 있게)
  useEffect(() => {
    if (!link?.linked) return;
    link.send({ t: 'sync', gn: gnRef.current, pgn: gameRef.current.pgn(), end: endRef.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link?.linked]);

  // ---------- 새 판 ----------
  function startNew(nextGn: number, announce: boolean) {
    gameRef.current.reset();
    setGn(nextGn);
    setEnd(null);
    setLast(null);
    setSelected(null);
    setPending(null);
    setOfferFrom(null);
    setMood('idle');
    setLine(link ? '새 판이에요. 색이 바뀌었어요!' : '다시 해 봐요!');
    if (announce && link) link.send({ t: 'new', gn: nextGn });
    bump();
  }

  function startBot() {
    const mine: Color = botPick === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : botPick;
    setBotColor(mine === 'w' ? 'b' : 'w');
    gameRef.current.reset();
    setEnd(null);
    setLast(null);
    setFlip(false);
    setStarted(true);
    setMood('idle');
    setLine(mine === 'w' ? '먼저 두세요!' : '제가 먼저 둘게요.');
    bump();
  }

  // 봇 차례
  useEffect(() => {
    if (link || !started || over || turn !== botColor) return;
    setThinking(true);
    const timer = setTimeout(() => {
      const mv = pickBotMove(gameRef.current.fen(), level);
      setThinking(false);
      if (mv) play(mv.from, mv.to, mv.promotion, false);
    }, 450);
    return () => {
      clearTimeout(timer);
      setThinking(false);
    };
  }, [link, started, over, turn, botColor, level, play, history.length]);

  // ---------- 클릭 ----------
  const canMove = !over && turn === myColor && (link ? link.linked : !thinking);
  const legalFrom = useMemo(() => (selected ? game.moves({ square: selected, verbose: true }) : []), [selected, game, history.length]);

  function clickSquare(sq: Square) {
    if (!canMove || pending) return;
    const piece = game.get(sq);
    if (selected) {
      const mv = legalFrom.find((m) => m.to === sq);
      if (mv) {
        if (mv.promotion) return setPending({ from: selected, to: sq });
        return commit(selected, sq, undefined);
      }
    }
    if (piece && piece.color === myColor) setSelected(sq === selected ? null : sq);
    else setSelected(null);
  }

  function commit(from: string, to: string, promotion: string | undefined) {
    const n = game.history().length;
    const m = play(from, to, promotion, true);
    if (m && link) link.send({ t: 'move', n, from, to, promotion, gn });
  }

  function resign() {
    if (over) return;
    if (!window.confirm('정말 기권할까요?')) return;
    setEnd({ kind: 'resign', loser: myColor });
    link?.send({ t: 'resign', gn });
  }

  function undoBot() {
    if (link || thinking) return;
    const g = gameRef.current;
    if (g.history().length === 0) return;
    g.undo();
    if (g.turn() !== myColor) g.undo(); // 내 차례로 돌아올 때까지
    const h = g.history({ verbose: true });
    const lm = h[h.length - 1];
    setLast(lm ? { from: lm.from, to: lm.to } : null);
    setEnd(null);
    setSelected(null);
    setMood('idle');
    setLine('한 수 물렀어요. 이번엔 잘 두세요!');
    bump();
  }

  // ---------- 잡힌 말 ----------
  const captured = useMemo(() => {
    const byWhite: PieceSymbol[] = [];
    const byBlack: PieceSymbol[] = [];
    for (const m of history) if (m.captured) (m.color === 'w' ? byWhite : byBlack).push(m.captured);
    const order = (a: PieceSymbol, b: PieceSymbol) => PIECE_VALUE[b] - PIECE_VALUE[a];
    byWhite.sort(order);
    byBlack.sort(order);
    const diff = byWhite.reduce((s, p) => s + PIECE_VALUE[p], 0) - byBlack.reduce((s, p) => s + PIECE_VALUE[p], 0);
    return { byWhite, byBlack, diff };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.length]);

  // ---------- 화면 ----------
  if (!started) {
    return (
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4 rounded-[14px] border-2 border-ink bg-white p-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${ART}cover.webp`} alt="큐브 위에서 노는 넙죽이들" className="-mx-5 -mt-5 aspect-[4/3] w-[calc(100%+2.5rem)] max-w-none rounded-t-[12px] border-b-2 border-ink object-cover object-center" />
        <div className="flex items-end gap-2">
          <PawnMascot mood="idle" className="h-24" />
          <p className="rounded-[12px] border-2 border-ink px-3 py-2 text-[15px] font-bold">{line}</p>
        </div>
        <div>
          <h3 className="mb-2 text-[16px] font-black">상대 고르기</h3>
          <div className="flex flex-col gap-2">
            {BOT_LEVELS.map((b) => (
              <button
                key={b.level}
                type="button"
                onClick={() => setLevel(b.level)}
                aria-pressed={level === b.level}
                className={`rounded-[10px] border-2 border-ink px-4 py-2 text-left ${level === b.level ? 'bg-sticker' : 'bg-white'}`}
              >
                <span className="block text-[15px] font-black">{b.name}</span>
                <span className="block text-[13px] text-inkMuted">{b.blurb}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-[16px] font-black">내 말 색</h3>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['w', '백 (선공)'],
                ['b', '흑'],
                ['r', '랜덤'],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setBotPick(v)}
                aria-pressed={botPick === v}
                className={`h-11 rounded-[10px] border-2 border-ink text-[15px] font-bold ${botPick === v ? 'bg-sticker' : 'bg-white'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={startBot} className="h-12 rounded-[10px] border-2 border-ink bg-sticker text-[16px] font-black hover:bg-[#e3c900]">
          시작!
        </button>
      </div>
    );
  }

  const bottom: Color = flip ? (myColor === 'w' ? 'b' : 'w') : myColor;
  const ranks = bottom === 'w' ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = bottom === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const board = game.board();
  const kingSq = game.isCheck() ? (() => {
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (p && p.type === 'k' && p.color === turn) return `${FILES[f]}${8 - r}`;
    }
    return null;
  })() : null;
  const targets = new Set(legalFrom.map((m) => m.to));

  const topColor: Color = bottom === 'w' ? 'b' : 'w';
  const nameOf = (c: Color) => (c === 'w' ? whiteName : blackName);
  const takenBy = (c: Color) => (c === 'w' ? captured.byWhite : captured.byBlack);
  const lead = (c: Color) => (c === 'w' ? captured.diff : -captured.diff);

  const statusText = result
    ? result.text
    : link && !link.linked
      ? '연결이 끊겼어요. 다시 이어지는 중…'
      : thinking
        ? '넙죽이가 생각 중…'
        : turn === myColor
          ? '내 차례예요.'
          : link
            ? `${nameOf(turn)}님 차례예요.`
            : '넙죽이 차례예요.';

  const PlayerBar = ({ color }: { color: Color }) => (
    <div className="flex items-center justify-between gap-2 px-1 text-[14px]">
      <span className="flex min-w-0 items-center gap-1.5 font-bold">
        <span aria-hidden className={`inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-ink ${color === 'w' ? 'bg-white' : 'bg-ink'}`} />
        <span className="truncate">{nameOf(color)}</span>
        {turn === color && !over && <span aria-hidden className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-seal" />}
      </span>
      <span className="flex min-h-[28px] items-center text-[15px] leading-none" aria-label="잡은 말">
        {takenBy(color).map((p, i) => (
          <PieceView key={i} type={p} color={color === 'w' ? 'b' : 'w'} className={`h-7 w-7 ${i ? '-ml-3' : ''}`} />
        ))}
        {lead(color) > 0 && <span className="ml-1.5 font-latin text-[12px] font-semibold text-inkMuted">+{lead(color)}</span>}
      </span>
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-2">
      {/* 넙죽이 말풍선 */}
      <div className="flex items-end gap-2">
        <PawnMascot mood={mood} className="h-16 shrink-0" />
        <p className="relative mb-1 rounded-[12px] border-2 border-ink bg-white px-3 py-1.5 text-[14px] font-bold leading-snug">
          <span aria-hidden className="absolute -left-[8px] bottom-3 h-3 w-3 rotate-45 border-b-2 border-l-2 border-ink bg-white" />
          {line}
        </p>
      </div>

      <PlayerBar color={topColor} />

      {/* 액자는 그림 테두리를 9조각으로 늘려 얇게 쓴다 (판이 최대한 커지게) */}
      <div style={{ containerType: 'inline-size' }}>
        <div
          className="relative"
          style={{
            padding: '4.9cqw',
            marginTop: '-9cqw', // 눕히면서 위쪽에 생기는 빈 간격 보정
            transform: 'perspective(1100px) rotateX(9deg)',
            transformOrigin: '50% 100%',
            filter: 'drop-shadow(0 6px 0 #14171f) drop-shadow(0 18px 12px rgba(20,23,31,0.3))', // 판 두께 + 바닥 그림자
          }}
        >
          <div role="grid" aria-label="체스판" className="grid aspect-square w-full grid-cols-8 grid-rows-[repeat(8,minmax(0,1fr))]">
            {ranks.map((r) =>
              cols.map((f) => {
                const sq = `${FILES[f]}${8 - r}` as Square;
                const p = board[r][f];
                const light = (r + f) % 2 === 0;
                const isSel = selected === sq;
                const isTarget = targets.has(sq);
                const isLast = last && (last.from === sq || last.to === sq);
                const isCheck = kingSq === sq;
                const showFile = r === (bottom === 'w' ? 7 : 0);
                const showRank = f === (bottom === 'w' ? 0 : 7);
                return (
                  <button
                    key={sq}
                    type="button"
                    role="gridcell"
                    onClick={() => clickSquare(sq)}
                    aria-label={`${sq}${p ? ` ${p.color === 'w' ? '백' : '흑'} ${PIECE_NAME[p.type]}` : ''}`}
                    className="relative flex items-center justify-center"
                    style={{
                      boxShadow: light
                        ? 'inset 2px 2px 0 rgba(255,255,255,0.45), inset -2px -3px 0 rgba(20,23,31,0.22)'
                        : 'inset 2px 2px 0 rgba(255,255,255,0.18), inset -2px -3px 0 rgba(0,0,0,0.5)',
                      backgroundColor: light ? '#DDE5A6' : '#242836',
                      backgroundImage: `url(${ART}sq-${light ? 'light' : 'dark'}.webp)`,
                      backgroundSize: '260% 260%', // 칸마다 그림의 다른 자리를 써서 반복돼 보이지 않게 한다
                      backgroundPosition: `${(r * 37 + f * 91) % 100}% ${(r * 53 + f * 17) % 100}%`,
                    }}
                  >
                    {isLast && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`${ART}fx-last.webp`} alt="" aria-hidden className="pointer-events-none absolute inset-[3%] h-[94%] w-[94%] object-contain opacity-95" />
                    )}
                    {isSel && <span aria-hidden className={`absolute inset-0 border-[3px] ${light ? 'border-ink' : 'border-sticker'} bg-sticker/50`} />}
                    {isCheck && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`${ART}fx-check.webp`} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
                    )}
                    {p && (
                      <>
                        {/* 말 밑의 바닥 그림자 */}
                        <span aria-hidden className={`pointer-events-none absolute bottom-[5%] left-1/2 h-[12%] w-[58%] -translate-x-1/2 rounded-[50%] blur-[1.5px] ${light ? 'bg-ink/35' : 'bg-black/60'}`} />
                        <PieceView type={p.type} color={p.color} className="absolute bottom-0 left-1/2 h-[116%] w-[116%] -translate-x-1/2 drop-shadow-[0_2px_0_rgba(20,23,31,0.3)]" />
                      </>
                    )}
                    {isTarget &&
                      (p ? (
                        <span aria-hidden className={`absolute inset-[5%] rounded-full border-[3px] ${light ? 'border-ink/70' : 'border-white/70'}`} />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`${ART}fx-dot.webp`} alt="" aria-hidden className={`pointer-events-none absolute h-[34%] w-[34%] object-contain ${light ? 'opacity-80' : 'opacity-70 brightness-0 invert'}`} />
                      ))}
                    {showRank && (
                      <span aria-hidden className={`absolute left-0.5 top-0 font-latin text-[10px] font-semibold ${light ? 'text-ink/60' : 'text-white/60'}`}>
                        {8 - r}
                      </span>
                    )}
                    {showFile && (
                      <span aria-hidden className={`absolute bottom-0 right-0.5 font-latin text-[10px] font-semibold ${light ? 'text-ink/60' : 'text-white/60'}`}>
                        {FILES[f]}
                      </span>
                    )}
                  </button>
                );
              }),
            )}
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[5]"
            style={{ borderStyle: 'solid', borderWidth: '5.4cqw', borderImage: `url(${ART}frame.webp) 148 135 133 136 / 5.4cqw stretch` }}
          />

        {pending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-ink/50">
            <div className="flex flex-col gap-2 rounded-[12px] border-2 border-ink bg-white p-3">
              <p className="text-center text-[14px] font-black">승급! 무엇으로 바꿀까요?</p>
              <div className="flex gap-2">
                {(['q', 'r', 'b', 'n'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => commit(pending.from, pending.to, t)}
                    aria-label={PIECE_NAME[t]}
                    className="flex h-14 w-14 items-center justify-center rounded-[8px] border-2 border-ink bg-lime-100"
                    style={{ background: '#DDE5A6' }}
                  >
                    <PieceView type={t} color={myColor} className="h-12 w-12" />
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setPending(null)} className="text-[13px] underline">
                취소
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      <PlayerBar color={bottom} />

      <p role="status" className={`text-center text-[15px] font-black ${result ? 'text-seal' : ''}`}>
        {statusText}
      </p>

      {offerFrom === 'them' && !over && (
        <div className="flex items-center justify-between gap-2 rounded-[10px] border-2 border-ink bg-sticker px-3 py-2">
          <span className="text-[14px] font-bold">상대가 무승부를 제안했어요.</span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                link?.send({ t: 'accept', gn });
                setOfferFrom(null);
                setEnd({ kind: 'agreed' });
              }}
              className="rounded-[8px] border-2 border-ink bg-white px-3 py-1 text-[14px] font-bold"
            >
              받기
            </button>
            <button
              type="button"
              onClick={() => {
                link?.send({ t: 'decline', gn });
                setOfferFrom(null);
              }}
              className="rounded-[8px] border-2 border-ink bg-white px-3 py-1 text-[14px] font-bold"
            >
              거절
            </button>
          </span>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => setFlip((v) => !v)} className="h-10 rounded-[10px] border-2 border-ink bg-white px-3 text-[14px] font-bold">
          판 뒤집기
        </button>
        {!link && !over && (
          <button type="button" onClick={undoBot} disabled={history.length === 0 || thinking} className="h-10 rounded-[10px] border-2 border-ink bg-white px-3 text-[14px] font-bold disabled:opacity-40">
            한 수 물리기
          </button>
        )}
        {link && !over && (
          <button
            type="button"
            disabled={offerFrom !== null || history.length < 2}
            onClick={() => {
              link.send({ t: 'offer', gn });
              setOfferFrom('me');
              setLine('무승부를 제안했어요.');
            }}
            className="h-10 rounded-[10px] border-2 border-ink bg-white px-3 text-[14px] font-bold disabled:opacity-40"
          >
            {offerFrom === 'me' ? '제안함…' : '무승부 제안'}
          </button>
        )}
        {!over && (
          <button type="button" onClick={resign} className="h-10 rounded-[10px] border-2 border-ink bg-white px-3 text-[14px] font-bold text-seal">
            기권
          </button>
        )}
        {over && (
          <button
            type="button"
            onClick={() => (link ? startNew(gn + 1, true) : (setStarted(false), setLine('한 판 더 둘까요?')))}
            className="h-10 rounded-[10px] border-2 border-ink bg-sticker px-4 text-[14px] font-black hover:bg-[#e3c900]"
          >
            {link ? '한 판 더 (색 바꿔서)' : '한 판 더'}
          </button>
        )}
      </div>

      {history.length > 0 && (
        <details className="rounded-[10px] border-2 border-ink bg-white px-3 py-2 text-[14px]">
          <summary className="cursor-pointer font-bold">기보 ({history.length}수)</summary>
          <ol className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 font-latin text-[13px]">
            {history.map((m, i) => (
              <li key={i}>
                {i + 1}. {m.san}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
