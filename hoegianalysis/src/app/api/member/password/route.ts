// 회원 본인 비밀번호 바꾸기
import { NextRequest, NextResponse } from 'next/server';
import { changePassword, getMember } from '@/lib/members';

export async function POST(request: NextRequest) {
  try {
    const member = await getMember();
    if (!member) return NextResponse.json({ error: '다시 로그인해 주세요.' }, { status: 401 });
    const body = (await request.json().catch(() => ({}))) as { current?: unknown; next?: unknown };
    const result = await changePassword(member, body.current, body.next);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/member/password error:', error);
    return NextResponse.json({ error: '비밀번호를 바꾸지 못했어요. 다시 시도해 주세요.' }, { status: 500 });
  }
}
