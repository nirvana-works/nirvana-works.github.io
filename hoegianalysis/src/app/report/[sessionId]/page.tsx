'use client';

import { useEffect, useState } from 'react';
import type { Grade } from '@/lib/settlement';

interface ReportRound {
  round_number: number;
  attended: boolean;
  amount: number | null;
  adjustment: number;
  total_amount: number;
  count: number;
}

interface Report {
  found: true;
  name: string;
  date: string;
  grade: Grade;
  attended: number;
  totalRounds: number;
  rounds: ReportRound[];
  total: number;
  account: { number: string | null; holder: string | null };
}

type LookupResult = Report | { found: false; date: string; suggestions: string[] };

// 출석 명단에 없는 이름으로 조회했을 때의 F 성적표
interface Missing {
  name: string;
  date: string;
  suggestions: string[];
}

const COMMENTS: Record<Grade, string> = {
  'A+': '개근! 진정한 회기분석러입니다 🏆',
  'B+': '아쉽게 한 차수를 놓쳤어요. 다음엔 개근 도전!',
  'C+': '중간에 빠져나간 흔적이 보입니다 👀',
};

const GRADE_IMAGES: Record<Grade, string> = {
  'A+': '/grade-a.webp',
  'B+': '/grade-b.webp',
  'C+': '/grade-c.webp',
};

