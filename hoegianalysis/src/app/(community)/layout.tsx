import type { Metadata } from 'next';
import Link from 'next/link';
import { Gothic_A1, Poppins } from 'next/font/google';
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
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-6">{children}</main>
      <footer className="mx-auto w-full max-w-2xl px-4">
        <div className="border-t-2 border-ink py-6 text-[13px] leading-relaxed text-inkMuted">
          <p>회기분석 학회는 공부하지 않습니다. 대신 회기역 근처를 성실하게 먹습니다.</p>
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-bold">
            <Link href="/admin" className="underline underline-offset-4">
              출석체크 시작하기
            </Link>
            <Link href="/admin/load" className="underline underline-offset-4">
              정산 중인 출석 불러오기
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
