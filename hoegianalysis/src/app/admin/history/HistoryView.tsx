'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AttendanceRow } from '@/components/AttendanceRow';
import { normalizeName } from '@/lib/settlement';
import type { HistorySession } from '@/lib/history';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function dateLabel(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return `${y}. ${m}. ${d}. (${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]})`;
}

// 서버(Vercel, UTC)와 브라우저 표시가 같도록 한국 시간으로 직접 계산
function kst(iso: string) {
  const d = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { m: d.getUTCMonth() + 1, d: d.getUTCDate(), hm: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` };
}

function timeLabel(iso: string) {
  return kst(iso).hm;
}

function createdLabel(iso: string) {
  const t = kst(iso);
  return `${t.m}/${t.d} ${t.hm}`;
}

async function callDelete(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return data.error ?? '삭제하지 못했어요.';
  } catch {
    return '네트워크 오류로 삭제하지 못했어요.';
  }
}

export function HistoryView({ sessions }: { sessions: HistorySession[] }) {
  const router = useRouter();

  // 사람별 누적 참가 횟수 (날짜 기준, 띄어쓰기만 다른 이름은 한 사람)
  const people = new Map<string, { name: string; dates: Set<string> }>();
  for (const s of sessions) {
    for (const r of s.rounds) {
      for (const c of r.checkins) {
        const key = normalizeName(c.name);
        const p = people.get(key) ?? { name: c.name, dates: new Set<string>() };
        p.dates.add(s.date);
        people.set(key, p);
      }
    }
  }
  const ranking = Array.from(people.values()).sort(
    (a, b) => b.dates.size - a.dates.size || a.name.localeCompare(b.name, 'ko')
  );
  const dateCount = new Set(sessions.map((s) => s.date)).size;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between text-sm">
        <span className="text-cream/60">
          회기분석 <b className="text-neon">{dateCount}</b>일 · 세션 {sessions.length}개 · 참가자{' '}
          <b className="text-neon">{ranking.length}</b>명
        </span>
        <button
          type="button"
          onClick={async () => {
            await fetch('/api/community/admin', { method: 'DELETE' });
            router.refresh();
          }}
          className="text-cream/40 text-xs underline underline-offset-4"
        >
          로그아웃
        </button>
      </div>

      {ranking.length > 0 && (
        <section className="bg-bgAlt border border-cream/10 rounded-2xl p-4">
          <h2 className="font-display text-lg text-neon mb-3">누적 참가</h2>
          <ul className="flex flex-wrap gap-2">
            {ranking.map((p) => (
              <li key={p.name} className="rounded-full border border-cream/20 px-3 py-1 text-sm">
                {p.name} <b className="text-stamp">{p.dates.size}</b>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sessions.length === 0 ? (
        <p className="text-cream/50 text-sm text-center py-10">아직 열린 회기분석이 없어요.</p>
      ) : (
        sessions.map((s) => (
          <SessionCard key={s.id} session={s} onChanged={() => router.refresh()} />
        ))
      )}
    </div>
  );
}

function SessionCard({ session, onChanged }: { session: HistorySession; onChanged: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const total = session.rounds.reduce((sum, r) => sum + r.checkins.length, 0);
  const people = new Set(session.rounds.flatMap((r) => r.checkins.map((c) => normalizeName(c.name)))).size;

  async function removeSession() {
    setDeleting(true);
    const err = await callDelete(`/api/history/sessions/${session.id}`);
    setDeleting(false);
    if (err) {
      setError(err);
      setConfirming(false);
    } else {
      onChanged();
    }
  }

  return (
    <section className="bg-bgAlt border border-cream/10 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl text-cream">{dateLabel(session.date)}</h2>
          <p className="text-xs text-cream/40 mt-0.5">
            {session.rounds.length}차까지 · {people}명 · {createdLabel(session.created_at)} 생성
          </p>
        </div>
        {confirming ? (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={removeSession}
              disabled={deleting}
              className="text-xs font-bold text-white bg-stamp px-2.5 py-1.5 rounded-lg disabled:opacity-40"
            >
              {deleting ? '삭제 중...' : '전부 삭제'}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="text-xs text-cream/40 px-2 py-1.5">
              취소
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setError('');
              setConfirming(true);
            }}
            className="shrink-0 text-xs text-stamp border border-stamp/50 px-2.5 py-1.5 rounded-lg hover:bg-stamp/10"
          >
            이 회기분석 삭제
          </button>
        )}
      </div>

      {confirming && (
        <p className="text-xs text-stamp bg-stamp/10 border border-stamp/40 rounded-lg p-2.5">
          이 날의 모든 차수와 출석 기록 {total}건이 지워져요. 되돌릴 수 없어요.
        </p>
      )}
      {error && <p className="text-xs text-stamp">{error}</p>}

      {total === 0 ? (
        <p className="text-sm text-cream/40">출석 기록이 없어요.</p>
      ) : (
        session.rounds
          .filter((r) => r.checkins.length > 0)
          .map((r) => (
            <div key={r.id}>
              <h3 className="text-sm font-bold text-neon">
                {r.round_number}차 <span className="text-cream/40 font-normal">{r.checkins.length}명</span>
              </h3>
              <ul>
                {r.checkins.map((c) => (
                  <AttendanceRow
                    key={c.id}
                    name={c.name}
                    time={timeLabel(c.checked_in_at)}
                    onDelete={async () => {
                      const err = await callDelete(`/api/history/checkins/${c.id}`);
                      if (!err) onChanged();
                      return err;
                    }}
                  />
                ))}
              </ul>
            </div>
          ))
      )}
    </section>
  );
}

export function HistoryLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/community/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { error?: string };
      if (res.ok) {
        setPassword('');
        router.refresh();
      } else {
        setError(data.error ?? '로그인하지 못했어요.');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm mx-auto flex flex-col gap-4 bg-bgAlt border border-cream/10 p-6 rounded-2xl">
      <div>
        <label htmlFor="history-password" className="block text-xs font-medium text-cream/50 mb-1 tracking-widest uppercase">
          운영자 비밀번호
        </label>
        <input
          id="history-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          className="w-full bg-bg border border-cream/20 rounded-xl px-4 py-3 text-cream text-base focus:outline-none focus:border-neon"
        />
      </div>
      {error && <p className="text-stamp text-sm">{error}</p>}
      <button type="submit" disabled={loading || !password} className="w-full bg-neon text-bg font-bold py-3 rounded-xl disabled:opacity-40">
        {loading ? '확인 중...' : '들어가기'}
      </button>
    </form>
  );
}
