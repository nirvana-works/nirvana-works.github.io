import { Nanum_Pen_Script } from 'next/font/google';
import { NupjukBlocks } from '@/components/community/blocks/NupjukBlocks';

// 칠판 낙서 글씨
const pen = Nanum_Pen_Script({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pen',
  adjustFontFallback: false,
});

export const metadata = { title: '넙죽이 블록' };

export default function Page() {
  return (
    <div className={`${pen.variable} flex flex-col gap-4`}>
      <header>
        <h1 className="text-[28px] font-black leading-tight">넙죽이 블록</h1>
        <p className="text-[14px] text-inkMuted">분필로 낙서한 칠판 위에 블록을 쌓아요. 컴퓨터는 키보드, 폰은 터치로 할 수 있어요.</p>
      </header>
      {/* 컴퓨터에서는 순위표를 오른쪽에 두려고 본문 폭보다 넓게 쓴다 */}
      <div className="lg:relative lg:left-1/2 lg:w-[min(1040px,calc(100vw_-_48px))] lg:-translate-x-1/2">
        <NupjukBlocks />
      </div>
    </div>
  );
}
