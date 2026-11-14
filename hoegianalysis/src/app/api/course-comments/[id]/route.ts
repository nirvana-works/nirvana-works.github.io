// 과목 댓글 삭제 - 남긴 기기 또는 운영자
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { removeCourseComment } from '@/lib/courseComments';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const device = request.nextUrl.searchParams.get('device') ?? '';
    const ok = await removeCourseComment(params.id, device, isAdmin());
    if (!ok) return NextResponse.json({ error: '지울 수 없어요. 본인이 남긴 기기에서만 지울 수 있어요.' }, { status: 403 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE course comment error:', error);
    return NextResponse.json({ error: '지우지 못했어요. 다시 시도해 주세요.' }, { status: 500 });
  }
}
