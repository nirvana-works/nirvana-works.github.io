// 렉시오 방 만들기 (봇과 / 친구와)
import { createGame } from '@/lib/lexio';
import { bodyOf, respond } from '@/lib/mafiaApi';
import type { LexioMode } from '@/lib/lexioTypes';

export async function POST(request: Request) {
  const b = await bodyOf(request);
  return respond(() => createGame({ mode: b.mode as LexioMode, name: b.name, players: b.players, turnSecs: b.turnSecs }), 201);
}
