'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ADJ, BY_ID, RAILS, REGIONS, SIDE_COLOR, SIDE_NAME, TURN_LIMIT, turnLabel, type Side } from '@/lib/nambuk/data';
import {
  COST,
  UNIT_NAME,
  applyBattle,
  autoBattle,
  botRecruit,
  botTrainRaid,
  copyGame,
  endRound,
  findTrain,
  incomeOf,
  newGame,
  nextBotMove,
  other,
  recruit,
  rollEvents,
  say,
  sendTroops,
  startTurn,
  total,
  weakenDefenders,
  type BattleResult,
  type Encounter,
  type Game,
  type Level,
  type TrainChance,
  type Units,
} from '@/lib/nambuk/game';
import { ANCHORS, MAP_H, MAP_W, SHAPES } from '@/lib/nambuk/mapShapes';
import { BattleView, type BattleOutcome } from './BattleView';
import { FortAssault } from './FortAssault';
import { TrainRaid } from './TrainRaid';

const PAPER = '#f4e8cb';
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const LEVELS: { level: Level; name: string; blurb: string }[] = [
  { level: 1, name: '아기 장군', blurb: '느긋하게 움직여요. 처음이면 여기서' },
  { level: 2, name: '동네 장군', blurb: '약한 곳을 노려요' },
  { level: 3, name: '고수 장군', blurb: '공격적이고 금화도 더 벌어요' },
];

type Modal =
  | { k: 'fort'; enc: Encounter; resolve: (ok: boolean) => void }
  | { k: 'choose'; enc: Encounter; playerAtt: boolean; resolve: (auto: boolean) => void }
  | { k: 'battle'; enc: Encounter; playerAtt: boolean; river: boolean; resolve: (o: BattleOutcome) => void }
  | { k: 'train'; chance: TrainChance; resolve: (raid: boolean) => void }
  | { k: 'raid'; chance: TrainChance; resolve: (ok: boolean) => void };

