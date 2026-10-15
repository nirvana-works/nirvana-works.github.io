'use client';

import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { QRFrame } from '@/components/QRFrame';

// 참가자에게 띄워두는 QR 전용 화면 - 비밀번호 불필요 (QR은 공개 출석체크 링크만 담음)
export default function QRDisplayPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const { sessionId } = params;
  const [round, setRound] = useState<number | null>(null);
  const [date, setDate] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [checkinUrl, setCheckinUrl] = useState('');

  useEffect(() => {
    setCheckinUrl(`${window.location.origin}/checkin/${sessionId}`);
  }, [sessionId]);

  // 관리자가 차수를 바꾸면 화면에도 반영
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/public`);
        if (cancelled) return;
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as { date: string; current_round_number: number };
        if (cancelled) return;
        setRound(data.current_round_number);
        setDate(data.date);
      } catch {
        // 일시적인 네트워크 오류는 다음 주기에 재시도
      }
    }
    load();
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sessionId]);

  if (notFound) {
    return (
      <main className="min-h-screen bg-bg text-cream flex flex-col items-center justify-center px-6 font-body text-center">
        <p className="text-stamp">존재하지 않는 세션이에요.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg text-cream flex flex-col items-center justify-center gap-8 p-6 font-body">
      <div className="text-center">
        <p className="text-sm tracking-wide text-cream/60 mb-2">
          {round === 0 ? '아직 시작 전이에요' : '지금 출석체크 중'}
        </p>
        <h1 className="neon-text font-display text-7xl">
          {round ? `${round}차` : '···'}
        </h1>
      </div>

      {checkinUrl && (
        // --qr: QR 프레임 너비. 캐릭터는 팔꿈치를 프레임 흰 여백에 기대고 QR 패턴은 가리지 않음.
        // 캐릭터가 오른쪽으로 튀어나온 만큼 오른쪽 여백을 둬 전체를 가운데 정렬
        <div
          className="relative"
          style={{ '--qr': 'min(62vw, 50vh)', width: 'var(--qr)', marginRight: 'calc(var(--qr) * 0.5 - 18px)' } as React.CSSProperties}
        >
          <QRFrame>
            <QRCode
              value={checkinUrl}
              size={280}
              style={{ display: 'block', width: 'calc(var(--qr) - 40px)', height: 'auto' }}
            />
          </QRFrame>

          {/* 말풍선 */}
          <div
            className="absolute bg-cream text-bg font-display rounded-2xl px-2.5 py-2 text-center leading-snug whitespace-nowrap shadow-lg"
            style={{
              right: 'calc(var(--qr) * -0.5 + 18px)',
              bottom: 'calc(var(--qr) * 0.64)',
              fontSize: 'calc(var(--qr) * 0.06)',
            }}
          >
            어서와~
            <br />
            회기분석으로~
            <span
              aria-hidden
              className="absolute bg-cream rotate-45"
              style={{ width: '14px', height: '14px', bottom: '-6px', left: 'calc(30% - 7px)' }}
            />
          </div>

          {/* 캐릭터 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mascot.webp"
            alt="넙죽이"
            className="absolute pointer-events-none select-none drop-shadow-[0_6px_12px_rgba(0,0,0,0.45)]"
            style={{ width: 'calc(var(--qr) * 0.5)', right: 'calc(var(--qr) * -0.5 + 18px)', bottom: 'calc(var(--qr) * -0.06)' }}
          />
        </div>
      )}

      <div className="text-center">
        <p className="text-cream/70 text-lg">QR코드를 찍고 이름을 입력하세요</p>
        {date && <p className="mt-1 text-cream/30 text-sm">{date}</p>}
      </div>
    </main>
  );
}
