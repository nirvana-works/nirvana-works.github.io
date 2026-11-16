'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CHESS_NAME_LIMIT } from '@/lib/chessTypes';
import { fieldClass, yellowButtonClass } from '../formStyles';
import { NupjukChess } from './NupjukChess';
import { api, loadName, saveName, saveToken } from './storage';

const SIDES = [
  { v: 0, label: '랜덤' },
  { v: 1, label: '방장 백' },
  { v: 2, label: '방장 흑' },
] as const;

export function ChessHome() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [side, setSide] = useState<number>(0);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => setName(loadName()), []);

  async function create() {
    setBusy(true);
    setError('');
    const res = await api<{ code: string; token: string }>('/api/chess/rooms', { name, target: side });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    saveName(name.trim());
    saveToken(res.data.code, res.data.token);
    router.push(`/games/chess/${res.data.code}`);
  }

  function enter(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim();
    if (!/^\d{4}$/.test(code)) return setError('방 코드는 숫자 4자리예요.');
    router.push(`/games/chess/${code}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <NupjukChess />

      <section className="mx-auto flex w-full max-w-[520px] flex-col gap-3 rounded-[14px] border-2 border-ink bg-white p-5">
        <div>
          <h3 className="text-[18px] font-black">친구와 대결</h3>
          <p className="text-[13px] text-inkMuted">방을 만들어 코드를 알려 주거나, 받은 코드로 들어가세요. 1대1이고, 각자 자기 폰이나 컴퓨터로 해요. 한 판 더 하면 색이 서로 바뀝니다.</p>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="chess-name" className="text-[14px] font-bold">
              내 이름
            </label>
            <input
              id="chess-name"
              value={name}
              maxLength={CHESS_NAME_LIMIT}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="이름 또는 별명"
              className={fieldClass}
            />
          </div>
          <label className="flex flex-col gap-1.5 text-[14px] font-bold">
            첫 판 색
            <select value={side} onChange={(e) => setSide(Number(e.target.value))} className="h-12 rounded-[8px] border-2 border-ink bg-white px-2 text-[16px]">
              {SIDES.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" disabled={busy} onClick={create} className={yellowButtonClass}>
          {busy ? '만드는 중…' : '방 만들기'}
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
        {error && (
          <p role="alert" className="text-[14px] text-seal">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
