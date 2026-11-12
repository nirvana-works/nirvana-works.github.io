// 공지 등록 - 운영자만
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { createNotice, validateNotice } from '@/lib/notices';

export async function POST(request: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: '운영자 로그인이 필요해요.' }, { status: 401 });
  try {
    const parsed = validateNotice(await request.json().catch(() => null));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const id = await createNotice(parsed.value);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error('POST /api/notice error:', error);
    return NextResponse.json({ error: '공지를 저장하지 못했어요. 다시 시도해 주세요.' }, { status: 500 });
  }
}
