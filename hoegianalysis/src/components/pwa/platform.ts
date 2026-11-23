// 지금 브라우저가 어떤 폰·어떤 앱 안인지 알아내서, 홈 화면 설치 안내를 맞춰 보여준다

export type InApp = 'kakao' | 'naver' | 'instagram' | 'facebook' | 'line' | 'other';

export type Platform = {
  os: 'ios' | 'android' | 'other';
  inApp: InApp | null; // 카톡처럼 다른 앱 안에서 열린 브라우저 (여기선 홈 화면 추가가 안 된다)
  standalone: boolean; // 이미 홈 화면 앱으로 열려 있음
  mobile: boolean;
};

export const IN_APP_NAME: Record<InApp, string> = {
  kakao: '카카오톡',
  naver: '네이버 앱',
  instagram: '인스타그램',
  facebook: '페이스북',
  line: '라인',
  other: '앱',
};

export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const ipadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  const os = /iPhone|iPad|iPod/.test(ua) || ipadOS ? 'ios' : /Android/.test(ua) ? 'android' : 'other';

  let inApp: InApp | null = null;
  if (/KAKAOTALK/i.test(ua)) inApp = 'kakao';
  else if (/NAVER\(inapp|NAVER/i.test(ua)) inApp = 'naver';
  else if (/Instagram/i.test(ua)) inApp = 'instagram';
  else if (/FBAN|FBAV/i.test(ua)) inApp = 'facebook';
  else if (/\bLine\//i.test(ua)) inApp = 'line';
  else if (os === 'android' && /; wv\)/.test(ua)) inApp = 'other';

  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  return { os, inApp, standalone, mobile: os !== 'other' };
}

// 앱 안 브라우저에서 기본 브라우저(사파리·크롬)로 이 주소를 다시 연다. 못 여는 경우 false
export function openInExternalBrowser(p: Platform, url = window.location.href): boolean {
  if (p.inApp === 'kakao') {
    window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
    return true;
  }
  if (p.os === 'android' && p.inApp) {
    const u = new URL(url);
    window.location.href = `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(':', '')};package=com.android.chrome;end`;
    return true;
  }
  return false; // 아이폰의 카톡 외 앱은 직접 'Safari로 열기'를 눌러야 한다
}

// 안드로이드 크롬이 주는 '설치' 창
export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};
