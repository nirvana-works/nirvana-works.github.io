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
        <QRFrame>
          <QRCode value={checkinUrl} size={280} style={{ width: 'min(72vw, 52vh)', height: 'auto' }} />
        </QRFrame>
      )}

      <div className="text-center">
        <p className="text-cream/70 text-lg">QR코드를 찍고 이름을 입력하세요</p>
        {date && <p className="mt-1 text-cream/30 text-sm">{date}</p>}
      </div>
    </main>
  );
}
