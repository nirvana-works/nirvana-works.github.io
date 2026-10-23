'use client';

import { useState } from 'react';
import { isBalanced, splitShares, UNBALANCED_MESSAGE, type ShareInput } from '@/lib/settlement';

interface Checkin {
  id: string;
  name: string;
  adjustment: number;
  fixed_amount: number | null;
}

interface Props {
  sessionId: string;
  password: string;
  round: { id: string; round_number: number; total_amount: number; checkins: Checkin[] };
  onClose: () => void;
  onSaved: () => void;
}

// 행마다: ± 조정(나머지 사람끼리 다시 나눔) 또는 금액 지정(그 금액 그대로, 0원이면 엔빵 제외)
interface Row {
  mode: 'adjust' | 'fixed';
  negative: boolean;
  amount: string; // 조정 금액 (부호 없음)
  fixed: string; // 지정 금액
}

function toRow(c: Checkin): Row {
  const adjustment = Number(c.adjustment);
  const fixed = c.fixed_amount === null ? null : Number(c.fixed_amount);
  return {
    mode: fixed !== null ? 'fixed' : 'adjust',
    negative: adjustment < 0,
    amount: adjustment === 0 ? '' : String(Math.abs(adjustment)),
    fixed: fixed !== null ? String(fixed) : '',
  };
}

function toInput(row: Row): ShareInput {
  if (row.mode === 'fixed') {
    const n = parseInt(row.fixed, 10);
    return { adjustment: 0, fixed: isNaN(n) || n < 0 ? 0 : n };
  }
  const n = parseInt(row.amount, 10);
  const adjustment = isNaN(n) || n <= 0 ? 0 : row.negative ? -n : n;
  return { adjustment, fixed: null };
}

// 차수별 사람별 조정 입력 화면 (전체 화면 오버레이)
export function AdjustmentPanel({ sessionId, password, round, onClose, onSaved }: Props) {
  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(round.checkins.map((c) => [c.id, toRow(c)]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 패널을 연 뒤에 새로 출석한 사람은 저장된 값으로 시작
  const rowFor = (c: Checkin): Row => rows[c.id] ?? toRow(c);
  const inputs = round.checkins.map((c) => toInput(rowFor(c)));
  const shares = splitShares(round.total_amount, inputs);
  const sharesSum = shares.reduce((a, b) => a + b, 0);
  const balanced = isBalanced(round.total_amount, shares);
  const difference = sharesSum - round.total_amount;
  const changedCount = inputs.filter((i) => i.fixed !== null || i.adjustment !== 0).length;

  function update(c: Checkin, patch: Partial<Row>) {
    setRows((prev) => ({ ...prev, [c.id]: { ...(prev[c.id] ?? toRow(c)), ...patch } }));
  }

  function switchMode(c: Checkin, index: number, mode: Row['mode']) {
    // 금액 지정으로 바꾸면 지금 금액에서 시작
    update(c, mode === 'fixed' ? { mode, fixed: String(Math.max(shares[index], 0)) } : { mode });
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const body = Object.fromEntries(round.checkins.map((c, i) => [c.id, inputs[i]]));
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
          <b className="text-neon">± 조정</b>: 더 낼 사람은 ＋, 덜 낼 사람은 −. 나머지는 조정하지 않은 사람끼리 다시 나눠요.
          <br />
          <b className="text-neon">금액 지정</b>: 그 금액을 그대로 내요. <b className="text-neon">0원</b>을 누르면 엔빵에서 빠져요.
        </p>

        <ul className="bg-bgAlt border border-cream/10 rounded-2xl divide-y divide-cream/5">
          {round.checkins.map((c, i) => {
            const row = rowFor(c);
            const changed = inputs[i].fixed !== null || inputs[i].adjustment !== 0;
            return (
              <li key={c.id} className="p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-medium">{c.name}</span>
                  <span className={`shrink-0 text-sm font-bold ${shares[i] < 0 ? 'text-stamp' : changed ? 'text-neon' : 'text-cream/70'}`}>
                    {shares[i].toLocaleString()}원
                    {inputs[i].fixed === 0 && <span className="ml-1 text-xs font-normal text-cream/50">(제외)</span>}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex shrink-0 rounded-lg border border-cream/20 overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => switchMode(c, i, 'adjust')}
                      className={`px-2 py-1.5 ${row.mode === 'adjust' ? 'bg-neon text-bg font-bold' : 'text-cream/50'}`}
                    >
                      ± 조정
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode(c, i, 'fixed')}
                      className={`px-2 py-1.5 ${row.mode === 'fixed' ? 'bg-neon text-bg font-bold' : 'text-cream/50'}`}
                    >
                      금액 지정
                    </button>
                  </div>

                  {row.mode === 'adjust' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => update(c, { negative: !row.negative })}
                        aria-label={row.negative ? '덜 내기 (눌러서 더 내기로)' : '더 내기 (눌러서 덜 내기로)'}
                        className={`shrink-0 w-8 h-8 rounded-lg font-bold border ${
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
                        onChange={(e) => update(c, { amount: e.target.value })}
                        className="min-w-0 flex-1 bg-bg border border-cream/20 rounded-lg px-2 py-1.5 text-sm text-right text-cream placeholder:text-cream/30 focus:outline-none focus:border-neon"
                      />
                    </>
                  ) : (
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder="0"
                      value={row.fixed}
                      onChange={(e) => update(c, { fixed: e.target.value })}
                      aria-label={`${c.name} 지정 금액`}
                      className="min-w-0 flex-1 bg-bg border border-neon/40 rounded-lg px-2 py-1.5 text-sm text-right text-cream placeholder:text-cream/30 focus:outline-none focus:border-neon"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => update(c, { mode: 'fixed', fixed: '0' })}
                    className="shrink-0 border border-cream/20 text-cream/60 text-xs px-2 py-1.5 rounded-lg hover:border-cream/40"
                  >
                    0원
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between text-sm px-1">
          <span className="text-cream/50">조정 {changedCount}명</span>
          <span className={balanced ? 'text-cream/70' : 'text-stamp font-bold'}>
            합계 {sharesSum.toLocaleString()}원 / 총액 {round.total_amount.toLocaleString()}원
          </span>
        </div>

        {!balanced && (
          <div className="border border-stamp/50 bg-stamp/10 rounded-xl p-3 text-sm text-stamp">
            <p className="font-bold">{UNBALANCED_MESSAGE}</p>
            {difference !== 0 && (
              <p className="mt-1 text-xs text-stamp/80">
                {difference > 0
                  ? `총액보다 ${difference.toLocaleString()}원 많아요.`
                  : `총액보다 ${Math.abs(difference).toLocaleString()}원 부족해요.`}
              </p>
            )}
            {shares.some((s) => s < 0) && (
              <p className="mt-1 text-xs text-stamp/80">금액이 0원보다 작은 사람이 있어요.</p>
            )}
          </div>
        )}
        {error && <p className="text-stamp text-sm">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              setRows(Object.fromEntries(round.checkins.map((c) => [c.id, { mode: 'adjust', negative: false, amount: '', fixed: '' }])))
            }
            className="border border-cream/20 text-cream/60 px-4 py-3 rounded-xl text-sm"
          >
            모두 초기화
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-neon text-bg font-bold py-3 rounded-xl disabled:opacity-40"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
