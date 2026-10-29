// 학교 일정 추가 - 누구나, 같은 기기는 20초에 한 번
import { NextRequest, NextResponse } from 'next/server';
import { createEvent, eventCooldownLeft, validateEvent } from '@/lib/schoolEvents';

export async function POST(request: NextRequest) {
  try {
    const parsed = validateEvent(await request.json().catch(() => null));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const wait = await eventCooldownLeft(parsed.value.device_id);
    if (wait > 0) {
      return NextResponse.json({ error: `방금 일정을 추가했어요. ${wait}초 뒤에 다시 추가해 주세요.` }, { status: 429 });
    }

    const id = await createEvent(parsed.value);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error('POST /api/schedule error:', error);
    return NextResponse.json({ error: '일정을 저장하지 못했어요. 다시 시도해 주세요.' }, { status: 500 });
  }
}
