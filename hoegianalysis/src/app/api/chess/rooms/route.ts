// 넙죽이 체스 방 만들기
import { createRoom } from '@/lib/chessRooms';
import { bodyOf, respond } from '@/lib/mafiaApi';

export async function POST(request: Request) {
  const b = await bodyOf(request);
  return respond(() => createRoom({ name: b.name, target: b.target }), 201);
}
