export const metadata = { title: '학자금 슬롯' };

// 친구가 만든 단독 HTML 게임(public/hoegilab/slot.html)을 그대로 끼워 넣는다.
// 게임 안의 팝업이 화면 기준으로 뜨도록 칸을 화면 높이에 맞춰 두고, 안쪽에서 스크롤한다.
export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-[28px] font-black leading-tight">학자금 슬롯</h1>
        <p className="text-[14px] text-inkMuted">학자금 대출 5,000만원을 3학년 가을학기까지 6학기에 나눠 갚는 게임이에요. 번 돈은 통장에 입금해야 상환돼요.</p>
      </header>
      <iframe
        src="/hoegilab/slot.html"
        title="학자금 슬롯"
        loading="lazy"
        className="w-full rounded-[12px] border-2 border-ink bg-lime"
        style={{ height: 'min(88dvh, 1000px)', minHeight: 560 }}
      />
    </div>
  );
}
