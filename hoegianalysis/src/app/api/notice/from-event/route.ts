// 학교 일정 하나를 공지로 올리기 - 운영자만, 한 일정에 공지 하나
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { createNoticeFromEvent } from '@/lib/notices';

export async function POST(request: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: '운영자 로그인이 필요해요.' }, { status: 401 });
  try {
    const body = (await request.json().catch(() => null)) as { event_id?: unknown } | null;
    const eventId = typeof body?.event_id === 'string' ? body.event_id : '';
    if (!eventId) return NextResponse.json({ error: '일정을 찾지 못했어요.' }, { status: 400 });
    const made = await createNoticeFromEvent(eventId);
    if (!made) return NextResponse.json({ error: '이미 지워진 일정이에요.' }, { status: 404 });
    return NextResponse.json(made, { status: made.existed ? 200 : 201 });
  } catch (error) {
    console.error('POST /api/notice/from-event error:', error);
    return NextResponse.json({ error: '공지로 올리지 못했어요. 다시 시도해 주세요.' }, { status: 500 });
  }
}
