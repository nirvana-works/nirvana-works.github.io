// 공지 내리기 - 운영자만
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { deleteNotice } from '@/lib/notices';

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: '운영자 로그인이 필요해요.' }, { status: 401 });
  try {
    const ok = await deleteNotice(params.id);
    if (!ok) return NextResponse.json({ error: '이미 내려간 공지예요.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/notice/[id] error:', error);
    return NextResponse.json({ error: '공지를 내리지 못했어요. 다시 시도해 주세요.' }, { status: 500 });
  }
}
