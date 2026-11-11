'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DEFAULT_SETTINGS, MIN_PLAYERS, NAME_LIMIT, type GameMode } from '@/lib/mafiaTypes';
import { fieldClass, yellowButtonClass } from '../formStyles';
import { api, saveToken } from './storage';

const NIGHT = [30, 40, 60, 90];
const TALK = [60, 120, 180, 300, 600];
const VOTE = [30, 40, 60];

function fmt(secs: number): string {
  return secs >= 60 ? `${secs / 60}분` : `${secs}초`;
}

export function MafiaHome() {
  const router = useRouter();
  const [mode, setMode] = useState<GameMode>('host_plays');
  const [hostName, setHostName] = useState('');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await api<{ code: string; token: string }>('/api/mafia/games', { mode, hostName, settings });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    saveToken(res.data.code, res.data.token);
    router.push(`/games/mafia/${res.data.code}`);
  }

  function enter(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim();
    if (!/^\d{4}$/.test(code)) return setError('방 코드는 숫자 4자리예요.');
    router.push(`/games/mafia/${code}`);
  }

  const pick = (label: string, value: number, list: number[], key: 'nightSecs' | 'talkSecs' | 'voteSecs') => (
    <label className="flex flex-col gap-1 text-[13px] font-bold">
      {label}
      <select
        value={value}
        onChange={(e) => setSettings((s) => ({ ...s, [key]: Number(e.target.value) }))}
        className="h-11 rounded-[8px] border-2 border-ink bg-white px-2 text-[15px]"
      >
        {list.map((v) => (
          <option key={v} value={v}>
            {fmt(v)}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hoegilab/mafia-group.webp"
        alt="마피아 게임 캐릭터: 시민, 마피아, 경찰, 의사 넙죽이"
        width={1100}
        height={566}
        className="mx-auto w-full max-w-[520px]"
      />
      <section className="rounded-[14px] border-2 border-ink bg-white p-5">
        <h2 className="text-[20px] font-black">방 코드로 들어가기</h2>
        <form onSubmit={enter} className="mt-3 flex gap-2" noValidate>
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

      <form onSubmit={create} className="flex flex-col gap-4 rounded-[14px] border-2 border-ink bg-white p-5" noValidate>
        <h2 className="text-[20px] font-black">새 방 만들기</h2>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-bold">진행 방식</legend>
          {(
            [
              ['host_plays', '나도 플레이', '앱이 밤·낮을 자동으로 진행해요. 시간은 미리 정해 둡니다.'],
              ['host_moderates', '전광판으로 진행', '나는 게임에 안 들어가고, 큰 화면으로 상황을 보며 시간을 조절해요.'],
            ] as const
          ).map(([value, title, desc]) => (
            <label
              key={value}
              className={`flex cursor-pointer gap-3 rounded-[10px] border-2 p-3 ${mode === value ? 'border-ink bg-[#fff6b8]' : 'border-ink/20'}`}
            >
              <input type="radio" name="mode" checked={mode === value} onChange={() => setMode(value)} className="mt-1 h-4 w-4 accent-black" />
              <span>
                <span className="block text-[15px] font-bold">{title}</span>
                <span className="block text-[13px] text-inkMuted">{desc}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {mode === 'host_plays' && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="host-name" className="text-[14px] font-bold">
              내 이름
            </label>
            <input
              id="host-name"
              value={hostName}
              maxLength={NAME_LIMIT}
              onChange={(e) => {
                setHostName(e.target.value);
                setError('');
              }}
              placeholder="이름 또는 별명"
              className={fieldClass}
            />
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {pick('밤', settings.nightSecs, NIGHT, 'nightSecs')}
          {pick('낮 토론', settings.talkSecs, TALK, 'talkSecs')}
          {pick('투표', settings.voteSecs, VOTE, 'voteSecs')}
        </div>
        <label className="flex items-center gap-2 text-[14px] font-bold">
          <input
            type="checkbox"
            checked={settings.revealRoles}
            onChange={(e) => setSettings((s) => ({ ...s, revealRoles: e.target.checked }))}
            className="h-5 w-5 accent-black"
          />
          죽은 사람의 직업 공개
        </label>
        <p className="text-[12px] leading-relaxed text-inkMuted">
          {MIN_PLAYERS}명부터 시작할 수 있어요. 직업은 마피아, 경찰, 의사, 시민이고 인원수에 맞춰 자동으로 나뉩니다.
          {mode === 'host_moderates' && ' 전광판 모드는 참가자들의 폰과 따로, 큰 화면(노트북·TV)에서 여는 걸 추천해요.'}
        </p>

        {error && (
          <p role="alert" className="text-[14px] text-seal">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className={yellowButtonClass}>
          {busy ? '만드는 중…' : '방 만들기'}
        </button>
      </form>
    </div>
  );
}
