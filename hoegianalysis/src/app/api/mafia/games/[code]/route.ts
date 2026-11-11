// 마피아 방 상태 (폰들이 계속 받아간다). ?since=버전 이 같으면 바뀐 게 없다고만 답한다
import { getState } from '@/lib/mafia';
import { respond, tokenOf } from '@/lib/mafiaApi';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { code: string } }) {
  const since = Number(new URL(request.url).searchParams.get('since') ?? 0) || 0;
  return respond(() => getState(params.code, tokenOf(request), since));
}
