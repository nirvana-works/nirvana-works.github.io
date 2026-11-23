import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic'; // 정적으로 굳히면 Location 헤더 없는 307 페이지가 된다

// 예전 회원 관리 주소 → 교수님의 공간 > 가입 승인
export default function MembersPage() {
  redirect('/office/approvals');
}
