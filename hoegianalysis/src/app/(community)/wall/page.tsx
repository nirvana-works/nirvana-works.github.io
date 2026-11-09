import { Nanum_Pen_Script } from 'next/font/google';
import { FaceHeader } from '@/components/community/FaceHeader';
import { WallBoard } from '@/components/community/wall/WallBoard';
import { isAdmin } from '@/lib/adminAuth';
import { listWallPosts } from '@/lib/wallPosts';

// 벽 낙서 글씨 (매직·분필 손글씨)
const pen = Nanum_Pen_Script({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pen',
  adjustFontFallback: false, // 이 글꼴은 Next에 대체 글꼴 보정값이 없다
});

export const metadata = { title: '낙서 벽' };
export const dynamic = 'force-dynamic';

export default async function WallPage() {
  const posts = await listWallPosts();

  return (
    <div className={`${pen.variable} flex flex-col gap-6`}>
      <FaceHeader href="/wall" />
      <WallBoard initialPosts={posts} canDelete={isAdmin()} />
    </div>
  );
}
