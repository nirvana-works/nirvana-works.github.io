import { startGame } from '@/lib/lexio';
import { respond, tokenOf } from '@/lib/mafiaApi';

export async function POST(request: Request, { params }: { params: { code: string } }) {
  return respond(() => startGame(params.code, tokenOf(request)));
}
