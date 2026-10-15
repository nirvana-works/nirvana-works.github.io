"use client";

import { useEffect, useRef, useState } from "react";
import { CheckinVideo, type CheckinVideoHandle } from "@/components/CheckinVideo";

export default function AttendancePage({
  params,
}: {
  params: { sessionId: string };
}) {
  const { sessionId } = params;
  const [round, setRound] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [submittedName, setSubmittedName] = useState("");
  const [notFound, setNotFound] = useState(false);
  const videoRef = useRef<CheckinVideoHandle>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "done" | "duplicate" | "error"
  >("idle");

  // 관리자가 다음 차수를 시작하면 바로 반영되도록 주기적으로 현재 차수를 확인
  useEffect(() => {
    let cancelled = false;
    async function loadRound() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/public`);
        if (cancelled) return;
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as { current_round_number: number };
        if (!cancelled) setRound(data.current_round_number);
      } catch {
        // 일시적인 네트워크 오류는 다음 주기에 재시도
      }
    }
    loadRound();
    const id = setInterval(loadRound, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sessionId]);

  async function handleAttendance() {
    if (!name.trim() || status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch(`/api/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, name: name.trim() }),
      });
      if (res.status === 409) {
        setStatus("duplicate");
        return;
      }
      if (res.status === 400) {
        setRound(0);
        setStatus("idle");
        return;
      }
      if (res.status === 404) {
        setNotFound(true);
        setStatus("idle");
        return;
      }
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { roundNumber: number };
      setRound(data.roundNumber);
      setSubmittedName(name.trim());
      videoRef.current?.play();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-bg text-cream flex flex-col items-center justify-center px-6 font-body text-center">
        <p className="text-stamp">존재하지 않는 세션이에요.</p>
        <p className="mt-2 text-sm text-cream/40">QR코드를 다시 확인해주세요</p>
      </main>
    );
  }

  const notStarted = round === 0;

  return (
    <main className="min-h-screen bg-bg text-cream flex flex-col items-center justify-center px-6 font-body">
      <CheckinVideo ref={videoRef} visible={status === "done"} name={submittedName} />

      {status !== "done" && (
        <>
          <p className="text-sm tracking-wide text-cream/60 mb-2">
            {notStarted ? "아직 시작 전이에요" : "지금 출석체크 중"}
          </p>
          <h1 className="neon-text font-display text-8xl mb-10">
            {round ? `${round}차` : "···"}
          </h1>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAttendance()}
            placeholder="이름을 입력하세요"
            className="w-full max-w-xs bg-bgAlt border border-cream/20 rounded-xl px-4 py-3 text-center text-lg text-cream placeholder:text-cream/40 focus:outline-none focus:border-neon"
            autoFocus
          />

          <button
            onClick={handleAttendance}
            disabled={status === "loading" || !name.trim() || notStarted}
            className="mt-4 w-full max-w-xs bg-neon text-bg font-bold py-3 rounded-xl disabled:opacity-40 transition-opacity"
          >
            {status === "loading" ? "처리 중..." : "출석체크"}
          </button>

          {status === "duplicate" && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <p className="text-stamp text-sm">이미 {round}차에 출석체크하셨어요</p>
              <button
                onClick={() => { setName(""); setStatus("idle"); }}
                className="text-xs text-cream/40 underline"
              >
                다른 이름으로 시도
              </button>
            </div>
          )}
          {notStarted && (
            <p className="mt-4 text-cream/50 text-sm">
              관리자가 1차를 시작하면 출석체크할 수 있어요
            </p>
          )}
          {status === "error" && (
            <p className="mt-4 text-stamp text-sm">
              출석체크에 실패했어요. 다시 시도해주세요
            </p>
          )}
        </>
      )}
    </main>
  );
}
