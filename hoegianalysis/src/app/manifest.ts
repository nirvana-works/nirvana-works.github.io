import type { MetadataRoute } from 'next';

// 홈 화면에 설치했을 때의 앱 정보 (/manifest.webmanifest 로 나간다)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '회기랩 Hoegilab',
    short_name: '회기랩',
    description: '놀고 먹자, 회기분석 학회. 회기랩 커뮤니티',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#DDE5A6',
    theme_color: '#DDE5A6',
    lang: 'ko',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
