import { NotYetOpen } from '@/components/community/lecture/NotYetOpen';

// 이 강의 자료는 추후 공개 (운영자만 미리 보기)
export default function Layout({ children }: { children: React.ReactNode }) {
  return <NotYetOpen>{children}</NotYetOpen>;
}
