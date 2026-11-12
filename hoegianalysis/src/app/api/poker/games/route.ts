// 인디언 포커 방 만들기 (봇과 / 친구와)
import { createGame } from '@/lib/poker';
import { bodyOf, respond } from '@/lib/mafiaApi';
import type { PokerMode } from '@/lib/pokerTypes';

export async function POST(request: Request) {
  const b = await bodyOf(request);
  return respond(() => createGame({ mode: b.mode as PokerMode, name: b.name, turnSecs: b.turnSecs }), 201);
}
