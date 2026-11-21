// 킹메이커 로그인(POST) / 로그아웃(DELETE)
import { NextRequest, NextResponse } from 'next/server';
import { KING_COOKIE, KING_COOKIE_MAX_AGE, checkKingPassword, kingConfigured, kingToken } from '@/lib/kingAuth';

// 같은 곳에서 계속 틀리면 잠시 막는다 (서버가 여러 대면 완벽하진 않지만 무작위 대입을 늦춘다)
const fails = new Map<string, { n: number; until: number }>();

export async function POST(request: NextRequest) {
  if (!kingConfigured()) {
    return NextResponse.json({ error: '암호(KINGMAKER_PASSWORD)가 아직 설정되지 않았어요.' }, { status: 503 });
  }
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'local';
  const f = fails.get(ip);
  if (f && f.until > Date.now() && f.n >= 6) {
    return NextResponse.json({ error: '너무 여러 번 틀렸어요. 잠시 뒤 다시 시도해 주세요.' }, { status: 429 });
  }
  const body = (await request.json().catch(() => ({}))) as { password?: unknown };
  const password = typeof body.password === 'string' ? body.password : '';
  if (!password || !checkKingPassword(password)) {
    fails.set(ip, { n: (f && f.until > Date.now() ? f.n : 0) + 1, until: Date.now() + 10 * 60 * 1000 });
    await new Promise((r) => setTimeout(r, 700));
    return NextResponse.json({ error: '암호가 맞지 않아요.' }, { status: 401 });
  }
  fails.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(KING_COOKIE, kingToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: KING_COOKIE_MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(KING_COOKIE);
  return res;
}
