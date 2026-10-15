'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AttendanceRow } from '@/components/AttendanceRow';
import { formatPerPerson } from '@/lib/settlement';

interface Round {
  id: string;
  round_number: number;
  started_at: string;
  total_amount: number;
  checkins: { id: string; name: string; checked_in_at: string }[];
}

interface SessionDetail {
  id: string;
  date: string;
  current_round_number: number;
  account_number: string | null;
  account_holder: string | null;
  rounds: Round[];
}

interface SettlementRow {
  name: string;
  rounds: Record<number, number | null>;
  total: number;
}

interface Settlement {
  participants: SettlementRow[];
  rounds: { round_number: number; total_amount: number; per_person: number; count: number }[];
}

export default function AdminDashboard({
  params,
}: {
  params: { sessionId: string };
}) {
  const { sessionId } = params;

  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState('');
  const [autoAuthing, setAutoAuthing] = useState(true);

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [totalInputs, setTotalInputs] = useState<Record<string, string>>({});
  const [resetConfirm, setResetConfirm] = useState<string | null>(null); // roundId
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [showSettlement, setShowSettlement] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountLoaded, setAccountLoaded] = useState(false);
  const [accountSaved, setAccountSaved] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const checkinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/checkin/${sessionId}`
    : `http://localhost:3000/checkin/${sessionId}`;

  const reportUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/report/${sessionId}`
    : `http://localhost:3000/report/${sessionId}`;

  async function copyReportLink() {
    try {
      await navigator.clipboard.writeText(reportUrl);
      setReportCopied(true);
      setTimeout(() => setReportCopied(false), 1500);
    } catch {
      setError('링크 복사에 실패했어요. 아래 주소를 직접 복사하세요.');
    }
  }

  const fetchSession = useCallback(async (pw?: string) => {
    const usedPw = pw ?? password;
    const res = await fetch(`/api/sessions/${sessionId}`, {
      headers: { 'x-admin-password': usedPw },
    });
    if (!res.ok) return { data: null, status: res.status };
    const data = await res.json() as SessionDetail;
    return { data, status: res.status };
  }, [sessionId, password]);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    const result = await fetchSession(password);
    if (result.data) {
      sessionStorage.setItem(`admin_pw_${sessionId}`, password);
      setSession(result.data);
      setAuthed(true);
    } else if (result.status === 404) {
      setAuthError('세션을 찾을 수 없습니다. URL을 확인하세요.');
    } else {
      setAuthError('비밀번호가 올바르지 않습니다.');
    }
  }

  // 계좌 입력칸은 처음 불러올 때만 채움 (5초 갱신이 입력 중인 값을 덮어쓰지 않도록)
  useEffect(() => {
    if (!session || accountLoaded) return;
    setAccountNumber(session.account_number ?? '');
    setAccountHolder(session.account_holder ?? '');
    setAccountLoaded(true);
  }, [session, accountLoaded]);

  // 세션 생성 직후 또는 새로고침 시 저장된 비밀번호로 자동 인증
  useEffect(() => {
    const saved = sessionStorage.getItem(`admin_pw_${sessionId}`);
    if (!saved) {
      setAutoAuthing(false);
      return;
    }
    fetchSession(saved).then((result) => {
      if (result.data) {
        setPassword(saved);
        setSession(result.data);
        setAuthed(true);
      } else {
        sessionStorage.removeItem(`admin_pw_${sessionId}`);
      }
      setAutoAuthing(false);
    });
    // 마운트 시 한 번만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (!authed) return;
    const id = setInterval(async () => {
      const result = await fetchSession();
      if (result.data) setSession(result.data);
    }, 5000);
    return () => clearInterval(id);
  }, [authed, fetchSession]);

  async function handleNextRound() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/sessions/${sessionId}/rounds`, {
        method: 'POST',
        headers: { 'x-admin-password': password },
      });
      if (res.ok) {
        const result = await fetchSession();
        if (result.data) setSession(result.data);
      } else {
        const d = await res.json() as { error?: string };
        setError(d.error ?? '차수 시작 실패');
      }
    } catch {
      setError('네트워크 오류');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveTotal(roundId: string) {
    const raw = totalInputs[roundId];
    // 입력값을 건드리지 않았으면 저장할 변경사항이 없음
    if (raw === undefined) return;
    const amount = raw.trim() === '' ? 0 : parseInt(raw, 10);
    if (isNaN(amount) || amount < 0) {
      setError('총액은 0 이상의 숫자로 입력하세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/sessions/${sessionId}/rounds/${roundId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ totalAmount: amount }),
      });
      if (res.ok) {
        setTotalInputs((prev) => {
          const next = { ...prev };
          delete next[roundId];
          return next;
        });
        const result = await fetchSession();
        if (result.data) setSession(result.data);
      } else {
        const d = await res.json() as { error?: string };
        setError(d.error ?? '저장 실패');
      }
    } catch {
      setError('네트워크 오류');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(roundId: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/sessions/${sessionId}/rounds/${roundId}/reset`, {
        method: 'DELETE',
        headers: { 'x-admin-password': password },
      });
      if (res.ok) {
        setResetConfirm(null);
        const result = await fetchSession();
        if (result.data) setSession(result.data);
      } else {
        const d = await res.json() as { error?: string };
        setError(d.error ?? '리셋 실패');
      }
    } catch {
      setError('네트워크 오류');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setAccountSaved(false);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ accountNumber, accountHolder }),
      });
      if (res.ok) {
        setAccountSaved(true);
      } else {
        const d = await res.json() as { error?: string };
        setError(d.error ?? '계좌 저장 실패');
      }
    } catch {
      setError('네트워크 오류');
    } finally {
      setLoading(false);
    }
  }

  async function handleSettlement() {
    if (showSettlement && settlement) {
      setShowSettlement(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/settlement`, {
        headers: { 'x-admin-password': password },
      });
      if (res.ok) {
        const data = await res.json() as Settlement;
        setSettlement(data);
        setShowSettlement(true);
      } else {
        const d = await res.json() as { error?: string };
        setError(d.error ?? '정산 조회 실패');
      }
    } catch {
      setError('네트워크 오류');
    } finally {
      setLoading(false);
    }
  }

  if (!authed && autoAuthing) {
    return (
      <main className="min-h-screen bg-bg flex flex-col items-center justify-center font-body">
        <p className="text-cream/40">불러오는 중...</p>
      </main>
    );
  }

  // --- Auth screen ---
  if (!authed) {
    return (
      <main className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 font-body">
        <form onSubmit={handleAuth} className="w-full max-w-xs flex flex-col gap-4 bg-bgAlt border border-cream/10 p-6 rounded-2xl">
          <h1 className="font-display text-2xl neon-text text-center">관리자 인증</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="관리자 비밀번호"
            className="bg-bg border border-cream/20 rounded-xl px-4 py-3 text-cream placeholder:text-cream/30 focus:outline-none focus:border-neon"
            autoFocus
          />
          {authError && <p className="text-stamp text-sm text-center">{authError}</p>}
          <button
            type="submit"
            className="bg-neon text-bg font-bold py-3 rounded-xl transition-opacity hover:opacity-90"
          >
            확인
          </button>
        </form>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-bg flex flex-col items-center justify-center font-body">
        <p className="text-cream/40">불러오는 중...</p>
      </main>
    );
  }

  const visibleRounds = activeTab === 0
    ? session.rounds
    : session.rounds.filter((r) => r.round_number === activeTab);

  return (
    <main className="min-h-screen bg-bg text-cream font-body max-w-2xl mx-auto p-4 pb-16 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between pt-4">
        <div>
          <h1 className="font-display text-2xl neon-text">관리자 대시보드</h1>
          <p className="text-cream/40 text-sm">{session.date}</p>
        </div>
        <span className="text-neon font-semibold text-lg">
          {session.current_round_number > 0 ? `현재 ${session.current_round_number}차` : '미시작'}
        </span>
      </div>

      {error && (
        <div className="border border-stamp/40 bg-stamp/10 rounded-xl px-4 py-2 text-stamp text-sm">
          {error}
        </div>
      )}

      {/* QR 화면 링크 */}
      <section className="bg-bgAlt border border-cream/10 rounded-2xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs tracking-widest uppercase text-cream/50">출석체크 QR</h2>
          <Link
            href={`/qr/${sessionId}`}
            target="_blank"
            className="border border-neon/50 text-neon font-bold px-4 py-2 rounded-lg text-sm hover:bg-neon/10 transition-colors"
          >
            QR 화면 열기 ↗
          </Link>
        </div>
        <p className="text-xs text-cream/30 break-all">{checkinUrl}</p>
      </section>

      {/* Round Control */}
      <section className="bg-bgAlt border border-cream/10 rounded-2xl p-4 flex items-center justify-between">
        <h2 className="text-xs tracking-widest uppercase text-cream/50">차수 관리</h2>
        <button
          onClick={handleNextRound}
          disabled={loading}
          className="bg-neon text-bg font-bold px-5 py-2 rounded-lg text-sm disabled:opacity-40 transition-opacity"
        >
          {session.current_round_number === 0 ? '1차 시작' : `${session.current_round_number + 1}차 시작`}
        </button>
      </section>

      {/* Tabs */}
      {session.rounds.length > 0 && (
        <section className="bg-bgAlt border border-cream/10 rounded-2xl overflow-hidden">
          <div className="flex border-b border-cream/10 overflow-x-auto">
            {[{ label: '전체', value: 0 }, ...session.rounds.map(r => ({ label: `${r.round_number}차`, value: r.round_number }))].map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.value
                    ? 'border-b-2 border-neon text-neon'
                    : 'text-cream/40 hover:text-cream/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="divide-y divide-cream/5">
            {visibleRounds.map((round) => {
              const perPerson = round.total_amount > 0 && round.checkins.length > 0
                ? formatPerPerson(round.total_amount, round.checkins.length)
                : null;

              return (
                <div key={round.id} className="p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-neon text-lg">{round.round_number}차</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-cream/40">참석 {round.checkins.length}명</span>
                      {resetConfirm === round.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-stamp">정말요?</span>
                          <button
                            onClick={() => handleReset(round.id)}
                            disabled={loading}
                            className="text-xs text-stamp border border-stamp/50 px-2 py-0.5 rounded disabled:opacity-40"
                          >
                            확인
                          </button>
                          <button
                            onClick={() => setResetConfirm(null)}
                            className="text-xs text-cream/40 px-2 py-0.5"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setResetConfirm(round.id)}
                          className="text-xs text-cream/30 hover:text-stamp border border-cream/10 hover:border-stamp/40 px-2 py-0.5 rounded transition-colors"
                        >
                          리셋
                        </button>
                      )}
                    </div>
                  </div>

                  {round.checkins.length === 0 ? (
                    <p className="text-sm text-cream/30">아직 출석체크한 참가자가 없습니다.</p>
                  ) : (
                    <ul>
                      {round.checkins.map((c) => (
                        <AttendanceRow
                          key={c.id}
                          name={c.name}
                          time={new Date(c.checked_in_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        />
                      ))}
                    </ul>
                  )}

                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      placeholder="총액 입력 (원)"
                      value={totalInputs[round.id] ?? (round.total_amount > 0 ? String(round.total_amount) : '')}
                      onChange={(e) => setTotalInputs((prev) => ({ ...prev, [round.id]: e.target.value }))}
                      className="flex-1 bg-bg border border-cream/20 rounded-lg px-3 py-2 text-sm text-cream placeholder:text-cream/30 focus:outline-none focus:border-neon"
                    />
                    <button
                      onClick={() => handleSaveTotal(round.id)}
                      disabled={loading}
                      className="bg-neon text-bg text-sm font-bold px-3 py-2 rounded-lg disabled:opacity-40"
                    >
                      저장
                    </button>
                  </div>

                  {perPerson !== null && (
                    <p className="text-sm text-neon font-medium">
                      인당 분담금: {perPerson}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 엔빵 계좌 */}
      <form
        onSubmit={handleSaveAccount}
        className="bg-bgAlt border border-cream/10 rounded-2xl p-4 flex flex-col gap-3"
      >
        <h2 className="text-xs tracking-widest uppercase text-cream/50">엔빵 계좌</h2>
        <input
          value={accountNumber}
          onChange={(e) => { setAccountNumber(e.target.value); setAccountSaved(false); }}
          placeholder="계좌번호 (예: 국민 123456-78-901234)"
          className="bg-bg border border-cream/20 rounded-lg px-3 py-2 text-sm text-cream placeholder:text-cream/30 focus:outline-none focus:border-neon"
        />
        <div className="flex items-center gap-2">
          <input
            value={accountHolder}
            onChange={(e) => { setAccountHolder(e.target.value); setAccountSaved(false); }}
            placeholder="계좌명 (예금주)"
            className="flex-1 bg-bg border border-cream/20 rounded-lg px-3 py-2 text-sm text-cream placeholder:text-cream/30 focus:outline-none focus:border-neon"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-neon text-bg text-sm font-bold px-3 py-2 rounded-lg disabled:opacity-40"
          >
            {accountSaved ? '저장됨' : '저장'}
          </button>
        </div>
      </form>

      {/* 성적표 링크 */}
      <section className="bg-bgAlt border border-cream/10 rounded-2xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs tracking-widest uppercase text-cream/50">성적표 (단톡방 공유용)</h2>
          <div className="flex gap-2">
            <Link
              href={`/report/${sessionId}`}
              target="_blank"
              className="border border-cream/20 text-cream/70 px-3 py-2 rounded-lg text-sm hover:border-cream/40"
            >
              열기 ↗
            </Link>
            <button
              onClick={copyReportLink}
              className="border border-neon/50 text-neon font-bold px-3 py-2 rounded-lg text-sm hover:bg-neon/10 transition-colors"
            >
              {reportCopied ? '복사됨' : '링크 복사'}
            </button>
          </div>
        </div>
        <p className="text-xs text-cream/30 break-all">{reportUrl}</p>
      </section>

      {/* Settlement */}
      <button
        onClick={handleSettlement}
        disabled={loading || session.rounds.length === 0}
        className="border border-neon/50 text-neon font-bold py-3 rounded-xl disabled:opacity-30 hover:bg-neon/10 transition-colors"
      >
        {showSettlement ? '정산표 닫기' : '정산표 보기'}
      </button>

      {showSettlement && settlement && (
        <section className="bg-bgAlt border border-cream/10 rounded-2xl overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cream/10">
                <th className="text-left px-4 py-3 text-xs tracking-widest uppercase text-cream/50">참가자</th>
                {settlement.rounds.map((r) => (
                  <th key={r.round_number} className="px-3 py-3 text-xs tracking-widest uppercase text-cream/50 text-center">
                    {r.round_number}차
                  </th>
                ))}
                <th className="px-4 py-3 text-xs tracking-widest uppercase text-cream/50 text-right">합계</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream/5">
              {settlement.participants.map((p) => (
                <tr key={p.name}>
                  <td className="px-4 py-3 font-medium text-cream">{p.name}</td>
                  {settlement.rounds.map((r) => {
                    const amt = p.rounds[r.round_number];
                    return (
                      <td key={r.round_number} className="px-3 py-3 text-center">
                        {amt != null ? (
                          <span className="text-neon">{amt.toLocaleString()}</span>
                        ) : (
                          <span className="text-cream/20">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right font-bold text-cream">
                    {p.total.toLocaleString()}원
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
