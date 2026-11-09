// 멤버 생일 지우기 - 운영자만
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { deleteBirthday } from '@/lib/birthdays';

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) {
    return NextResponse.json({ error: '운영자 로그인이 필요해요.' }, { status: 401 });
  }
  try {
    const deleted = await deleteBirthday(params.id);
    if (!deleted) return NextResponse.json({ error: '이미 지워진 생일이에요.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/birthdays/[id] error:', error);
    return NextResponse.json({ error: '생일을 지우지 못했어요. 다시 시도해 주세요.' }, { status: 500 });
  }
}
