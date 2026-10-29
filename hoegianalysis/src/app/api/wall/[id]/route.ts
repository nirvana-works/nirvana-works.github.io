// 낙서 지우기 - 운영자만 (벽에서 숨김)
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { hideWallPost } from '@/lib/wallPosts';

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) {
    return NextResponse.json({ error: '운영자 로그인이 필요해요.' }, { status: 401 });
  }
  try {
    const hidden = await hideWallPost(params.id);
    if (!hidden) return NextResponse.json({ error: '이미 지워진 낙서예요.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/wall/[id] error:', error);
    return NextResponse.json({ error: '낙서를 지우지 못했어요. 다시 시도해 주세요.' }, { status: 500 });
  }
}
