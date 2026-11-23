'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MEMBER_STATUS_LABEL, type MemberStatus, type MemberSummary } from '@/lib/memberTypes';

type Action = 'approve' | 'reject' | 'suspend' | 'restore' | 'reset' | 'delete';

const TABS: { id: MemberStatus; label: string }[] = [
  { id: 'pending', label: '승인 대기' },
  { id: 'active', label: '회원' },
  { id: 'suspended', label: '정지' },
  { id: 'rejected', label: '거절' },
];

// 상태마다 누를 수 있는 버튼
const BUTTONS: Record<MemberStatus, { action: Action; label: string; tone: 'go' | 'plain' | 'danger' }[]> = {
  pending: [
    { action: 'approve', label: '승인', tone: 'go' },
    { action: 'reject', label: '거절', tone: 'plain' },
  ],
  active: [
    { action: 'reset', label: '비밀번호 초기화', tone: 'plain' },
    { action: 'suspend', label: '정지', tone: 'danger' },
  ],
  suspended: [
    { action: 'restore', label: '정지 풀기', tone: 'go' },
    { action: 'delete', label: '삭제', tone: 'danger' },
  ],
  rejected: [
    { action: 'approve', label: '승인', tone: 'go' },
    { action: 'delete', label: '삭제', tone: 'danger' },
  ],
};

const CONFIRM: Partial<Record<Action, (m: MemberSummary) => string>> = {
  suspend: (m) => `${m.nickname}(${m.name}) 님을 정지할까요? 바로 로그아웃돼요.`,
  delete: (m) => `${m.nickname}(${m.name}) 님 기록을 완전히 지울까요? 되돌릴 수 없어요.`,
  reset: (m) => `${m.nickname}(${m.name}) 님 비밀번호를 임시 비밀번호로 바꿀까요?`,
};

const TONE = {
  go: 'bg-sticker hover:bg-[#e3c900]',
  plain: 'bg-white hover:bg-lime',
  danger: 'bg-white text-seal hover:bg-[#f6dcd9]',
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–';

export function MemberAdmin({ members }: { members: MemberSummary[] }) {
  const router = useRouter();
  const pendingCount = members.filter((m) => m.status === 'pending').length;
  const [tab, setTab] = useState<MemberStatus>(pendingCount > 0 ? 'pending' : 'active');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [temp, setTemp] = useState<{ who: string; password: string } | null>(null);

  async function act(m: MemberSummary, action: Action) {
    const ask = CONFIRM[action];
    if (ask && !window.confirm(ask(m))) return;
    setBusy(m.id);
    setError('');
    try {
      const res = await fetch('/api/member/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: m.id, action }),
      });
      const data = (await res.json()) as { error?: string; tempPassword?: string };
      if (!res.ok) setError(data.error ?? '처리하지 못했어요.');
      else {
        if (data.tempPassword) setTemp({ who: `${m.nickname}(${m.name})`, password: data.tempPassword });
        router.refresh();
      }
    } catch {
      setError('네트워크 오류로 처리하지 못했어요.');
    }
    setBusy(null);
  }

  const shown = members.filter((m) => m.status === tab);

  return (
    <div className="flex flex-col gap-5">
      {temp && (
        <div className="rounded-[14px] border-2 border-ink bg-sticker p-4">
          <p className="text-[14px] font-bold">{temp.who} 님 임시 비밀번호</p>
          <p className="my-2 select-all font-latin text-[24px] font-semibold tracking-wider">{temp.password}</p>
          <p className="text-[13px]">본인에게 카톡으로 전해 주고, 로그인 뒤 &lsquo;내 정보&rsquo;에서 바꾸라고 알려 주세요. 이 창을 닫으면 다시 볼 수 없어요.</p>
          <button type="button" onClick={() => setTemp(null)} className="mt-2 text-[13px] font-bold underline underline-offset-4">
            닫기
          </button>
        </div>
      )}

      <div role="tablist" className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const n = members.filter((m) => m.status === t.id).length;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`h-10 rounded-full border-2 border-ink px-4 text-[14px] font-bold ${tab === t.id ? 'bg-ink text-white' : 'bg-white hover:bg-lime'}`}
            >
              {t.label} {n > 0 && <span className={t.id === 'pending' && n > 0 && tab !== t.id ? 'text-seal' : ''}>{n}</span>}
            </button>
          );
        })}
      </div>

      {error && <p className="text-[14px] font-bold text-seal">{error}</p>}

      {shown.length === 0 ? (
        <p className="py-8 text-center text-[14px] text-inkMuted">{MEMBER_STATUS_LABEL[tab]} 상태인 사람이 없어요.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((m) => (
            <li key={m.id} className="rounded-[14px] border-2 border-ink bg-white p-4">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[17px] font-black">{m.nickname}</span>
                <span className="text-[14px]">
                  {m.name} · {m.cohort}
                </span>
              </div>
              <p className="mt-0.5 break-all text-[13px] text-inkMuted">{m.email}</p>
              {m.message && (
                <p className="mt-2 whitespace-pre-wrap rounded-[8px] bg-lime px-3 py-2 text-[14px] leading-snug">
                  <span className="mr-1 font-bold">교수님께</span>
                  {m.message}
                </p>
              )}
              <p className="mt-0.5 text-[12px] text-inkMuted">
                신청 {fmt(m.created_at)}
                {m.status === 'active' && <> · 마지막 로그인 {fmt(m.last_login_at)}</>}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {BUTTONS[m.status].map((b) => (
                  <button
                    key={b.action}
                    type="button"
                    disabled={busy === m.id}
                    onClick={() => act(m, b.action)}
                    className={`h-10 rounded-[10px] border-2 border-ink px-4 text-[14px] font-bold disabled:opacity-50 ${TONE[b.tone]}`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
