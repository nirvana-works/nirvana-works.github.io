// 킹메이커: 사람 한 명 추가
import { bodyOf, king } from '@/lib/kingApi';
import { addPerson } from '@/lib/kingmaker';

export async function POST(request: Request) {
  const b = await bodyOf(request);
  return king(() => addPerson(b.name), 201);
}
