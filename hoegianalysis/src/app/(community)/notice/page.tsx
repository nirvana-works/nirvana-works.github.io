import { ComingSoon } from '@/components/community/ComingSoon';

export const metadata = { title: '공지사항' };

export default function Page() {
  return <ComingSoon href="/notice" note="교수님 공지가 곧 도착합니다." />;
}
