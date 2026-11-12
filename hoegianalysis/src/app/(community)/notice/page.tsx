import { Nanum_Pen_Script } from 'next/font/google';
import { FaceHeader } from '@/components/community/FaceHeader';
import { NoticeBoard } from '@/components/community/notice/NoticeBoard';
import { isAdmin } from '@/lib/adminAuth';
import { enrollmentCounts } from '@/lib/enrollments';
import { listLinkableEvents, listNotices } from '@/lib/notices';

// 대자보 한마디 손글씨
const pen = Nanum_Pen_Script({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pen',
  adjustFontFallback: false,
});

export const metadata = { title: '공지사항' };
export const dynamic = 'force-dynamic';

export default async function NoticePage() {
  const notices = await listNotices();
  const counts = await enrollmentCounts(notices.flatMap((n) => (n.event_id ? [n.event_id] : [])));
  const linkable = isAdmin() ? await listLinkableEvents() : [];
  return (
    <div className={`${pen.variable} flex flex-col gap-6`}>
      <FaceHeader href="/notice" />
      <NoticeBoard notices={notices} counts={counts} linkable={linkable} admin={isAdmin()} />
    </div>
  );
}
