'use client';

import { useEffect, useRef, useState } from 'react';

// 교수님 사진. 아직 사진이 없으면 넙죽이 얼굴로 자리를 대신한다
export function ProfessorPhoto({ src, name }: { src: string; name: string }) {
  const [missing, setMissing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  // 화면이 살아나기 전에 이미 로딩에 실패한 경우도 잡는다
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setMissing(true);
  }, []);
  return (
    <div className="relative aspect-[1000/1242] w-full max-w-[250px] overflow-hidden border-2 border-ink bg-lime">
      {missing ? (
        <div className="grid h-full w-full place-items-center p-6 text-center">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hoegilab/nupjuk-face.png" alt="" aria-hidden className="mx-auto h-20 w-auto" />
            <p className="mt-3 text-[13px] font-bold text-inkMuted">사진 준비 중</p>
          </div>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={imgRef} src={src} alt={`${name} 교수 사진`} onError={() => setMissing(true)} className="h-full w-full object-cover" />
      )}
    </div>
  );
}
