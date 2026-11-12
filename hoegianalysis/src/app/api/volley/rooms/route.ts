// 넙죽이 배구 방 만들기
import { createRoom } from '@/lib/volleyRooms';
import { bodyOf, respond } from '@/lib/mafiaApi';

export async function POST(request: Request) {
  const b = await bodyOf(request);
  return respond(() => createRoom({ name: b.name, target: b.target }), 201);
}
