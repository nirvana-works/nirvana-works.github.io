import { getState } from '@/lib/lexio';
import { respond, tokenOf } from '@/lib/mafiaApi';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { code: string } }) {
  const since = Number(new URL(request.url).searchParams.get('since') ?? 0) || 0;
  return respond(() => getState(params.code, tokenOf(request), since));
}
