'use client';

import { Jua } from 'next/font/google';
import { useEffect, useRef, useState } from 'react';
import { SONG_SECONDS, playBirthdaySong } from './birthdaySong';

// 플래카드 글씨: 그림 속 둥근 손글씨 느낌
const jua = Jua({ weight: '400', subsets: ['latin'], preload: false });

const SEEN_KEY = 'hl_bday_seen';
// 그림 속 글씨 색을 차례로
const LETTER_COLORS = ['#8E6CCF', '#3E8EDB', '#4CAF50', '#F2B705', '#E85D75', '#F28C28'];

// 받침 있으면 '아', 없으면 '야' (지민아 / 하나야). 한글로 안 끝나면 조사 없이
function withCallParticle(name: string): string {
  const code = name.charCodeAt(name.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return `${name},`;
  return `${name}${(code - 0xac00) % 28 === 0 ? '야' : '아'}`;
}

function bannerText(names: string[]): string {
  return names.length === 1 ? `${withCallParticle(names[0])} 생일 축하해` : `${names.join('·')} 생일 축하해`;
}

// 오늘 생일인 멤버가 있으면 그날 첫 방문에 한 번 축하 그림을 띄운다
export function BirthdayCelebration() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const audioRef = useRef<{ ctx: AudioContext; stop: () => void; timer: number } | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/birthdays/today')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { date: string; names: string[] } | null) => {
        if (cancelled || !data || data.names.length === 0) return;
        try {
          if (localStorage.getItem(SEEN_KEY) === data.date) return;
          localStorage.setItem(SEEN_KEY, data.date);
        } catch {
          // 저장소를 못 쓰면 그냥 매번 보여준다
        }
        setNames(data.names);
        dialogRef.current?.showModal();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function stop() {
    const a = audioRef.current;
    if (!a) return;
    a.stop();
    window.clearTimeout(a.timer);
    audioRef.current = null;
    setPlaying(false);
  }

  // 브라우저는 사람이 화면을 누르기 전에는 소리를 막아서, 첫 누름에 연주를 시작한다
  async function play() {
    if (audioRef.current) return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    await ctx.resume().catch(() => {});
    const stopSong = playBirthdaySong(ctx);
    const timer = window.setTimeout(() => {
      audioRef.current = null;
      setPlaying(false);
      ctx.close().catch(() => {});
    }, SONG_SECONDS * 1000 + 600);
    audioRef.current = {
      ctx,
      timer,
      stop: () => {
        stopSong();
        window.setTimeout(() => ctx.close().catch(() => {}), 300);
      },
    };
    setPlaying(true);
  }

  useEffect(() => () => stop(), []);

  const text = bannerText(names);
  const letters = [...text];
  const visible = letters.filter((c) => c !== ' ').length;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="bday-title"
      onClose={stop}
      onClick={(e) => {
        if (e.target === dialogRef.current) dialogRef.current?.close(); // 바깥 누르면 닫기
        else if (!audioRef.current && !(e.target as HTMLElement).closest('[data-no-autoplay]')) play();
      }}
      className="m-auto w-[min(94vw,620px)] overflow-hidden rounded-[16px] border-2 border-ink bg-white p-0 backdrop:bg-ink/60"
    >
      {names.length > 0 && (
        <>
          <div className="relative [container-type:inline-size]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hoegilab/birthday-party.webp" alt="" width={1200} height={896} className="block h-auto w-full" />
            {/* 플래카드 빈자리에 이름을 넣은 축하 문구 */}
            <p
              aria-hidden
              className={`${jua.className} absolute flex items-center justify-center whitespace-nowrap leading-none`}
              style={{
                left: '35.25%',
                width: '52%',
                top: '6.97%',
                height: '16.2%',
                fontSize: `${Math.min(8, 50 / Math.max(visible, 1))}cqw`,
                WebkitTextStroke: '0.14cqw #1a1a1a',
                paintOrder: 'stroke fill',
              }}
            >
              {letters.map((c, i) =>
                c === ' ' ? (
                  <span key={i} className="inline-block w-[0.3em]" />
                ) : (
                  <span key={i} style={{ color: LETTER_COLORS[i % LETTER_COLORS.length] }}>
                    {c}
                  </span>
                ),
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <p id="bday-title" className="text-[17px] font-black">
              🎂 오늘은 {names.join(', ')}의 생일이에요!
            </p>
            <div className="flex shrink-0 gap-2" data-no-autoplay>
              <button
                type="button"
                onClick={() => (playing ? stop() : play())}
                className="h-11 rounded-[10px] border-2 border-ink bg-sticker px-4 text-[15px] font-bold"
              >
                {playing ? '⏸ 노래 멈추기' : '🎵 축하 노래'}
              </button>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="h-11 rounded-[10px] border-2 border-ink px-4 text-[15px] font-bold"
              >
                닫기
              </button>
            </div>
          </div>
        </>
      )}
    </dialog>
  );
}
