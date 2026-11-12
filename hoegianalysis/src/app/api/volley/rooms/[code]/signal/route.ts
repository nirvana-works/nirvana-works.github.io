import { postSignal } from '@/lib/volleyRooms';
import { bodyOf, respond, tokenOf } from '@/lib/mafiaApi';

export async function POST(request: Request, { params }: { params: { code: string } }) {
  const b = await bodyOf(request);
  return respond(() => postSignal(params.code, tokenOf(request), b.kind, b.sdp));
}
