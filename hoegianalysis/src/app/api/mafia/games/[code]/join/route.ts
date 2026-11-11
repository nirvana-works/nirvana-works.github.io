import { joinGame } from '@/lib/mafia';
import { bodyOf, respond } from '@/lib/mafiaApi';

export async function POST(request: Request, { params }: { params: { code: string } }) {
  const b = await bodyOf(request);
  return respond(() => joinGame(params.code, b.name), 201);
}
