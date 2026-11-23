// 운영자: 회원 승인·거절·정지·복구·비밀번호 초기화·삭제
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { adminUpdateMember, type AdminAction } from '@/lib/members';

const ACTIONS: AdminAction[] = ['approve', 'reject', 'suspend', 'restore', 'reset', 'delete'];

export async function POST(request: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: '운영자 로그인이 필요해요.' }, { status: 401 });
  try {
    const body = (await request.json().catch(() => ({}))) as { id?: unknown; action?: unknown };
    const id = typeof body.id === 'string' ? body.id : '';
    const action = body.action as AdminAction;
    if (!id || !ACTIONS.includes(action)) return NextResponse.json({ error: '잘못된 요청이에요.' }, { status: 400 });
    const result = await adminUpdateMember(id, action);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/member/admin error:', error);
    return NextResponse.json({ error: '처리하지 못했어요. 다시 시도해 주세요.' }, { status: 500 });
  }
}
