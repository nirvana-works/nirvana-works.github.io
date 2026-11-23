// 회원 가입 신청. 운영자가 승인해야 로그인할 수 있다
import { NextRequest, NextResponse } from 'next/server';
import { createMember, validateSignup } from '@/lib/members';

export async function POST(request: NextRequest) {
  try {
    const parsed = validateSignup(await request.json().catch(() => null));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const result = await createMember(parsed.value);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('POST /api/member/signup error:', error);
    return NextResponse.json({ error: '가입 신청을 하지 못했어요. 다시 시도해 주세요.' }, { status: 500 });
  }
}
