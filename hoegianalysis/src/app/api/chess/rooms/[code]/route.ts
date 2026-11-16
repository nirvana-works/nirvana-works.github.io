import { getRoom } from '@/lib/chessRooms';
import { respond, tokenOf } from '@/lib/mafiaApi';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { code: string } }) {
  const want = new URL(request.url).searchParams.get('want');
  return respond(() => getRoom(params.code, tokenOf(request), want));
}
