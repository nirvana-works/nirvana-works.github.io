// 운영자: 출석 기록 한 줄 삭제
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { deleteCheckin } from '@/lib/history';

export async function DELETE(_request: Request, { params }: { params: { checkinId: string } }) {
  if (!isAdmin()) {
    return NextResponse.json({ error: '운영자 로그인이 필요해요.' }, { status: 401 });
  }
  try {
    const deleted = await deleteCheckin(params.checkinId);
    if (!deleted) return NextResponse.json({ error: '이미 지워졌거나 없는 기록이에요.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/history/checkins/[checkinId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
