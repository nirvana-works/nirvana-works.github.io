// 멤버 생일 추가 - 누구나, 같은 기기는 20초에 한 번
import { NextRequest, NextResponse } from 'next/server';
import { birthdayCooldownLeft, createBirthday, validateBirthday } from '@/lib/birthdays';

export async function POST(request: NextRequest) {
  try {
    const parsed = validateBirthday(await request.json().catch(() => null));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const wait = await birthdayCooldownLeft(parsed.value.deviceId);
    if (wait > 0) {
      return NextResponse.json({ error: `방금 생일을 추가했어요. ${wait}초 뒤에 다시 추가해 주세요.` }, { status: 429 });
    }

    const id = await createBirthday(parsed.value);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error('POST /api/birthdays error:', error);
    return NextResponse.json({ error: '생일을 저장하지 못했어요. 다시 시도해 주세요.' }, { status: 500 });
  }
}
