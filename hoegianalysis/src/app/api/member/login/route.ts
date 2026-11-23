// 회원 로그인(POST) / 로그아웃(DELETE)
import { NextRequest, NextResponse } from 'next/server';
import { login, logout, MEMBER_COOKIE, memberCookieOptions } from '@/lib/members';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: unknown; password?: unknown };
    const result = await login(body.email, body.password);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(MEMBER_COOKIE, result.token, memberCookieOptions);
    return res;
  } catch (error) {
    console.error('POST /api/member/login error:', error);
    return NextResponse.json({ error: '로그인하지 못했어요. 다시 시도해 주세요.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await logout(request.cookies.get(MEMBER_COOKIE)?.value);
  } catch (error) {
    console.error('DELETE /api/member/login error:', error); // DB가 안 돼도 쿠키는 지운다
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(MEMBER_COOKIE);
  return res;
}