export function NambukGame() {
  const [g, setG] = useState<Game | null>(null);
  const gRef = useRef<Game | null>(null);
  const [mySide, setMySide] = useState<Side>('C');
  const [level, setLevel] = useState<Level>(1);
  const [sel, setSel] = useState<string | null>(null);
  const [part, setPart] = useState<'all' | 'half'>('all');
  const [modal, setModal] = useState<Modal | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<'player' | 'bot'>('player');
  const alive = useRef(true);
  const busyRef = useRef(false);
  busyRef.current = busy;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const commit = useCallback((n: Game) => {
    gRef.current = n;
    setG(n);
  }, []);
  const mutate = useCallback(
    (fn: (n: Game) => void) => {
      if (!gRef.current) return;
      const n = copyGame(gRef.current);
      fn(n);
      commit(n);
    },
    [commit],
  );

  // ---------- 전투 흐름 (모달을 띄우고 결과를 기다린다) ----------
  const ask = <T,>(make: (resolve: (v: T) => void) => Modal) => new Promise<T>((resolve) => setModal(make(resolve)));

  async function fight(enc0: Encounter, playerSide: Side): Promise<{ enc: Encounter; res: BattleResult }> {
    let enc = enc0;
    const playerAtt = enc.attacker === playerSide;
    if (playerAtt && enc.fort) {
      const ok = await ask<boolean>((resolve) => ({ k: 'fort', enc, resolve }));
      setModal(null);
      enc = weakenDefenders(enc, ok);
    }
    const auto = await ask<boolean>((resolve) => ({ k: 'choose', enc, playerAtt, resolve }));
    setModal(null);
    if (auto) return { enc, res: autoBattle(enc) };
    const river = Math.random() < 0.55;
    const o = await ask<BattleOutcome>((resolve) => ({ k: 'battle', enc, playerAtt, river, resolve }));
    setModal(null);
    const attWon = playerAtt ? o.playerWon : !o.playerWon;
    const res: BattleResult = {
      attWon,
      attSurv: playerAtt ? o.playerSurv : o.enemySurv,
      defSurv: playerAtt ? o.enemySurv : o.playerSurv,
    };
    return { enc, res };
  }

  async function moveAndResolve(from: string, to: string, p: 'all' | 'half', playerSide: Side) {
    const n = copyGame(gRef.current as Game);
    const enc = sendTroops(n, from, to, p);
    commit(n);
    if (!enc) return;
    const { enc: used, res } = await fight(enc, playerSide);
    if (!alive.current) return;
    mutate((x) => applyBattle(x, used, res));
  }

  // ---------- 턴 진행 ----------
  async function beginPlayerTurn(playerSide: Side) {
    mutate((n) => startTurn(n, playerSide));
    const cur = gRef.current as Game;
    if (cur.winner) return setBusy(false);
    const chance = findTrain(cur, playerSide);
    if (chance) {
      const raid = await ask<boolean>((resolve) => ({ k: 'train', chance, resolve }));
      setModal(null);
      if (raid) {
        const ok = await ask<boolean>((resolve) => ({ k: 'raid', chance, resolve }));
        setModal(null);
        mutate((n) => {
          const foe = other(playerSide);
          if (ok) {
            const loot = 4 + Math.floor(Math.random() * 4);
            const lost = Math.min(n.gold[foe], 3);
            n.gold[playerSide] += loot;
            n.gold[foe] -= lost;
            say(n, `열차 습격 성공! 금화 ${loot}을(를) 털었어요.`);
          } else {
            const r = n.regions[chance.near];
            if (r.units.i > 0) (r.units.i -= 1), (r.ready.i = Math.min(r.ready.i, r.units.i));
            say(n, '열차 습격에 실패해서 보병 한 명을 잃었어요.');
          }
        });
      }
    }
    setPhase('player');
    setBusy(false);
  }

  async function startGame() {
    const n = newGame(mySide, level);
    say(n, '전쟁이 시작됐어요! 1861년 봄.');
    commit(n);
    setSel(null);
    setBusy(true);
    await beginPlayerTurn(mySide);
  }

  async function endTurn() {
    if (busy || !g || g.winner) return;
    const me = g.player;
    const bot = other(me);
    setBusy(true);
    setSel(null);
    setPhase('bot');
    mutate((n) => {
      startTurn(n, bot);
      botRecruit(n, bot);
      botTrainRaid(n, bot);
    });
    await sleep(500);
    let guard = 0;
    while (alive.current && guard++ < 40) {
      const cur = gRef.current as Game;
      if (cur.winner) break;
      const mv = nextBotMove(cur, bot);
      if (!mv) break;
      await moveAndResolve(mv.from, mv.to, mv.part, me);
      await sleep(350);
    }
    if (!alive.current) return;
    if ((gRef.current as Game).winner) return setBusy(false);
    mutate((n) => {
      endRound(n);
      if (!n.winner) rollEvents(n);
    });
    if ((gRef.current as Game).winner) return setBusy(false);
    await sleep(300);
    await beginPlayerTurn(me);
  }

  // ---------- 지도 입력 ----------
  async function clickRegion(id: string) {
    if (!g || busy || g.winner || phase !== 'player') return;
    const me = g.player;
    const from = sel ? g.regions[sel] : null;
    if (sel && from && from.owner === me && total(from.ready) > 0 && ADJ[sel].includes(id)) {
      setBusy(true);
      const origin = sel;
      setSel(null);
      await moveAndResolve(origin, id, part, me);
      setSel(id);
      setBusy(false);
      return;
    }
    setSel(id === sel ? null : id);
  }

  function doRecruit(kind: keyof Units) {
    if (!g || !sel || busy) return;
    mutate((n) => {
      recruit(n, n.player, sel, kind);
    });
  }

  // ---------- 화면 ----------
  if (!g) {
    return (
      <div className="mx-auto flex w-full max-w-[520px] flex-col gap-4 rounded-[14px] border-2 border-ink p-5" style={{ background: PAPER }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hoegilab/nb-hero.webp" alt="1860년대 신문 삽화풍의 남북 양군 야영지" className="-mx-5 -mt-5 aspect-[16/8] w-[calc(100%+2.5rem)] max-w-none rounded-t-[12px] border-b-2 border-ink object-cover object-center" />
        <div>
          <h3 className="text-[18px] font-black">남북전쟁</h3>
          <p className="text-[13px] leading-snug text-inkMuted">옛날 DOS 게임 「남북전쟁」을 떠올리며 만든 한 판. 지도에서 땅을 차지하고, 맞붙으면 실시간으로 싸워요. 상대는 컴퓨터예요.</p>
        </div>
        <div>
          <h3 className="mb-2 text-[16px] font-black">어느 쪽으로 할래요?</h3>
          <div className="grid grid-cols-2 gap-2">
            {(['C', 'U'] as Side[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setMySide(s)}
                aria-pressed={mySide === s}
                className={`rounded-[10px] border-2 border-ink p-3 text-left ${mySide === s ? 'bg-sticker' : 'bg-white'}`}
              >
                <span className="flex items-center gap-2 text-[16px] font-black">
                  <span aria-hidden className="inline-block h-4 w-4 rounded-full border-2 border-ink" style={{ background: SIDE_COLOR[s] }} />
                  {SIDE_NAME[s]}
                </span>
                <span className="mt-0.5 block text-[12px] text-inkMuted">{s === 'C' ? '병력이 강하게 시작해요' : '땅과 금화가 더 많아요'}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-[16px] font-black">상대 장군</h3>
          <div className="flex flex-col gap-2">
            {LEVELS.map((l) => (
              <button
                key={l.level}
                type="button"
                onClick={() => setLevel(l.level)}
                aria-pressed={level === l.level}
                className={`rounded-[10px] border-2 border-ink px-4 py-2 text-left ${level === l.level ? 'bg-sticker' : 'bg-white'}`}
              >
                <span className="block text-[15px] font-black">{l.name}</span>
                <span className="block text-[13px] text-inkMuted">{l.blurb}</span>
              </button>
            ))}
          </div>
        </div>
        <details className="rounded-[10px] border-2 border-ink bg-lime/60 px-3 py-2 text-[13px] leading-relaxed">
          <summary className="cursor-pointer font-bold">규칙 보기</summary>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>지도에서 병력이 있는 지역을 누르고, 이웃한 지역을 누르면 이동해요. 빈 땅은 그냥 차지해요.</li>
            <li>적이 있는 곳으로 가면 전투가 시작돼요. 직접 지휘하거나 자동으로 맡길 수 있어요.</li>
            <li>실시간 전투에서는 보병·기병·대포를 골라 명령해요. 적 주둔지를 부수면 이기고, 대포로 다리도 부술 수 있어요.</li>
            <li>★ 수도(워싱턴·리치먼드)를 점령하면 전쟁에서 이겨요(상대가 한 턴 안에 못 되찾아야 해요). 요새는 먼저 액션으로 습격해 수비를 약하게 만들 수 있어요.</li>
            <li>적 열차가 지나가면 습격해서 금화를 털 수 있어요. 폭풍우, 인디언·멕시코군의 습격 같은 돌발 상황도 있어요.</li>
            <li>{TURN_LIMIT}턴(1865년 봄)까지 승부가 안 나면 더 많은 땅을 지킨 쪽이 이겨요.</li>
          </ul>
        </details>
        <button type="button" onClick={startGame} className="h-12 rounded-[10px] border-2 border-ink bg-sticker text-[16px] font-black hover:bg-[#e3c900]">
          전쟁 시작!
        </button>
      </div>
    );
  }

  const me = g.player;
  const bot = other(me);
  const selReg = sel ? g.regions[sel] : null;
  const targets = sel && selReg && selReg.owner === me && total(selReg.ready) > 0 && phase === 'player' && !busy ? ADJ[sel] : [];

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-3">
      {/* 위 줄: 날짜·금화 */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border-2 border-ink px-3 py-2 text-[14px] font-bold" style={{ background: PAPER }}>
        <span>
          {turnLabel(Math.min(g.turn, TURN_LIMIT))} <span className="font-latin text-[12px] text-inkMuted">({Math.min(g.turn, TURN_LIMIT)}/{TURN_LIMIT})</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-3.5 w-3.5 rounded-full border-2 border-ink" style={{ background: SIDE_COLOR[me] }} />
          {SIDE_NAME[me]} · 금화 <span className="font-latin tabular-nums">{g.gold[me]}</span>
          <span className="font-latin text-[12px] text-inkMuted">(+{incomeOf(g, me)})</span>
        </span>
        <span className="text-[12px] text-inkMuted">
          {SIDE_NAME[bot]} 금화 {g.gold[bot]}
        </span>
      </div>

      {g.holds && !g.winner && (
        <p role="status" className="rounded-[10px] border-2 border-ink bg-sticker px-3 py-2 text-[13px] font-bold">
          {g.holds.side === me ? `${BY_ID[g.holds.id].name}을(를) 점령 중! 이번 턴이 끝나고 상대가 못 되찾으면 이겨요.` : `${BY_ID[g.holds.id].name}을(를) 빼앗겼어요! 이번 턴에 되찾지 못하면 져요.`}
        </p>
      )}
      <MapView g={g} sel={sel} targets={targets} onPick={clickRegion} />

      {/* 선택한 지역 */}
      <div className="rounded-[10px] border-2 border-ink p-3" style={{ background: PAPER }}>
        {sel && selReg ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-[16px] font-black">
                {BY_ID[sel].name}
                {BY_ID[sel].capital && ' ★'}
                {BY_ID[sel].fort && ' ⚑'}
              </h4>
              <span className="text-[13px] text-inkMuted">
                {selReg.owner ? SIDE_NAME[selReg.owner] : '중립'} · 수입 {BY_ID[sel].income}
                {selReg.burned && ' (테러로 이번 턴 없음)'}
                {selReg.stuck && ' · 고립됨'}
              </span>
            </div>
            <p className="text-[14px]">
              보병 <b className="font-latin">{selReg.units.i}</b> · 기병 <b className="font-latin">{selReg.units.c}</b> · 대포 <b className="font-latin">{selReg.units.k}</b>
              {selReg.owner === me && total(selReg.ready) > 0 && <span className="ml-2 rounded-full bg-sticker px-2 py-0.5 text-[12px] font-bold">움직일 수 있어요</span>}
            </p>
            {selReg.owner === me && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex overflow-hidden rounded-[8px] border-2 border-ink text-[13px] font-bold">
                  {(['all', 'half'] as const).map((p) => (
                    <button key={p} type="button" onClick={() => setPart(p)} aria-pressed={part === p} className={`px-3 py-1.5 ${part === p ? 'bg-ink text-white' : 'bg-white'}`}>
                      {p === 'all' ? '전부 이동' : '절반만 이동'}
                    </button>
                  ))}
                </div>
                {(['i', 'c', 'k'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    disabled={busy || g.gold[me] < COST[k]}
                    onClick={() => doRecruit(k)}
                    className="h-9 rounded-[8px] border-2 border-ink bg-white px-3 text-[13px] font-bold disabled:opacity-40"
                  >
                    +{UNIT_NAME[k]} ({COST[k]})
                  </button>
                ))}
              </div>
            )}
            {targets.length > 0 && <p className="text-[12px] text-inkMuted">빨간 점선 지역을 누르면 병력이 이동해요.</p>}
          </div>
        ) : (
          <p className="text-[13px] text-inkMuted">지도에서 우리 병력이 있는 지역을 누르고, 이웃한 지역을 눌러 보내세요. 금화로 병력을 더 뽑을 수도 있어요.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={endTurn}
          disabled={busy || !!g.winner}
          className="h-11 rounded-[10px] border-2 border-ink bg-sticker px-5 text-[15px] font-black hover:bg-[#e3c900] disabled:opacity-50"
        >
          {phase === 'bot' ? '상대가 움직이는 중…' : '턴 끝내기'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('이 전쟁을 그만두고 처음으로 돌아갈까요?')) {
              setG(null);
              gRef.current = null;
              setModal(null);
              setBusy(false);
              alive.current = false;
              setTimeout(() => (alive.current = true), 0);
            }
          }}
          className="text-[13px] underline"
        >
          그만두기
        </button>
      </div>

      <ul className="rounded-[10px] border-2 border-dashed border-ink/40 px-3 py-2 text-[13px] leading-relaxed" aria-label="전황">
        {g.log.slice(0, 5).map((l, i) => (
          <li key={`${l}-${i}`} className={i === 0 ? 'font-bold' : 'text-inkMuted'}>
            {l}
          </li>
        ))}
      </ul>

      {g.winner && <EndCard g={g} onAgain={() => (setG(null), (gRef.current = null))} />}

      {/* 모달 */}
      {modal && <ModalView modal={modal} g={g} mySide={me} />}
    </div>
  );
}

// ---------- 모달 ----------
function ModalView({ modal, g, mySide }: { modal: Modal; g: Game; mySide: Side }) {
  const box = 'fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/60 p-3 sm:items-center';
  const card = 'w-full max-w-[780px] rounded-[14px] border-2 border-ink bg-[#efe2c4] p-4';
  if (modal.k === 'battle') {
    const { enc, playerAtt } = modal;
    const mine = playerAtt ? enc.att : enc.def;
    const theirs = playerAtt ? enc.def : enc.att;
    return (
      <div className={box}>
        <div className={card}>
          <BattleView
            mine={mine}
            theirs={theirs}
            mySide={mySide}
            river={modal.river}
            title={`${BY_ID[enc.to].name} 전투 ${playerAtt ? '(공격)' : '(방어)'}`}
            onDone={modal.resolve}
          />
        </div>
      </div>
    );
  }
  if (modal.k === 'raid') {
    return (
      <div className={box}>
        <div className={card}>
          <TrainRaid mySide={mySide} title={`${BY_ID[modal.chance.a].name}–${BY_ID[modal.chance.b].name} 열차`} onDone={modal.resolve} />
        </div>
      </div>
    );
  }
  if (modal.k === 'fort') {
    const guards = Math.min(7, Math.max(3, Math.round(total(modal.enc.def) / 2)));
    return (
      <div className={box}>
        <div className={card}>
          <FortAssault mySide={mySide} guardsCount={guards} title={`${BY_ID[modal.enc.to].name} 요새 습격`} onDone={modal.resolve} />
        </div>
      </div>
    );
  }
  if (modal.k === 'train') {
    const { chance } = modal;
    return (
      <div className={box}>
        <div className={`${card} max-w-[440px]`}>
          <h3 className="text-[18px] font-black">적 열차 발견!</h3>
          <p className="mt-1 text-[14px] leading-snug">
            {BY_ID[chance.a].name}–{BY_ID[chance.b].name} 철로에 {SIDE_NAME[other(mySide)]}의 금화 열차가 지나가요. {BY_ID[chance.near].name}에서 병력이 나서면 습격할 수 있어요. 실패하면 보병을 잃을 수 있어요.
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => modal.resolve(true)} className="h-11 flex-1 rounded-[10px] border-2 border-ink bg-sticker text-[15px] font-black">
              습격하기
            </button>
            <button type="button" onClick={() => modal.resolve(false)} className="h-11 flex-1 rounded-[10px] border-2 border-ink bg-white text-[15px] font-bold">
              그냥 보내기
            </button>
          </div>
        </div>
      </div>
    );
  }
  // choose
  const { enc, playerAtt } = modal;
  const mine = playerAtt ? enc.att : enc.def;
  const theirs = playerAtt ? enc.def : enc.att;
  const line = (u: Units) => `보병 ${u.i} · 기병 ${u.c} · 대포 ${u.k}`;
  return (
    <div className={box}>
      <div className={`${card} max-w-[440px]`}>
        <h3 className="text-[18px] font-black">
          {BY_ID[enc.to].name} {playerAtt ? '공격' : '방어'}
        </h3>
        <p className="mt-1 text-[14px] leading-relaxed">
          {playerAtt ? '우리' : '적'} 공격군: {line(enc.att)}
          <br />
          {playerAtt ? '적' : '우리'} 수비군: {line(enc.def)}
          {enc.fort && <span className="ml-1 text-inkMuted">(요새)</span>}
        </p>
        <p className="mt-1 text-[12px] text-inkMuted">우리 쪽: {line(mine)} / 상대: {line(theirs)}</p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => modal.resolve(false)} className="h-11 flex-1 rounded-[10px] border-2 border-ink bg-sticker text-[15px] font-black">
            직접 지휘
          </button>
          <button type="button" onClick={() => modal.resolve(true)} className="h-11 flex-1 rounded-[10px] border-2 border-ink bg-white text-[15px] font-bold">
            자동으로 맡기기
          </button>
        </div>
      </div>
    </div>
  );
}

