import { act } from '@/lib/lexio';
import { MafiaError } from '@/lib/mafia';
import { bodyOf, respond, tokenOf } from '@/lib/mafiaApi';

export async function POST(request: Request, { params }: { params: { code: string } }) {
  const b = await bodyOf(request);
  return respond(async () => {
    if (b.type === 'pass') return act(params.code, tokenOf(request), { type: 'pass' });
    if (b.type === 'next') return act(params.code, tokenOf(request), { type: 'next' });
    if (b.type === 'play' && Array.isArray(b.tiles) && b.tiles.every((t) => Number.isInteger(t))) {
      return act(params.code, tokenOf(request), { type: 'play', tiles: b.tiles as number[] });
    }
    throw new MafiaError('잘못된 요청이에요.');
  });
}
