// 낙서 벽에 글 남기기 - 회원만, 이름은 등록된 별명으로. 같은 기기는 30초에 한 번
import { NextRequest, NextResponse } from 'next/server';
import { getMember } from '@/lib/members';
import { cooldownLeft, createWallPost, validateWallPost } from '@/lib/wallPosts';

export async function POST(request: NextRequest) {
  try {
    const member = await getMember();
    if (!member) return NextResponse.json({ error: '로그인해야 낙서할 수 있어요.' }, { status: 401 });
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    // 보낸 별명은 무시하고 회원 별명으로 남긴다
    const parsed = validateWallPost({ ...(body ?? {}), nickname: member.nickname });
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
