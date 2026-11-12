// 공지에 올린 포스터 이미지
import { getNoticeImage } from '@/lib/notices';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const img = await getNoticeImage(params.id);
  if (!img) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(img.data), {
    headers: { 'Content-Type': img.mime, 'Cache-Control': 'public, max-age=3600' },
  });
}
