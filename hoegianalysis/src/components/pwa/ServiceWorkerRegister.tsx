'use client';

import { useEffect } from 'react';

// 앱 설치 조건(안드로이드 Chrome)과 오프라인 안내 화면을 위해 /sw.js를 등록한다. 개발 서버에서는 등록하지 않는다
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}
