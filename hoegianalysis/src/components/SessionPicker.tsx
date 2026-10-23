'use client';

import { useRouter } from 'next/navigation';
import type { SessionMatch } from '@/lib/sessionLookup';

// 같은 날짜·비밀번호로 만든 세션이 여러 개일 때 하나를 골라 대시보드로 들어가는 목록
export function SessionPicker({ sessions, password }: { sessions: SessionMatch[]; password: string }) {
  const router = useRouter();

  function open(sessionId: string) {
    // 대시보드가 비밀번호를 다시 묻지 않도록 저장
    sessionStorage.setItem(`admin_pw_${sessionId}`, password);
    router.push(`/admin/${sessionId}`);
  }

  return (
    <ul className="flex flex-col gap-2">
      {sessions.map((s) => {
        const empty = s.checkin_count === 0;
        const created = new Date(s.created_at).toLocaleString('ko-KR', {
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => open(s.id)}
              className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                empty
                  ? 'border-cream/10 text-cream/40 hover:border-cream/30'
                  : 'border-neon/50 text-cream hover:bg-neon/10'
              }`}
            >
              <span className="block text-sm font-bold">
                {s.current_round_number > 0 ? `${s.current_round_number}차 진행` : '시작 전'}
                {' · '}
                출석 {s.checkin_count}건
                {empty && <span className="ml-1 font-normal">(비어 있음)</span>}
              </span>
              <span className="block text-xs text-cream/40 mt-0.5">{created} 생성</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
