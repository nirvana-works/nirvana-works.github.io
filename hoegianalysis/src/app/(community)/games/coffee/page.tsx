import { CoffeeDog } from '@/components/community/coffee/CoffeeDog';

export const metadata = { title: '커피 마려운 댕댕이' };

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-[28px] font-black leading-tight">커피 마려운 댕댕이</h1>
        <p className="text-[14px] text-inkMuted">카드나 핸드폰을 한 명씩 보여 주면, 커피가 마려운 멍멍이가 오늘 얻어먹을 한 명을 냄새로 찾아내요.</p>
      </header>
      <CoffeeDog />
    </div>
  );
}
