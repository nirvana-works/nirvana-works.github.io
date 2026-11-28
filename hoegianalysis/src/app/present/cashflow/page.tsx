import { Presenter } from '@/components/community/lecture/Presenter';

export const metadata = { title: '발표 · 직장인의 현금흐름 파이프라인 설계 · Hoegilab' };

export default function CashflowPresentPage() {
  return <Presenter backHref="/lectures/cashflow" />;
}
