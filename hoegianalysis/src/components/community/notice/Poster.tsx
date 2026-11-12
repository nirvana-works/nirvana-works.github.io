import type { Notice } from '@/lib/notices';

// 대자보 한 장. 글자 크기를 컨테이너 폭(cqw) 기준으로 잡아, 게시판 썸네일과 확대 화면이 같은 모양으로 커지고 줄어든다.
// 포스터 이미지를 올린 공지는 그 이미지를 그대로, 아니면 제목·일시·장소로 이 틀을 채운다.
export function Poster({ notice, fit = 'full' }: { notice: Notice; fit?: 'thumb' | 'full' }) {
  if (notice.has_image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/notice/${notice.id}/image`}
        alt={notice.title}
        draggable={false}
        className={`block w-full select-none bg-[#F4F0E4] ${fit === 'thumb' ? 'aspect-[1/1.414] object-cover object-top' : 'h-auto'}`}
      />
    );
  }

  const len = [...notice.title].length;
  const titleSize = len <= 8 ? 13 : len <= 14 ? 9.5 : len <= 22 ? 7.5 : 6;
  const rows = [
    notice.when_text ? ['일시', notice.when_text] : null,
    notice.place ? ['장소', notice.place] : null,
  ].filter(Boolean) as [string, string][];

  return (
    <div style={{ containerType: 'inline-size' }} className="w-full">
      <div className="relative flex aspect-[1/1.414] flex-col overflow-hidden bg-[#F4F0E4] text-[#1b1b1b]" style={{ padding: '6cqw', gap: '3cqw' }}>
        <div className="flex items-start justify-between" style={{ gap: '2cqw' }}>
          <p className="font-semibold tracking-[0.08em]" style={{ fontSize: '3cqw', lineHeight: 1.3 }}>
            KAIST MBA · 회기분석 학회 공고 제{notice.issue_no}호
          </p>
          {notice.urgent && (
            <span className="shrink-0 -rotate-2 bg-seal font-black text-white" style={{ fontSize: '3.4cqw', padding: '1cqw 2.4cqw' }}>
              긴급 공지
            </span>
          )}
        </div>
        <div className="bg-[#1b1b1b]" style={{ height: '0.8cqw' }} />

        <div>
          {notice.kicker && (
            <p className="font-black text-seal" style={{ fontSize: '6.5cqw', lineHeight: 1.1 }}>
              {notice.kicker}
            </p>
          )}
          <h3 className="break-keep font-black" style={{ fontSize: `${titleSize}cqw`, lineHeight: 1.12 }}>
            {notice.title}
          </h3>
        </div>

        {/* 사진 자리: 테이프로 붙인 액자 */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-lime" style={{ border: '0.7cqw solid #1b1b1b', transform: 'rotate(-0.6deg)' }}>
          <span aria-hidden className="absolute bg-[#e9dd9a]/80" style={{ top: '-2.4cqw', left: '4cqw', width: '16cqw', height: '4.4cqw', transform: 'rotate(-5deg)' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hoegilab/nupjuk-megaphone.webp" alt="" aria-hidden draggable={false} className="h-[86%] w-auto select-none object-contain" />
        </div>

        {notice.body && (
          <p className="line-clamp-4 whitespace-pre-line text-center font-pen text-seal" style={{ fontSize: '6cqw', lineHeight: 1.15 }}>
            {notice.body}
          </p>
        )}

        {rows.length > 0 && (
          <div className="border-t-[0.7cqw] border-[#1b1b1b]">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-baseline border-b border-[#1b1b1b]/40" style={{ gap: '4cqw', padding: '1.6cqw 0' }}>
                <span className="shrink-0 font-black" style={{ width: '14cqw', fontSize: '3.8cqw' }}>
                  {label}
                </span>
                <span className="min-w-0 break-keep" style={{ fontSize: '3.8cqw', lineHeight: 1.3 }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="relative flex items-end justify-end" style={{ minHeight: '10cqw' }}>
          <span className="font-semibold" style={{ fontSize: '3.8cqw', marginRight: '15cqw' }}>
            회기분석 교수
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hoegilab/schedule-stamp-red.webp" alt="" aria-hidden draggable={false} className="absolute -rotate-6 select-none opacity-90" style={{ right: 0, bottom: '-1cqw', width: '13cqw' }} />
        </div>
      </div>
    </div>
  );
}
