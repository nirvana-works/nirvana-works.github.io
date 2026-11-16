// 지운 낙서 보기와 되살리기 - 운영자만
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { listHiddenWallPosts, restoreWallPosts } from '@/lib/wallPosts';

export const dynamic = 'force-dynamic';

const NEED_ADMIN = { error: '운영자 로그인이 필요해요.' };

export async function GET() {
  if (!isAdmin()) return NextResponse.json(NEED_ADMIN, { status: 401 });
  try {
    return NextResponse.json({ posts: await listHiddenWallPosts() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('GET /api/wall/hidden error:', error);
    return NextResponse.json({ error: '지운 낙서를 불러오지 못했어요.' }, { status: 500 });
  }
}

// { all: true } 이면 지운 낙서를 전부, { ids: [...] } 이면 고른 것만 되살린다
export async function POST(request: Request) {
  if (!isAdmin()) return NextResponse.json(NEED_ADMIN, { status: 401 });
  try {
    const b = ((await request.json().catch(() => null)) ?? {}) as { all?: unknown; ids?: unknown };
    const ids = Array.isArray(b.ids) ? b.ids.filter((x): x is string => typeof x === 'string').slice(0, 500) : [];
    if (b.all !== true && ids.length === 0) return NextResponse.json({ error: '되살릴 낙서를 골라 주세요.' }, { status: 400 });
    const restored = await restoreWallPosts(b.all === true ? 'all' : ids);
    return NextResponse.json({ restored });
  } catch (error) {
    console.error('POST /api/wall/hidden error:', error);
    return NextResponse.json({ error: '되살리지 못했어요. 다시 시도해 주세요.' }, { status: 500 });
  }
}
