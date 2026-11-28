import { Archivo, Archivo_Black, Black_Han_Sans, Gothic_A1 } from 'next/font/google';
import { MembersOnly } from '@/components/member/MembersOnly';
import '../(community)/community.css';

// 디자인 시안 보관함의 견본 페이지들. 시안마다 자기 세계라서 커뮤니티 큐브·푸터 없이 화면 전체를 쓴다
const nbDisplay = Archivo_Black({ weight: '400', subsets: ['latin'], variable: '--font-nb-display' });
const nbKoDisplay = Black_Han_Sans({ weight: '400', subsets: ['latin'], variable: '--font-nb-ko-display' });
const nbBody = Archivo({ weight: ['500', '700', '800'], subsets: ['latin'], variable: '--font-nb-body' });
const nbKoBody = Gothic_A1({ weight: ['400', '700', '900'], subsets: ['latin'], variable: '--font-nb-ko-body' });
// 잠금 화면용 (회기랩 글꼴)
const sign = Gothic_A1({ weight: ['400', '700', '900'], subsets: ['latin'], variable: '--font-sign' });

export default function DesignsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${nbDisplay.variable} ${nbKoDisplay.variable} ${nbBody.variable} ${nbKoBody.variable} ${sign.variable} hl-root min-h-screen break-keep font-sign`}>
      <MembersOnly what="포트폴리오" next="/portfolio/designs">
        {children}
      </MembersOnly>
    </div>
  );
}
