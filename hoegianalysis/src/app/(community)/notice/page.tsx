import { Nanum_Pen_Script } from 'next/font/google';
import { FaceHeader } from '@/components/community/FaceHeader';
import { NoticeBoard } from '@/components/community/notice/NoticeBoard';
import { isAdmin } from '@/lib/adminAuth';
import { enrollmentCounts } from '@/lib/enrollments';
import { BOARD_SIZE } from '@/lib/noticeTypes';
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

export default async function NoticePage({ searchParams }: { searchParams: { board?: string } }) {
  // 한 판에 BOARD_SIZE장. 오래된 것부터 채워서, 판이 차면 새 게시판이 생기고 지난 게시판은 그대로 남는다
  const all = (await listNotices()).reverse();
  const total = Math.max(1, Math.ceil(all.length / BOARD_SIZE));
  const asked = Number(searchParams.board);
  const board = Number.isInteger(asked) && asked >= 1 && asked <= total ? asked : total;
  const notices = all.slice((board - 1) * BOARD_SIZE, board * BOARD_SIZE);
  const counts = await enrollmentCounts(notices.flatMap((n) => (n.event_id ? [n.event_id] : [])));
  const linkable = isAdmin() ? await listLinkableEvents() : [];
  return (
    <div className={`${pen.variable} flex flex-col gap-6`}>
      <FaceHeader href="/notice" />
      <NoticeBoard notices={notices} counts={counts} linkable={linkable} admin={isAdmin()} board={board} total={total} />
    </div>
  );
}
