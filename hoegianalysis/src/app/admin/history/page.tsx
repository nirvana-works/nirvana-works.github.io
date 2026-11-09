import Link from 'next/link';
import { adminConfigured, isAdmin } from '@/lib/adminAuth';
import { listHistory } from '@/lib/history';
import { HistoryLogin, HistoryView } from './HistoryView';

export const metadata = { title: '회기분석 참가 기록' };
export const dynamic = 'force-dynamic';

// 지금까지 열린 회기분석 전체 기록. 운영자(ADMIN_PASSWORD)만 보고 지울 수 있다
export default async function HistoryPage() {
  const admin = isAdmin();
  const sessions = admin ? await listHistory() : [];

  return (
    <main className="min-h-screen bg-bg font-body text-cream">
      <div className="max-w-2xl mx-auto p-4 pb-16 flex flex-col gap-6">
        <div className="pt-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl neon-text">참가 기록</h1>
            <p className="text-cream/50 text-sm mt-1">지금까지 열린 회기분석과 출석자</p>
          </div>
          <Link href="/" className="text-cream/50 text-sm py-2 shrink-0">
            처음으로
          </Link>
        </div>

        {!admin ? (
          adminConfigured() ? (
            <HistoryLogin />
          ) : (
            <p className="bg-bgAlt border border-stamp/40 rounded-2xl p-4 text-sm text-stamp">
              운영자 비밀번호(ADMIN_PASSWORD) 환경변수가 아직 설정되지 않았어요.
            </p>
          )
        ) : (
          <HistoryView sessions={sessions} />
        )}
      </div>
    </main>
  );
}
