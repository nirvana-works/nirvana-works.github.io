import { MafiaError, submitAction } from '@/lib/mafia';
import { bodyOf, respond, tokenOf } from '@/lib/mafiaApi';
import type { ActionKind } from '@/lib/mafiaTypes';

const KINDS: ActionKind[] = ['mafia', 'police', 'doctor', 'vote'];

export async function POST(request: Request, { params }: { params: { code: string } }) {
  const b = await bodyOf(request);
  const kind = KINDS.find((k) => k === b.kind);
  return respond(async () => {
    if (!kind || typeof b.targetId !== 'string') throw new MafiaError('잘못된 요청이에요.');
    await submitAction(params.code, tokenOf(request), kind, b.targetId);
  });
}
