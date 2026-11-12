import { Nanum_Brush_Script } from 'next/font/google';
import { HwatuFortune } from '@/components/community/hwatu/HwatuFortune';

// 제목·도장 글씨용 붓글씨체
const brush = Nanum_Brush_Script({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-brush',
  adjustFontFallback: false,
});

export const metadata = { title: '화투점' };

export default function Page() {
  return (
    <div className={brush.variable}>
      <HwatuFortune />
    </div>
  );
}
