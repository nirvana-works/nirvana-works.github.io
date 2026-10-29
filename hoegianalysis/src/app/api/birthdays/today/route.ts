// 오늘(한국 시간) 생일인 멤버 - 첫 방문 축하 팝업용
import { NextResponse } from 'next/server';
import { birthdayNamesOn } from '@/lib/birthdays';
import { todayKST } from '@/lib/schoolEvents';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const date = todayKST();
    return NextResponse.json({ date, names: await birthdayNamesOn(date) });
  } catch (error) {
    console.error('GET /api/birthdays/today error:', error);
    return NextResponse.json({ error: '오늘 생일을 불러오지 못했어요.' }, { status: 500 });
  }
}
