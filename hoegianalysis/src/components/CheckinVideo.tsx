"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export interface CheckinVideoHandle {
  play: () => void;
}

// 출석체크 완료 시 넙죽이 도장 영상을 전체 화면으로 재생.
// 이름 입력 중에 미리 받아두도록 처음부터 렌더링해 두고, visible일 때만 보여준다.
export const CheckinVideo = forwardRef<CheckinVideoHandle, { visible: boolean; name: string }>(
  function CheckinVideo({ visible, name }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [muted, setMuted] = useState(false);
    const [ended, setEnded] = useState(false);

    useImperativeHandle(ref, () => ({
      play() {
        const video = videoRef.current;
        if (!video) return;
        video.currentTime = 0;
        video.muted = false;
        setMuted(false);
        setEnded(false);
        // 소리 있는 자동재생이 막히면(주로 모바일) 음소거로 재생
        video.play().catch(() => {
          video.muted = true;
          setMuted(true);
          video.play().catch(() => {});
        });
      },
    }));

    useEffect(() => {
      if (!visible) videoRef.current?.pause();
    }, [visible]);

    function unmute() {
      const video = videoRef.current;
      if (!video) return;
      video.muted = false;
      setMuted(false);
    }

    return (
      <div
        className={`fixed inset-0 z-50 bg-bg flex flex-col items-center justify-center select-none ${
          visible ? "" : "invisible pointer-events-none"
        }`}
        aria-hidden={!visible}
      >
        <video
          ref={videoRef}
          src="/checkin-stamp.mp4"
          preload="auto"
          playsInline
          onEnded={() => setEnded(true)}
          className="w-full max-w-3xl aspect-video object-contain"
        />

        <p className="mt-8 text-cream text-xl font-bold text-center px-6">
          {name ? `${name}님, 출석체크 완료!` : "출석체크 완료!"}
        </p>

        {muted && !ended && (
          <button
            onClick={unmute}
            className="mt-6 px-5 py-2 border border-cream/20 text-cream/60 rounded-xl text-sm"
          >
            🔊 소리 켜기
          </button>
        )}
      </div>
    );
  }
);
