import { redirect } from 'next/navigation';

// 게임 탭의 첫 화면은 마피아
export default function Page() {
  redirect('/games/mafia');
}
