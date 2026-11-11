import { kickPlayer } from '@/lib/mafia';
import { bodyOf, respond, tokenOf } from '@/lib/mafiaApi';

export async function POST(request: Request, { params }: { params: { code: string } }) {
  const b = await bodyOf(request);
  return respond(() => kickPlayer(params.code, tokenOf(request), String(b.playerId ?? '')));
}
