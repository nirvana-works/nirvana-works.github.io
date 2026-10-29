import { ComingSoon } from '@/components/community/ComingSoon';

export const metadata = { title: '출석 성적표' };

export default function Page() {
  return <ComingSoon href="/attendance" note="채점이 끝나면 열립니다. 이의 신청은 받지 않습니다." />;
}
