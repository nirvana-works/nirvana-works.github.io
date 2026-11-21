// 킹메이커: 후보 이름(우리·상대) 저장
import { bodyOf, king } from '@/lib/kingApi';
import { setMeta } from '@/lib/kingmaker';

export async function PUT(request: Request) {
  const b = await bodyOf(request);
  return king(() => setMeta({ candidate: b.candidate, opponent: b.opponent }));
}
