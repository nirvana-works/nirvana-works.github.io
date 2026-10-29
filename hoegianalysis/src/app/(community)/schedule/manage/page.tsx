import Link from 'next/link';
import { AdminLogin, LogoutButton } from '@/components/community/AdminLogin';
import { AddPanel } from '@/components/community/schedule/AddPanel';
import { BirthdayList } from '@/components/community/schedule/BirthdayList';
import { ManageEventList } from '@/components/community/schedule/ManageEventList';
import { adminConfigured, isAdmin } from '@/lib/adminAuth';
import { listBirthdays } from '@/lib/birthdays';
import { listEventsBetween, todayKST } from '@/lib/schoolEvents';

export const metadata = { title: '일정·생일 추가' };
export const dynamic = 'force-dynamic';

// 일정·생일 추가는 누구나. 지우기만 운영자 로그인이 필요하다
export default async function ScheduleManagePage({ searchParams }: { searchParams: { tab?: string } }) {
  const admin = isAdmin();

  // 지난 행사도 확인할 일이 있으니 한 달 전부터 보여준다
  const from = new Date(`${todayKST()}T00:00:00Z`);
  from.setUTCMonth(from.getUTCMonth() - 1);
  const [events, birthdays] = await Promise.all([
    listEventsBetween(from.toISOString().slice(0, 10), '9999-12-31'),
    listBirthdays(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[26px] font-black">일정·생일 추가</h1>
          <Link href="/schedule" className="text-[14px] font-bold underline underline-offset-4">
            달력으로
          </Link>
        </div>
        <AddPanel initialTab={searchParams.tab === 'birthday' ? 'birthday' : 'event'} />
      </div>

      <section>
        <h2 className="mb-3 text-[18px] font-black">등록된 일정</h2>
        <ManageEventList events={events} canDelete={admin} />
        <h2 className="mb-3 mt-8 text-[18px] font-black">멤버 생일</h2>
        <BirthdayList birthdays={birthdays} canDelete={admin} />
        <div className="mt-6 text-center">
          {admin ? (
            <LogoutButton />
          ) : (
            adminConfigured() && (
              <details className="text-left">
                <summary className="cursor-pointer text-center text-[13px] font-bold text-inkMuted underline underline-offset-4">
                  잘못 올라간 일정·생일 지우기 (운영자)
                </summary>
                <div className="mt-4">
                  <AdminLogin />
                </div>
              </details>
            )
          )}
        </div>
      </section>
    </div>
  );
}