export default function ReportPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const { sessionId } = params;
  const [name, setName] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [missing, setMissing] = useState<Missing | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'noSession' | 'error'>('idle');
  const [copied, setCopied] = useState(false);

  async function lookup(target: string) {
    const trimmed = target.trim();
    if (!trimmed || status === 'loading') return;
    setStatus('loading');
    try {
      const res = await fetch(`/api/sessions/${sessionId}/report?name=${encodeURIComponent(trimmed)}`);
      if (res.status === 404) {
        setStatus('noSession');
        return;
      }
      if (!res.ok) throw new Error();
      const data = (await res.json()) as LookupResult;
      if (data.found) {
        setMissing(null);
        setReport(data);
      } else {
        setMissing({ name: trimmed, date: data.date, suggestions: data.suggestions });
      }
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  // ?name=홍길동 으로 들어오면 바로 조회
  useEffect(() => {
    const preset = new URLSearchParams(window.location.search).get('name');
    if (preset) {
      setName(preset);
      lookup(preset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyAccount() {
    if (!report?.account.number) return;
    try {
      await navigator.clipboard.writeText(report.account.number);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없으면 무시 (계좌번호는 화면에 그대로 보임)
    }
  }

  if (status === 'noSession') {
    return (
      <main className="min-h-screen bg-bg text-cream flex flex-col items-center justify-center px-6 font-body text-center">
        <p className="text-stamp">존재하지 않는 세션이에요.</p>
        <p className="mt-2 text-sm text-cream/40">링크를 다시 확인해주세요</p>
      </main>
    );
  }

  if (missing) {
    return (
      <main className="min-h-screen bg-bg text-cream flex flex-col items-center px-4 py-10 font-body">
        <article className="w-full max-w-sm bg-cream text-bg rounded-2xl p-6 shadow-[0_0_24px_rgba(230,57,70,0.35)]">
          <header className="border-b-2 border-bg/80 pb-3">
            <p className="text-xs tracking-widest text-bg/50">{missing.date}</p>
            <h1 className="font-display text-2xl">회기분석 성적표</h1>
            <p className="mt-1 text-lg font-bold break-all">
              {missing.name}
              <span className="ml-2 text-xs font-bold text-stamp">출석 기록 없음</span>
            </p>
          </header>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/grade-f.webp"
            alt="학점 F"
            className="mx-auto mt-4 w-56 pointer-events-none select-none"
          />

          <p className="mt-4 text-center font-display text-xl text-stamp leading-relaxed">
            회기분석 불참은 죄악입니다.
            <br />
            재수강 바랍니다.
          </p>

          {missing.suggestions.length > 0 && (
            <div className="mt-6 pt-4 border-t border-bg/10 flex flex-col items-center gap-2 text-center">
              <p className="text-bg/50 text-sm">혹시 이 이름으로 출석했나요?</p>
              <div className="flex flex-wrap justify-center gap-2">
                {missing.suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setName(s); lookup(s); }}
                    className="border border-bg/30 text-bg text-sm font-bold px-3 py-1 rounded-full hover:bg-bg/5"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </article>

        <button
          onClick={() => { setMissing(null); setName(''); }}
          className="mt-6 text-sm text-cream/40 underline"
        >
          다른 이름 조회
        </button>
      </main>
    );
  }

  if (report) {
    return (
      <main className="min-h-screen bg-bg text-cream flex flex-col items-center px-4 pt-20 pb-10 font-body">
        <article className="relative w-full max-w-sm bg-cream text-bg rounded-2xl p-6 shadow-[0_0_24px_var(--color-neon-soft)]">
          {/* 학점별 넙죽이 - 카드 오른쪽 위에 걸쳐서 표시 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={GRADE_IMAGES[report.grade]}
            alt={`학점 ${report.grade}`}
            className="absolute -top-14 -right-2 w-32 pointer-events-none select-none drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)]"
          />

          <header className="border-b-2 border-bg/80 pb-3 pr-28">
            <p className="text-xs tracking-widest text-bg/50">{report.date}</p>
            <h1 className="font-display text-2xl">회기분석 성적표</h1>
            <p className="mt-1 text-lg font-bold">
              {report.name}
              <span className="ml-2 text-xs font-bold text-stamp">
                {report.attended}/{report.totalRounds} 출석
              </span>
            </p>
          </header>

          <p className="mt-4 text-sm text-bg/70">{COMMENTS[report.grade]}</p>

          <table className="w-full mt-4 text-sm">
            <thead>
              <tr className="border-b border-bg/20 text-bg/50 text-xs">
                <th className="text-left py-2 font-medium">차수</th>
                <th className="text-center py-2 font-medium">출석</th>
                <th className="text-right py-2 font-medium">분담금</th>
              </tr>
            </thead>
            <tbody>
              {report.rounds.map((r) => (
                <tr key={r.round_number} className="border-b border-bg/10">
                  <td className="py-2 font-bold">{r.round_number}차</td>
                  <td className="py-2 text-center">
                    {r.attended ? (
                      <span className="text-stamp font-bold">출석</span>
                    ) : (
                      <span className="text-bg/30">결석</span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    {r.amount !== null ? `${r.amount.toLocaleString()}원` : '-'}
                    {r.adjustment !== 0 && r.total_amount > 0 && (
                      <span className="block text-[10px] text-bg/50">
                        (조정 {r.adjustment > 0 ? '+' : '−'}{Math.abs(r.adjustment).toLocaleString()}원)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-sm text-bg/60">보낼 금액</span>
            <span className="font-display text-3xl">{report.total.toLocaleString()}원</span>
          </div>

          {report.account.number ? (
            <div className="mt-4 rounded-xl bg-bg/5 p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold break-all">{report.account.number}</p>
                {report.account.holder && (
                  <p className="text-xs text-bg/60">예금주 {report.account.holder}</p>
                )}
              </div>
              <button
                onClick={copyAccount}
                className="shrink-0 bg-bg text-cream text-xs font-bold px-3 py-2 rounded-lg"
              >
                {copied ? '복사됨' : '계좌 복사'}
              </button>
            </div>
          ) : (
            <p className="mt-4 text-xs text-bg/40">입금 계좌가 아직 등록되지 않았어요</p>
          )}
        </article>

        <button
          onClick={() => { setReport(null); setName(''); }}
          className="mt-6 text-sm text-cream/40 underline"
        >
          다른 이름 조회
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg text-cream flex flex-col items-center justify-center px-6 font-body">
      <p className="text-sm tracking-wide text-cream/60 mb-2">내 정산 확인하기</p>
      <h1 className="neon-text font-display text-5xl mb-10">회기분석 성적표</h1>

      <form
        onSubmit={(e) => { e.preventDefault(); lookup(name); }}
        className="w-full max-w-xs flex flex-col gap-4"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="출석할 때 쓴 이름"
          className="w-full bg-bgAlt border border-cream/20 rounded-xl px-4 py-3 text-center text-lg text-cream placeholder:text-cream/40 focus:outline-none focus:border-neon"
          autoFocus
        />
        <button
          type="submit"
          disabled={status === 'loading' || !name.trim()}
          className="w-full bg-neon text-bg font-bold py-3 rounded-xl disabled:opacity-40 transition-opacity"
        >
          {status === 'loading' ? '조회 중...' : '성적표 보기'}
        </button>
      </form>

      {status === 'error' && (
        <p className="mt-6 text-stamp text-sm">조회에 실패했어요. 다시 시도해주세요</p>
      )}
    </main>
  );
}
