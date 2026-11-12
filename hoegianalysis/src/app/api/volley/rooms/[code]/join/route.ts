import { joinRoom } from '@/lib/volleyRooms';
import { bodyOf, respond } from '@/lib/mafiaApi';

export async function POST(request: Request, { params }: { params: { code: string } }) {
  const b = await bodyOf(request);
  return respond(() => joinRoom(params.code, b.name), 201);
}
