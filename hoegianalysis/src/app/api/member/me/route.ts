// 지금 로그인한 회원의 별명 (화면 위쪽 로그인 표시용).
// 운영자 메일(ADMIN_EMAILS) 회원이면 운영자 로그인이 만료됐어도 여기서 다시 켜 준다
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminCookieOptions, adminToken, isAdmin, isAdminEmail } from '@/lib/adminAuth';
import { getMember } from '@/lib/members';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const m = await getMember();
    const admin = m ? isAdminEmail(m.email) : false;
    const res = NextResponse.json(
      { member: m ? { nickname: m.nickname, admin } : null },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    if (admin && !isAdmin()) res.cookies.set(ADMIN_COOKIE, adminToken(), adminCookieOptions);
    return res;
  } catch (error) {
    console.error('GET /api/member/me error:', error);
    return NextResponse.json({ member: null }, { status: 500 });
  }
}
