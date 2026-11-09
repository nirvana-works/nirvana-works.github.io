// 낙서 벽에 글 남기기 - 로그인 없이, 같은 기기는 30초에 한 번
import { NextRequest, NextResponse } from 'next/server';
import { cooldownLeft, createWallPost, validateWallPost } from '@/lib/wallPosts';

export async function POST(request: NextRequest) {
  try {
    const parsed = validateWallPost(await request.json().catch(() => null));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const wait = await cooldownLeft(parsed.value.deviceId);
    if (wait > 0) {
      return NextResponse.json({ error: `방금 낙서했어요. ${wait}초 뒤에 다시 써 주세요.` }, { status: 429 });
    }

    const post = await createWallPost(parsed.value);
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('POST /api/wall error:', error);
    return NextResponse.json({ error: '낙서를 남기지 못했어요. 다시 시도해 주세요.' }, { status: 500 });
  }
}
