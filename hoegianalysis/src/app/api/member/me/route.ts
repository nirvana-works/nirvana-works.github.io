// 지금 로그인한 회원의 별명 (화면 위쪽 로그인 표시용)
import { NextResponse } from 'next/server';
import { getMember } from '@/lib/members';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const m = await getMember();
    return NextResponse.json({ member: m ? { nickname: m.nickname } : null }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('GET /api/member/me error:', error);
    return NextResponse.json({ member: null }, { status: 500 });
  }
}
