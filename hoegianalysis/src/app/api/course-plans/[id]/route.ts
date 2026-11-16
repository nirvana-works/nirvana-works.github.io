// 수강 예정 취소 - 올린 기기 또는 운영자
import { NextRequest } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { removeCoursePlan } from '@/lib/coursePlans';
import { json, preflight } from '@/lib/cors';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const device = request.nextUrl.searchParams.get('device') ?? '';
    const ok = await removeCoursePlan(params.id, device, isAdmin());
    if (!ok) return json({ error: '취소할 수 없어요. 본인이 올린 기기에서만 취소할 수 있어요.' }, { status: 403 });
    return json({ ok: true });
  } catch (error) {
    console.error('DELETE course plan error:', error);
    return json({ error: '취소하지 못했어요. 다시 시도해 주세요.' }, { status: 500 });
  }
}

export function OPTIONS() {
  return preflight();
}
