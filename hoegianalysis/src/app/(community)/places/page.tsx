import { ComingSoon } from '@/components/community/ComingSoon';

export const metadata = { title: '가고 싶은 곳' };

export default function Page() {
  return <ComingSoon href="/places" note="맛집 제보함을 설치하고 있습니다." />;
}
