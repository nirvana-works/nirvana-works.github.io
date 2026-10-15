import type { Metadata } from 'next';
import { Black_Han_Sans, Noto_Sans_KR } from 'next/font/google';
import './globals.css';

const display = Black_Han_Sans({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
});

const body = Noto_Sans_KR({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: '회기분석 출석체크',
  description: 'QR코드 기반 회기분석 차수별 출석체크 앱',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${display.variable} ${body.variable}`}>
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
