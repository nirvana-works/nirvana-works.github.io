import type { Metadata } from 'next';
import { Gothic_A1, Poppins } from 'next/font/google';
import { BirthdayCelebration } from '@/components/community/BirthdayCelebration';
import { CubeShell } from '@/components/community/CubeShell';
import './community.css';

// 한글은 고딕 한 가족으로 제목부터 본문까지
const sign = Gothic_A1({
  weight: ['400', '700', '900'],
  subsets: ['latin'],
  variable: '--font-sign',
});

// 워드마크·숫자 같은 영문 자리 (포스터의 기하학 산세리프)
const latin = Poppins({
  weight: ['500', '600'],
  subsets: ['latin'],
  variable: '--font-latin',
});

export const metadata: Metadata = {
  title: { default: 'Hoegilab', template: '%s · Hoegilab' },
  description: '놀고 먹자, 회기분석 학회. 회기랩 커뮤니티',
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${sign.variable} ${latin.variable} hl-root flex min-h-screen flex-col break-keep font-sign`}>
      <CubeShell />
      <BirthdayCelebration />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-6">{children}</main>
      <footer className="mx-auto w-full max-w-2xl px-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t-2 border-ink py-6 font-latin text-[13px] text-inkMuted">
          {/* 회식 '차수(round)'에 빗댄 저작권 문구 */}
          <p>© {new Date().getFullYear()} Hoegilab. All rounds reserved.</p>
          <p>
            Designed &amp; built by <span className="font-semibold text-ink">JH</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
