import { rematch } from '@/lib/poker';
import { respond, tokenOf } from '@/lib/mafiaApi';

export async function POST(request: Request, { params }: { params: { code: string } }) {
  return respond(() => rematch(params.code, tokenOf(request)));
}
