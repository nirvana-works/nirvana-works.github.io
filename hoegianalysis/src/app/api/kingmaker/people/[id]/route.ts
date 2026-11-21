// 킹메이커: 입장·코멘트·제외 바꾸기 / 사람 지우기
import { bodyOf, king } from '@/lib/kingApi';
import { removePerson, updatePerson } from '@/lib/kingmaker';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const b = await bodyOf(request);
  const patch: { stance?: unknown; comment?: unknown; excluded?: unknown } = {};
  if ('stance' in b) patch.stance = b.stance;
  if ('comment' in b) patch.comment = b.comment;
  if ('excluded' in b) patch.excluded = b.excluded;
  return king(() => updatePerson(params.id, patch));
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  return king(() => removePerson(params.id));
}
