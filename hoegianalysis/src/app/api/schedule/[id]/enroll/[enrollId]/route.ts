// 수강신청 취소 - 신청한 기기 또는 운영자
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { removeEnrollment } from '@/lib/enrollments';

export async function DELETE(request: NextRequest, { params }: { params: { id: string; enrollId: string } }) {
  try {
    const device = request.nextUrl.searchParams.get('device') ?? '';
    const ok = await removeEnrollment(params.id, params.enrollId, device, isAdmin());
    if (!ok) return NextResponse.json({ error: '취소할 수 없어요. 본인이 신청한 기기에서만 취소할 수 있어요.' }, { status: 403 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE enroll error:', error);
    return NextResponse.json({ error: '취소하지 못했어요. 다시 시도해 주세요.' }, { status: 500 });
  }
}
