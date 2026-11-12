// 넙죽이 블록 점수판: 1~10등 보기, 점수 남기기
import { NextRequest, NextResponse } from 'next/server';
import { submitScore, topScores, validateScore } from '@/lib/blocksScores';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ scores: await topScores(10) });
  } catch (error) {
    console.error('GET /api/blocks/scores error:', error);
    return NextResponse.json({ error: '점수판을 불러오지 못했어요.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = validateScore(await request.json().catch(() => null));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const res = await submitScore(parsed.value);
    if ('error' in res) return NextResponse.json({ error: res.error }, { status: 429 });
    return NextResponse.json({ id: res.id, rank: res.rank, scores: await topScores(10) }, { status: 201 });
  } catch (error) {
    console.error('POST /api/blocks/scores error:', error);
    return NextResponse.json({ error: '점수를 남기지 못했어요. 다시 시도해 주세요.' }, { status: 500 });
  }
}
