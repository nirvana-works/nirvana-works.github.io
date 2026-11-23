// 회원 관련 타입 (브라우저 코드에서도 쓴다)
export type MemberStatus = 'pending' | 'active' | 'rejected' | 'suspended';

export type MemberSummary = {
  id: string;
  email: string;
  name: string;
  cohort: string;
  nickname: string;
  message: string | null;
  status: MemberStatus;
  created_at: string;
  approved_at: string | null;
  last_login_at: string | null;
};

export const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = {
  pending: '승인 대기',
  active: '회원',
  rejected: '거절',
  suspended: '정지',
};
