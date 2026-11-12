'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LEXIO_NAME_LIMIT, LEXIO_TURN_CHOICES } from '@/lib/lexioTypes';
import { fieldClass, yellowButtonClass } from '../formStyles';
import { api, saveToken } from './storage';

export function LexioHome() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [turnSecs, setTurnSecs] = useState(30);
  const [botPlayers, setBotPlayers] = useState(4);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'bot' | 'pvp' | null>(null);

  async function create(mode: 'bot' | 'pvp') {
    setBusy(mode);
    setError('');
    const res = await api<{ code: string; token: string }>('/api/lexio/games', {
      mode,
      name,
      players: mode === 'bot' ? botPlayers : maxPlayers,
      turnSecs,
    });
    setBusy(null);
    if (!res.ok) return setError(res.error);
    saveToken(res.data.code, res.data.token);
    router.push(`/games/lexio/${res.data.code}`);
  }

  function enter(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim();
    if (!/^\d{4}$/.test(code)) return setError('방 코드는 숫자 4자리예요.');
    router.push(`/games/lexio/${code}`);
  }

  const countButtons = (value: number, set: (n: number) => void, label: (n: number) => string) => (
    <div className="grid grid-cols-3 gap-2">
      {[2, 3, 4].map((n) => (
        <button
          key={n}
          type="button"
          aria-pressed={value === n}
          onClick={() => set(n)}
          className={`h-11 rounded-[10px] border-2 border-ink text-[15px] font-bold ${value === n ? 'bg-sticker' : 'bg-white'}`}
        >
          {label(n)}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-[14px] border-2 border-ink bg-white p-5">
        <div>
          <h2 className="text-[20px] font-black">렉시오</h2>
          <p className="mt-1 text-[14px] leading-snug text-inkMuted">
            2~4명이 둘러앉아 타일을 먼저 모두 내려놓는 게임이에요. 내 패는 나만 보이고, 상대 패는 뒷모습만 보입니다. 내는 조합은 가운데에서 모두가 같이 봐요.
          </p>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lexio-name" className="text-[14px] font-bold">
              내 이름
            </label>
            <input
              id="lexio-name"
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
          <label className="flex flex-col gap-1.5 text-[14px] font-bold">
            행동 시간
            <select value={turnSecs} onChange={(e) => setTurnSecs(Number(e.target.value))} className="h-12 rounded-[8px] border-2 border-ink bg-white px-2 text-[16px]">
              {LEXIO_TURN_CHOICES.map((t) => (
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
            <p className="text-[13px] text-inkMuted">전체 인원을 고르면 나머지 자리는 봇이 앉아요.</p>
          </div>
        </div>
        <p className="text-[14px] font-bold">전체 인원 (나 + 봇 {botPlayers - 1}명)</p>
        {countButtons(botPlayers, setBotPlayers, (n) => `${n}명`)}
        <button type="button" disabled={busy !== null} onClick={() => create('bot')} className={yellowButtonClass}>
          {busy === 'bot' ? '시작하는 중…' : '봇과 시작하기'}
        </button>
      </section>

      <section className="flex flex-col gap-3 rounded-[14px] border-2 border-ink bg-white p-5">
        <div>
          <h3 className="text-[18px] font-black">친구와 대결</h3>
          <p className="text-[13px] text-inkMuted">방을 만들어 코드를 알려 주거나, 받은 코드로 들어가세요. 모자란 자리는 봇으로 채울 수 있어요.</p>
        </div>
        <p className="text-[14px] font-bold">최대 인원</p>
        {countButtons(maxPlayers, setMaxPlayers, (n) => `${n}명`)}
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

      <LexioRules />
    </div>
  );
}

export function LexioRules() {
  return (
    <details className="rounded-[14px] border-2 border-ink bg-white p-5 text-[14px] leading-relaxed">
      <summary className="cursor-pointer text-[16px] font-black">규칙 요약 보기</summary>
      <div className="mt-3 flex flex-col gap-3">
        <Link href="/games/lexio/rules" className="self-start rounded-full border-2 border-ink bg-sticker px-4 py-1.5 text-[14px] font-bold">
          그림으로 보는 규칙 설명 페이지 →
        </Link>
        <div>
          <p className="font-bold">목표</p>
          <ul className="list-disc pl-5">
            <li>12장의 타일을 가장 먼저 모두 내려놓으면 이겨요.</li>
            <li>타일은 구름·별·달·태양 4가지 무늬이고, 숫자는 인원 × 3까지(2명 6, 3명 9, 4명 12)예요.</li>
            <li>숫자 순서는 3이 가장 약하고 마지막이 1, 2예요. 2가 가장 세요. 같은 숫자는 구름 &lt; 별 &lt; 달 &lt; 태양 순서예요.</li>
          </ul>
        </div>
        <div>
          <p className="font-bold">내는 법</p>
          <ul className="list-disc pl-5">
            <li>돌아가며 앞 사람이 낸 것과 같은 장수의 더 센 조합을 내요. 싱글(1장), 페어(2장), 트리플(3장), 5장 조합이 있어요.</li>
            <li>5장 조합은 스트레이트 &lt; 플러시 &lt; 풀하우스 &lt; 포카드 &lt; 스트레이트 플러시 순서예요.</li>
            <li>낼 수 없거나 내기 싫으면 패스해요. 모두 패스하면 마지막에 낸 사람이 새로 시작해요(먼저 내는 사람은 패스할 수 없어요).</li>
            <li>시간이 지나면 받는 중에는 자동 패스, 먼저 낼 차례에는 가장 약한 타일 한 장이 나가요.</li>
          </ul>
        </div>
        <div>
          <p className="font-bold">점수</p>
          <ul className="list-disc pl-5">
            <li>이긴 사람이 나머지가 잃은 점수를 모두 가져가요.</li>
            <li>남은 타일 한 장이 1점이고, 8장 이상이면 ×2, 10장 이상이면 ×3이에요. 남은 2 타일이 있으면 하나마다 점수가 다시 2배가 돼요.</li>
          </ul>
        </div>
      </div>
    </details>
  );
}
