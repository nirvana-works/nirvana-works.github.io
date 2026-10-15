'use client';

import { useState } from 'react';
import { splitWithAdjustments } from '@/lib/settlement';

interface Checkin {
  id: string;
  name: string;
  adjustment: number;
}

interface Props {
  sessionId: string;
  password: string;
  round: { id: string; round_number: number; total_amount: number; checkins: Checkin[] };
  onClose: () => void;
  onSaved: () => void;
}

interface Row {
  negative: boolean;
  amount: string; // 부호 없는 금액 입력값
}

function toRow(adjustment: number): Row {
  return { negative: adjustment < 0, amount: adjustment === 0 ? '' : String(Math.abs(adjustment)) };
}

function toAdjustment(row: Row): number {
  const n = parseInt(row.amount, 10);
  if (isNaN(n) || n <= 0) return 0;
  return row.negative ? -n : n;
}

// 차수별 사람별 조정 금액 입력 화면 (전체 화면 오버레이)
export function AdjustmentPanel({ sessionId, password, round, onClose, onSaved }: Props) {
  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(round.checkins.map((c) => [c.id, toRow(Number(c.adjustment))]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 패널을 연 뒤에 새로 출석한 사람은 저장된 값(0)으로 시작
  const rowFor = (c: Checkin): Row => rows[c.id] ?? toRow(Number(c.adjustment));
  const adjustments = round.checkins.map((c) => toAdjustment(rowFor(c)));
  const shares = splitWithAdjustments(round.total_amount, adjustments);
  const adjustmentSum = adjustments.reduce((a, b) => a + b, 0);
  const sharesSum = shares.reduce((a, b) => a + b, 0);
  const overBudget = adjustmentSum > round.total_amount;
  const adjustedCount = adjustments.filter((a) => a !== 0).length;

  function update(id: string, patch: Partial<Row>) {
    setRows((prev) => {
      const checkin = round.checkins.find((c) => c.id === id);
      const current = prev[id] ?? toRow(Number(checkin?.adjustment ?? 0));
      return { ...prev, [id]: { ...current, ...patch } };
    });
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const body = Object.fromEntries(round.checkins.map((c, i) => [c.id, adjustments[i]]));
      const res = await fetch(`/api/sessions/${sessionId}/rounds/${round.id}/adjustments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ adjustments: body }),
      });
      if (res.ok) {
        onSaved();
        onClose();
      } else {
        const d = (await res.json()) as { error?: string };
        setError(d.error ?? '저장 실패');
      }
    } catch {
      setError('네트워크 오류');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-bg overflow-y-auto font-body text-cream">
      <div className="max-w-2xl mx-auto p-4 pb-16 flex flex-col gap-4">
        <div className="flex items-center justify-between pt-4">
          <div>
            <h2 className="font-display text-2xl neon-text">{round.round_number}차 사람별 조정</h2>
            <p className="text-cream/40 text-sm">총액 {round.total_amount.toLocaleString()}원 · {round.checkins.length}명</p>
          </div>
          <button onClick={onClose} className="text-cream/50 text-sm px-3 py-2">닫기</button>
        </div>

        <p className="text-xs text-cream/50 leading-relaxed bg-bgAlt border border-cream/10 rounded-xl p-3">
          더 낼 사람은 <b className="text-neon">＋</b>, 덜 낼 사람은 <b className="text-neon">−</b>로 조정 금액을 넣으세요.
          조정 합계를 뺀 나머지를 모두가 똑같이 나누고 각자 조정 금액을 더해요. 합계는 항상 총액과 같아요.
        </p>

        <ul className="bg-bgAlt border border-cream/10 rounded-2xl divide-y divide-cream/5">
          {round.checkins.map((c, i) => {
            const row = rowFor(c);
            return (
              <li key={c.id} className="flex items-center gap-2 p-3">
                <span className="flex-1 min-w-0 truncate">{c.name}</span>
                <button
                  type="button"
                  onClick={() => update(c.id, { negative: !row.negative })}
                  aria-label={row.negative ? '덜 내기 (눌러서 더 내기로)' : '더 내기 (눌러서 덜 내기로)'}
                  className={`w-9 h-9 rounded-lg font-bold border ${
                    row.negative ? 'border-sky-400/50 text-sky-300' : 'border-stamp/50 text-stamp'
                  }`}
                >
                  {row.negative ? '−' : '＋'}
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="0"
                  value={row.amount}
                  onChange={(e) => update(c.id, { amount: e.target.value })}
                  className="w-24 bg-bg border border-cream/20 rounded-lg px-2 py-2 text-sm text-right text-cream placeholder:text-cream/30 focus:outline-none focus:border-neon"
                />
                <span className={`w-24 text-right text-sm font-bold ${adjustments[i] !== 0 ? 'text-neon' : 'text-cream/70'}`}>
                  {shares[i].toLocaleString()}원
                </span>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between text-sm px-1">
          <span className="text-cream/50">
            조정 {adjustedCount}명 · 조정 합계 {adjustmentSum > 0 ? '+' : ''}{adjustmentSum.toLocaleString()}원
          </span>
          <span className={overBudget ? 'text-stamp' : 'text-cream/70'}>
            합계 {sharesSum.toLocaleString()}원
          </span>
        </div>

        {overBudget && (
          <p className="text-stamp text-sm">조정 금액 합계가 총액보다 커요. 금액을 줄여주세요.</p>
        )}
        {error && <p className="text-stamp text-sm">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRows(Object.fromEntries(round.checkins.map((c) => [c.id, toRow(0)])))}
            className="border border-cream/20 text-cream/60 px-4 py-3 rounded-xl text-sm"
          >
            모두 0으로
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || overBudget}
            className="flex-1 bg-neon text-bg font-bold py-3 rounded-xl disabled:opacity-40"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
