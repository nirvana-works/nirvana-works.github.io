// 개설과목 댓글: 개수와 목록 보기(누구나), 댓글 남기기(누구나, 같은 기기는 20초에 한 번)
import { NextRequest, NextResponse } from 'next/server';
import { CommentError, addCourseComment, courseCommentCounts, listCourseComments } from '@/lib/courseComments';

export const dynamic = 'force-dynamic';

function fail(error: unknown, fallback: string) {
  if (error instanceof CommentError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error('course comments api error:', error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

// key가 있으면 그 과목의 댓글 목록, 없으면 과목별 댓글 개수
export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get('key');
    const headers = { 'Cache-Control': 'no-store' };
    if (key) {
      const device = request.nextUrl.searchParams.get('device') ?? '';
      return NextResponse.json({ comments: await listCourseComments(key, device) }, { headers });
    }
    return NextResponse.json({ counts: await courseCommentCounts() }, { headers });
  } catch (error) {
    return fail(error, '댓글을 불러오지 못했어요.');
  }
}

export async function POST(request: Request) {
  try {
    const b = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
    const comment = await addCourseComment(b.key, b.nickname, b.body, b.deviceId);
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return fail(error, '댓글을 남기지 못했어요. 다시 시도해 주세요.');
  }
}
