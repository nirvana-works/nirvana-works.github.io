import { NotYetOpen } from '@/components/community/lecture/NotYetOpen';

// 발표 모드·인쇄 화면도 포트폴리오 강의 자료라서 추후 공개 (운영자만 미리 보기)
export default function Layout({ children }: { children: React.ReactNode }) {
  return <NotYetOpen>{children}</NotYetOpen>;
}
