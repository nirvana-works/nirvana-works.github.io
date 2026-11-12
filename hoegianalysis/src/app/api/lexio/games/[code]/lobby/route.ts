import { lobbyAction } from '@/lib/lexio';
import { MafiaError } from '@/lib/mafia';
import { bodyOf, respond, tokenOf } from '@/lib/mafiaApi';

export async function POST(request: Request, { params }: { params: { code: string } }) {
  const b = await bodyOf(request);
  return respond(async () => {
    if (b.op !== 'addbot' && b.op !== 'remove') throw new MafiaError('잘못된 요청이에요.');
    await lobbyAction(params.code, tokenOf(request), b.op, Number(b.index));
  });
}
