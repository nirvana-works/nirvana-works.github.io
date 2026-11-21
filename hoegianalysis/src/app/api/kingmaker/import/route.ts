// 킹메이커: 붙여 넣은 명단 가져오기
import { bodyOf, king } from '@/lib/kingApi';
import { importPeople } from '@/lib/kingmaker';

export async function POST(request: Request) {
  const b = await bodyOf(request);
  return king(() => importPeople(b.text), 201);
}
