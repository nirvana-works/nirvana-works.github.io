import { act } from '@/lib/poker';
import { MafiaError } from '@/lib/mafia';
import { bodyOf, respond, tokenOf } from '@/lib/mafiaApi';
import type { ActionType } from '@/lib/pokerEngine';

const ACTIONS: ActionType[] = ['call', 'raise', 'fold', 'allin'];

export async function POST(request: Request, { params }: { params: { code: string } }) {
  const b = await bodyOf(request);
  const action = ACTIONS.find((a) => a === b.action);
  return respond(async () => {
    if (!action) throw new MafiaError('잘못된 요청이에요.');
    await act(params.code, tokenOf(request), action);
  });
}
