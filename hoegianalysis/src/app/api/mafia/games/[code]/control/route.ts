import { MafiaError, control } from '@/lib/mafia';
import { bodyOf, respond, tokenOf } from '@/lib/mafiaApi';
import type { Settings } from '@/lib/mafiaTypes';

export async function POST(request: Request, { params }: { params: { code: string } }) {
  const b = await bodyOf(request);
  return respond(async () => {
    if (b.type === 'skip') return control(params.code, tokenOf(request), { type: 'skip' });
    if (b.type === 'extend') return control(params.code, tokenOf(request), { type: 'extend', secs: Number(b.secs) || 0 });
    if (b.type === 'settings') return control(params.code, tokenOf(request), { type: 'settings', settings: (b.settings ?? {}) as Partial<Settings> });
    throw new MafiaError('잘못된 요청이에요.');
  });
}
