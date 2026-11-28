import { Gothic_A1, Poppins } from 'next/font/google';
import '../(community)/community.css';

// 강의 발표 모드 전용 레이아웃: 커뮤니티 큐브·푸터 없이 화면 전체를 슬라이드에 쓴다 (글꼴은 커뮤니티와 같다)
const sign = Gothic_A1({ weight: ['400', '700', '900'], subsets: ['latin'], variable: '--font-sign' });
const latin = Poppins({ weight: ['500', '600'], subsets: ['latin'], variable: '--font-latin' });

export default function PresentLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${sign.variable} ${latin.variable} hl-root min-h-screen break-keep font-sign`}>{children}</div>;
}
