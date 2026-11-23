import type { Metadata } from 'next';
import { SubHeader } from '@/components/community/SubHeader';
import { InstallGuide } from '@/components/pwa/InstallGuide';

export const metadata: Metadata = { title: '앱으로 설치' };

// 회기랩을 폰 홈 화면에 아이콘으로 두는 방법 (아이폰·안드로이드·카톡)
export default function InstallPage() {
  return (
    <div className="space-y-6">
      <SubHeader title="앱으로 설치" blurb="홈 화면에 회기랩 아이콘을 두면 주소창 없이 앱처럼 바로 열려요." backHref="/" backLabel="홈" />
      <InstallGuide />
    </div>
  );
}
