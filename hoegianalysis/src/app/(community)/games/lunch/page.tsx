import { LunchRx } from '@/components/community/lunch/LunchRx';

export const metadata = { title: '오늘의 점심 처방전' };

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-[28px] font-black leading-tight">오늘의 점심 처방전</h1>
        <p className="text-[14px] text-inkMuted">의사 넙죽이의 문진에 답하면 오늘의 점심을 처방해 드려요. 처방은 서명하거나 거절할 수 있어요.</p>
      </header>
      <LunchRx />
    </div>
  );
}
