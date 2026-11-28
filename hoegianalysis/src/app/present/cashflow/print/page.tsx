import { CASHFLOW_DECK, CASHFLOW_SLIDES } from '@/components/community/lecture/cashflowDeck';
import { SlideCanvas, SLIDE_H, SLIDE_W } from '@/components/community/lecture/SlideCanvas';

export const metadata = { title: '인쇄 · 직장인의 현금흐름 파이프라인 설계 · Hoegilab' };

// PDF용: 16장을 1600×900 한 장씩 이어 붙인다. 브라우저 인쇄(또는 headless Chrome --print-to-pdf)로 16:9 PDF가 된다
export default function CashflowPrintPage() {
  const total = CASHFLOW_SLIDES.length;
  return (
    <>
      <style>{`
        @page { size: ${SLIDE_W}px ${SLIDE_H}px; margin: 0; }
        html, body { margin: 0; padding: 0; background: #DDE5A6; scrollbar-width: none; }
        html::-webkit-scrollbar { display: none; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .print-slide { width: ${SLIDE_W}px; height: ${SLIDE_H}px; overflow: hidden; break-after: page; }
        .print-slide:last-child { break-after: auto; }
        .print-slide .dot-cluster { display: none; } /* 점 무늬 배경은 PDF에서 큰 점으로 뭉개진다 */
      `}</style>
      {CASHFLOW_SLIDES.map((s, i) => (
        <section key={i} className="print-slide">
          <SlideCanvas fit="none" index={i} total={total} deckTitle={CASHFLOW_DECK.title}>
            {s.body}
          </SlideCanvas>
        </section>
      ))}
    </>
  );
}
