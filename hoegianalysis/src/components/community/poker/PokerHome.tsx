'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { POKER_NAME_LIMIT, TURN_CHOICES } from '@/lib/pokerTypes';
import { fieldClass, yellowButtonClass } from '../formStyles';
import { api, saveToken } from './storage';

export function PokerHome() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [turnSecs, setTurnSecs] = useState(20);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'bot' | 'pvp' | null>(null);

  async function create(mode: 'bot' | 'pvp') {
    setBusy(mode);
    setError('');
    const res = await api<{ code: string; token: string }>('/api/poker/games', { mode, name, turnSecs });
    setBusy(null);
    if (!res.ok) return setError(res.error);
    saveToken(res.data.code, res.data.token);
    router.push(`/games/poker/${res.data.code}`);
  }

  function enter(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim();
    if (!/^\d{4}$/.test(code)) return setError('방 코드는 숫자 4자리예요.');
    router.push(`/games/poker/${code}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-[14px] border-2 border-ink bg-white p-5">
        <div>
          <h2 className="text-[20px] font-black">인디언 포커</h2>
          <p className="mt-1 text-[14px] leading-snug text-inkMuted">
            내 카드는 못 보고 상대 카드만 보입니다. 상대의 숫자와 행동으로 내 카드를 추리하세요. 칩 20개로 시작해서 상대 칩을 모두 가져오면 승리!
          </p>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="poker-name" className="text-[14px] font-bold">
              내 이름
            </label>
            <input
              id="poker-name"
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
          <label className="flex flex-col gap-1.5 text-[14px] font-bold">
            행동 시간
            <select
              value={turnSecs}
              onChange={(e) => setTurnSecs(Number(e.target.value))}
              className="h-12 rounded-[8px] border-2 border-ink bg-white px-2 text-[16px]"
            >
              {TURN_CHOICES.map((t) => (
                <option key={t} value={t}>
                  {t}초
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <p role="alert" className="text-[14px] text-seal">
            {error}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-[14px] border-2 border-ink bg-white p-5">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hoegilab/mafia-boss.webp" alt="" aria-hidden width={560} height={694} className="h-16 w-auto" />
          <div>
            <h3 className="text-[18px] font-black">봇과 대결</h3>
            <p className="text-[13px] text-inkMuted">혼자서 바로 시작해요. 봇은 내 카드만 보고 추리합니다.</p>
          </div>
        </div>
        <button type="button" disabled={busy !== null} onClick={() => create('bot')} className={yellowButtonClass}>
          {busy === 'bot' ? '시작하는 중…' : '봇과 시작하기'}
        </button>
      </section>

      <section className="flex flex-col gap-3 rounded-[14px] border-2 border-ink bg-white p-5">
        <div>
          <h3 className="text-[18px] font-black">친구와 대결</h3>
          <p className="text-[13px] text-inkMuted">방을 만들어 코드를 알려 주거나, 받은 코드로 들어가세요. 1대1입니다.</p>
        </div>
        <button type="button" disabled={busy !== null} onClick={() => create('pvp')} className={yellowButtonClass}>
          {busy === 'pvp' ? '만드는 중…' : '방 만들기'}
        </button>
        <form onSubmit={enter} className="flex gap-2" noValidate>
          <input
            value={joinCode}
            onChange={(e) => {
              setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4));
              setError('');
            }}
            inputMode="numeric"
            placeholder="4자리 코드"
            aria-label="방 코드"
            className={`${fieldClass} font-latin text-[20px] font-semibold tracking-[0.2em]`}
          />
          <button type="submit" className="h-12 shrink-0 rounded-[10px] border-2 border-ink bg-sticker px-5 text-[16px] font-bold text-ink hover:bg-[#e3c900]">
            입장
          </button>
        </form>
      </section>

      <Rules />
    </div>
  );
}

export function Rules() {
  return (
    <details className="rounded-[14px] border-2 border-ink bg-white p-5 text-[14px] leading-relaxed">
      <summary className="cursor-pointer text-[16px] font-black">규칙 보기</summary>
      <div className="mt-3 flex flex-col gap-3">
        <div>
          <p className="font-bold">목표와 준비</p>
          <ul className="list-disc pl-5">
            <li>각자 칩 20개로 시작하고, 1~10 카드가 두 장씩 든 덱을 씁니다.</li>
            <li>라운드마다 기본 베팅으로 칩 1개씩 냅니다. 내 카드는 못 보고 상대 카드만 보입니다.</li>
            <li>상대의 칩을 모두 가져오면 승리합니다.</li>
          </ul>
        </div>
        <div>
          <p className="font-bold">베팅과 카드 공개</p>
          <ul className="list-disc pl-5">
            <li>콜: 상대와 같은 수의 칩을 걸고 카드를 비교합니다.</li>
            <li>레이즈: 현재 베팅보다 1개 더 올립니다. 상대가 맞출 수 있는 칩까지만 걸 수 있어요.</li>
            <li>폴드: 현재 판돈을 상대에게 줍니다. 올인: 걸 수 있는 칩을 모두 겁니다.</li>
            <li>콜이나 폴드로 끝나면 양쪽 카드를 공개하고 1.5초 동안 결과를 보여줍니다.</li>
            <li>높은 카드가 판돈을 가져가고, 같은 숫자면 판돈을 다음 라운드로 이월합니다.</li>
          </ul>
        </div>
        <div>
          <p className="font-bold">폴드 페널티</p>
          <ul className="list-disc pl-5">
            <li>내 카드가 상대보다 높은데 폴드하면, 이번 라운드에 건 칩만큼 추가로 잃습니다.</li>
            <li>내 카드가 10인데 폴드하면 10칩을 추가로 잃습니다. 두 경우가 겹치면 더 큰 쪽 하나만 적용하고, 칩이 모자라면 남은 칩까지만 잃습니다.</li>
            <li>시간이 끝나면 레이즈가 없을 땐 자동 콜, 레이즈를 받은 상태면 자동 폴드입니다.</li>
          </ul>
        </div>
      </div>
    </details>
  );
}
