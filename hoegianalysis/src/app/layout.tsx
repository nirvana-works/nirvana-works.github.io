import type { Metadata, Viewport } from 'next';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
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
  // 홈 화면에 추가했을 때 주소창 없이 앱처럼 열리게 (아이폰). 안드로이드는 manifest.ts가 맡는다
  appleWebApp: { capable: true, title: '회기랩', statusBarStyle: 'default' },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#DDE5A6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${display.variable} ${body.variable}`}>
      <body className="bg-gray-50 min-h-screen">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
