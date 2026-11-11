// 마피아 방 만들기
import { createGame } from '@/lib/mafia';
import { bodyOf, respond } from '@/lib/mafiaApi';
import type { GameMode } from '@/lib/mafiaTypes';

export async function POST(request: Request) {
  const b = await bodyOf(request);
  return respond(
    () =>
      createGame({
        mode: b.mode as GameMode,
        hostName: b.hostName,
        settings: (b.settings ?? {}) as object,
      }),
    201,
  );
}
