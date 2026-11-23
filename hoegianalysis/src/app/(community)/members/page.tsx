import { redirect } from 'next/navigation';

// 예전 회원 관리 주소 → 교수님의 공간 > 가입 승인
export default function MembersPage() {
  redirect('/office/approvals');
}
