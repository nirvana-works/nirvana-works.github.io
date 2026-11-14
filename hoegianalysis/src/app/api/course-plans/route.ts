// 개설과목 수강 예정: 전체 목록 보기(누구나)와 올리기(누구나)
import { NextRequest, NextResponse } from 'next/server';
import { PlanError, addCoursePlan, listCoursePlans } from '@/lib/coursePlans';

export const dynamic = 'force-dynamic';

function fail(error: unknown, fallback: string) {
  if (error instanceof PlanError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error('course plans api error:', error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const device = request.nextUrl.searchParams.get('device') ?? '';
    return NextResponse.json({ plans: await listCoursePlans(device) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return fail(error, '수강 예정을 불러오지 못했어요.');
  }
}

export async function POST(request: Request) {
  try {
    const b = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
    await addCoursePlan(b.key, b.name, b.deviceId);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return fail(error, '올리지 못했어요. 다시 시도해 주세요.');
  }
}
