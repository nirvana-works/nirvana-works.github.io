// 회기분석 수강신청: 신청자 보기(누구나)와 신청하기(누구나)
import { NextRequest, NextResponse } from 'next/server';
import { EnrollError, addEnrollment, listEnrollments } from '@/lib/enrollments';

export const dynamic = 'force-dynamic';

function fail(error: unknown, fallback: string) {
  if (error instanceof EnrollError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error('enroll api error:', error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const device = request.nextUrl.searchParams.get('device') ?? '';
    return NextResponse.json({ enrollments: await listEnrollments(params.id, device) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return fail(error, '신청자를 불러오지 못했어요.');
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const b = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
    await addEnrollment(params.id, b.name, b.deviceId);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return fail(error, '신청하지 못했어요. 다시 시도해 주세요.');
  }
}
