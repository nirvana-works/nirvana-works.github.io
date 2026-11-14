'use client';

import { useRef, useState } from 'react';
import { deviceId } from '@/lib/deviceId';
import { COURSE_COMMENT_LIMITS, type CourseComment } from '@/lib/courseCommentTypes';
import { yellowButtonClass } from '../formStyles';

const NICK_KEY = 'hl_course_nick';

function ago(iso: string): string {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return '방금 전';
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const areaClass =
  'min-h-[104px] w-full resize-y rounded-[8px] border-2 border-ink bg-white px-3 py-2 text-[16px] leading-snug focus:border-cube focus:outline-none';
const nickClass = 'h-12 w-full rounded-[8px] border-2 border-ink bg-white px-3 text-[16px] focus:border-cube focus:outline-none';

// 과목마다 붙는 댓글 버튼. 누르면 이 과목을 들은 사람들의 한마디를 보고 남길 수 있다
export function CourseComments({ courseKey, title, count, isAdmin, onCount }: { courseKey: string; title: string; count: number; isAdmin: boolean; onCount: (n: number) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [rows, setRows] = useState<CourseComment[] | null>(null);
  const [nick, setNick] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await fetch(`/api/course-comments?key=${encodeURIComponent(courseKey)}&device=${encodeURIComponent(deviceId())}`, { cache: 'no-store' });
      const data = (await res.json()) as { comments?: CourseComment[]; error?: string };
      if (!res.ok) throw new Error(data.error);
      setRows(data.comments ?? []);
      onCount(data.comments?.length ?? 0);
    } catch {
      setRows([]);
      setError('댓글을 불러오지 못했어요.');
    }
  }

  function open() {
    setRows(null);
    setError('');
    try {
      setNick((n) => n || localStorage.getItem(NICK_KEY) || '');
    } catch {
      /* 저장소를 못 쓰면 매번 입력 */
    }
    dialogRef.current?.showModal();
    void load();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/course-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: courseKey, nickname: nick, body, deviceId: deviceId() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? '댓글을 남기지 못했어요.');
        return;
      }
      try {
        localStorage.setItem(NICK_KEY, nick.trim());
      } catch {
        /* ignore */
      }
      setBody('');
      await load();
    } catch {
      setError('네트워크 오류로 남기지 못했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setError('');
    try {
      const res = await fetch(`/api/course-comments/${id}?device=${encodeURIComponent(deviceId())}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? '지우지 못했어요.');
        return;
      }
      await load();
    } catch {
      setError('네트워크 오류로 지우지 못했어요.');
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex min-h-[44px] items-center gap-1.5 self-start rounded-full border-2 border-ink bg-white px-4 text-[14px] font-black hover:bg-sticker"
      >
        <span aria-hidden>💬</span> 들은 사람 한마디 <span className="font-latin">{count}</span>
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
        className="m-auto max-h-[92vh] w-[min(94vw,480px)] overflow-y-auto rounded-[14px] border-2 border-ink bg-lime p-0 backdrop:bg-ink/55"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[12px] font-black text-seal">💬 들은 사람 한마디</p>
              <h2 className="text-[20px] font-black leading-tight">{title}</h2>
            </div>
            <button type="button" onClick={() => dialogRef.current?.close()} aria-label="닫기" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[22px]">
              ×
            </button>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
            <p className="text-[13px] leading-snug text-inkMuted">이 과목을 들은 경험을 남겨 주세요. 난이도, 과제량, 시험, 팁 무엇이든 좋아요. 서로 존중해 주세요.</p>
            <label htmlFor={`cc-nick-${courseKey}`} className="text-[14px] font-bold">
              별명
            </label>
            <input id={`cc-nick-${courseKey}`} value={nick} maxLength={COURSE_COMMENT_LIMITS.nickname} onChange={(e) => setNick(e.target.value)} placeholder="별명 (이름 대신)" className={nickClass} />
            <label htmlFor={`cc-body-${courseKey}`} className="text-[14px] font-bold">
              내용
            </label>
            <textarea
              id={`cc-body-${courseKey}`}
              value={body}
              maxLength={COURSE_COMMENT_LIMITS.body}
              onChange={(e) => {
                setBody(e.target.value);
                setError('');
              }}
              placeholder="예) 과제가 많지만 배우는 게 확실해요. 시험은 사례 위주!"
              className={areaClass}
            />
            <div className="flex items-center justify-between text-[12px] text-inkMuted">
              <span>
                <span className="font-latin">{[...body].length}</span> / {COURSE_COMMENT_LIMITS.body}자
              </span>
            </div>
            {error && (
              <p role="alert" className="text-[14px] text-seal">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy || !nick.trim() || !body.trim()} className={yellowButtonClass}>
              {busy ? '남기는 중…' : '댓글 남기기'}
            </button>
          </form>

          <div>
            <h3 className="mb-2 text-[15px] font-black">
              댓글 <span className="font-latin">{rows ? rows.length : count}</span>개
            </h3>
            {rows === null ? (
              <p className="py-3 text-center text-[13px] text-inkMuted">불러오는 중…</p>
            ) : rows.length === 0 ? (
              <p className="rounded-[10px] border-2 border-dashed border-ink/40 py-5 text-center text-[14px] text-inkMuted">아직 댓글이 없어요. 첫 한마디를 남겨 보세요!</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {rows.map((r) => (
                  <li key={r.id} className="relative rounded-[10px] border-2 border-ink bg-white px-3 py-2.5">
                    <p className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="font-black">{r.nickname}</span>
                      <span className="font-latin text-inkMuted">{ago(r.created_at)}</span>
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-[14px] leading-snug">{r.body}</p>
                    {(r.mine || isAdmin) && (
                      <button type="button" onClick={() => remove(r.id)} aria-label={`${r.nickname}의 댓글 지우기`} className="mt-1 min-h-[32px] text-[12px] font-bold text-seal underline">
                        지우기
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
