// 킹메이커: 명단과 후보 이름 한 번에 불러오기
import { king } from '@/lib/kingApi';
import { getMeta, listPeople } from '@/lib/kingmaker';

export const dynamic = 'force-dynamic';

export async function GET() {
  return king(async () => ({ people: await listPeople(), meta: await getMeta() }));
}