function EndCard({ g, onAgain }: { g: Game; onAgain: () => void }) {
  const won = g.winner === g.player;
  const draw = g.winner === 'draw';
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/60 p-4">
      <div className="w-full max-w-[400px] overflow-hidden rounded-[14px] border-2 border-ink bg-[#efe2c4] p-5 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hoegilab/nb-cover.webp" alt="" aria-hidden className="-mx-5 -mt-5 mb-3 aspect-[16/9] w-[calc(100%+2.5rem)] max-w-none border-b-2 border-ink object-cover object-center" />
        <p className="text-[30px] font-black">{draw ? '무승부' : won ? '승리!' : '패배…'}</p>
        <p className="mt-1 text-[15px]">{g.reason}</p>
        <button type="button" onClick={onAgain} className="mt-4 h-12 w-full rounded-[10px] border-2 border-ink bg-sticker text-[16px] font-black">
          한 번 더
        </button>
      </div>
    </div>
  );
}

// ---------- 지도 ----------
const ART = '/hoegilab/nb-';
const OWNER_EDGE: Record<string, string> = { U: '#1f3a68', C: '#5d5a52', N: '#8a7a5a' };
const CHIP_H = 78;

function MapView({ g, sel, targets, onPick }: { g: Game; sel: string | null; targets: string[]; onPick: (id: string) => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  // 좁은 화면에서는 선택한 지역(처음엔 우리 수도)이 가운데 오게 지도를 옮긴다
  useEffect(() => {
    const el = scroller.current;
    if (!el || el.scrollWidth <= el.clientWidth + 2) return;
    const id = sel ?? (g.player === 'U' ? 'DC' : 'VA');
    const x = (ANCHORS[id].x / MAP_W) * el.scrollWidth - el.clientWidth / 2;
    el.scrollTo({ left: Math.max(0, x), behavior: first.current ? 'auto' : 'smooth' });
    first.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);
  return (
    <div className="overflow-hidden rounded-[12px] border-[3px] border-ink shadow-[4px_4px_0_#14171f]" style={{ background: PAPER }}>
      <div ref={scroller} className="overflow-x-auto">
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="block w-full min-w-[500px] select-none" role="group" aria-label="미국 동부 지도">
          <defs>
            {(['u', 'c', 'n'] as const).map((k) => (
              <pattern key={k} id={`nb-tex-${k}`} patternUnits="userSpaceOnUse" width={MAP_W} height={MAP_H}>
                <image href={`${ART}tex-${k}.webp`} width={MAP_W} height={MAP_H} preserveAspectRatio="none" />
              </pattern>
            ))}
          </defs>
          <image href={`${ART}map-us.webp`} x="0" y="0" width={MAP_W} height={MAP_H} preserveAspectRatio="none" />

          {/* 철도 */}
          {RAILS.map(([a, b]) => (
            <g key={`${a}${b}`}>
              <line x1={ANCHORS[a].px} y1={ANCHORS[a].py} x2={ANCHORS[b].px} y2={ANCHORS[b].py} stroke="#2b2418" strokeWidth={9} opacity={0.55} />
              <line x1={ANCHORS[a].px} y1={ANCHORS[a].py} x2={ANCHORS[b].px} y2={ANCHORS[b].py} stroke="#f4e8cb" strokeWidth={4} strokeDasharray="14 12" opacity={0.95} />
            </g>
          ))}

          {/* 지역 칠하기: 북군 남색, 남군 회색, 중립 크림 (먹선은 그대로 비치게 곱하기) */}
          {REGIONS.map((r) => {
            const st = g.regions[r.id];
            const k = st.owner === 'U' ? 'u' : st.owner === 'C' ? 'c' : 'n';
            const isSel = sel === r.id;
            return (
              <path
                key={r.id}
                d={SHAPES[r.id]}
                role="button"
                tabIndex={0}
                aria-label={`${r.name} ${st.owner ? SIDE_NAME[st.owner] : '중립'} 보병${st.units.i} 기병${st.units.c} 대포${st.units.k}`}
                onClick={() => onPick(r.id)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onPick(r.id)}
                fill={`url(#nb-tex-${k})`}
                fillOpacity={0.9}
                stroke={isSel ? '#f2b705' : 'none'}
                strokeWidth={isSel ? 9 : 0}
                strokeLinejoin="round"
                style={{ cursor: 'pointer', mixBlendMode: 'multiply' }}
              />
            );
          })}
          {/* 옮길 수 있는 곳 표시 */}
          {REGIONS.filter((r) => targets.includes(r.id)).map((r) => (
            <path key={`t${r.id}`} d={SHAPES[r.id]} fill="none" stroke="#9c3b2a" strokeWidth={8} strokeDasharray="22 12" strokeLinejoin="round" pointerEvents="none" />
          ))}

          {/* 라벨: 지역 이름과 병력 */}
          {REGIONS.map((r) => {
            const st = g.regions[r.id];
            const a = ANCHORS[r.id];
            const away = r.id === 'DC'; // 워싱턴만 바다 쪽 라벨에 선을 긋는다
            const nameW = r.name.length * 30;
            const w = Math.max(124, nameW + 26) + (r.capital || r.fort ? 26 : 0);
            const movable = st.owner === g.player && total(st.ready) > 0 && !g.winner;
            const isSel = sel === r.id;
            const edge = OWNER_EDGE[st.owner ?? 'N'];
            const hasUnits = total(st.units) > 0;
            const iconX = a.x - w / 2 + 8;
            return (
              <g key={`l${r.id}`} onClick={() => onPick(r.id)} style={{ cursor: 'pointer' }}>
                {away && (
                  <g pointerEvents="none">
                    <line x1={a.px} y1={a.py} x2={a.x} y2={a.y} stroke="#2b2418" strokeWidth={4} />
                    <circle cx={a.px} cy={a.py} r={7} fill="#2b2418" />
                  </g>
                )}
                <rect x={a.x - w / 2} y={a.y - CHIP_H / 2} width={w} height={CHIP_H} rx={10} fill={PAPER} fillOpacity={0.88} stroke={isSel ? '#f2b705' : edge} strokeWidth={isSel ? 7 : 4} />
                <text x={a.x + (r.capital || r.fort ? 13 : 0)} y={a.y - 8} textAnchor="middle" fontSize={29} fontWeight={800} fill="#1a1a1f" style={{ pointerEvents: 'none' }}>
                  {r.name}
                </text>
                {hasUnits ? (
                  <text x={a.x + (r.capital || r.fort ? 13 : 0)} y={a.y + 27} textAnchor="middle" fontSize={32} fontWeight={800} fill={st.owner === 'U' ? '#1f3a68' : '#2b2a27'} style={{ pointerEvents: 'none' }}>
                    {st.units.i}·{st.units.c}·{st.units.k}
                  </text>
                ) : (
                  Array.from({ length: r.income }).map((_, i) => (
                    <image key={i} href={`${ART}icon-coin.webp`} x={a.x - (r.income * 34) / 2 + i * 34 + (r.capital || r.fort ? 13 : 0)} y={a.y + 6} width={30} height={30} style={{ pointerEvents: 'none' }} />
                  ))
                )}
                {r.capital && <image href={`${ART}icon-star.webp`} x={iconX} y={a.y - 34} width={30} height={30} style={{ pointerEvents: 'none' }} />}
                {r.fort && <image href={`${ART}icon-fort.webp`} x={iconX} y={a.y + (r.capital ? 0 : -16)} width={32} height={32} style={{ pointerEvents: 'none' }} />}
                {movable && <circle cx={a.x + w / 2 - 6} cy={a.y - CHIP_H / 2 + 6} r={11} fill="#f2d80e" stroke="#14171f" strokeWidth={3} pointerEvents="none" />}
                {st.burned && <image href={`${ART}icon-bomb.webp`} x={a.x + w / 2 - 30} y={a.y + 2} width={44} height={44} style={{ pointerEvents: 'none' }} />}
                {st.stuck && <image href={`${ART}icon-storm.webp`} x={a.x + w / 2 - 30} y={a.y - CHIP_H / 2 - 30} width={44} height={44} style={{ pointerEvents: 'none' }} />}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="border-t-2 border-ink px-3 py-1 text-[11px] leading-snug text-[#4a3f2c]" style={{ background: '#ecdcb8' }}>
        숫자는 보병·기병·대포 · 별 수도 · 성채 요새 · 점선 철도 · 노란 점은 움직일 수 있는 병력 · 금화는 지역 수입 · 좁은 화면에선 좌우로 밀어 보세요
      </p>
    </div>
  );
}
