// 커뮤니티 운영자 로그인(POST) / 로그아웃(DELETE)
import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, adminConfigured, adminToken, checkAdminPassword } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  if (!adminConfigured()) {
    return NextResponse.json({ error: '운영자 비밀번호(ADMIN_PASSWORD)가 아직 설정되지 않았어요.' }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { password?: unknown };
  const password = typeof body.password === 'string' ? body.password : '';
  if (!password || !checkAdminPassword(password)) {
    return NextResponse.json({ error: '비밀번호가 맞지 않아요.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
