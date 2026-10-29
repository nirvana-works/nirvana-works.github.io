import { ComingSoon } from '@/components/community/ComingSoon';

export const metadata = { title: '신입생 소개' };

export default function Page() {
  return <ComingSoon href="/freshmen" note="입학 허가서를 인쇄하고 있습니다." />;
}
