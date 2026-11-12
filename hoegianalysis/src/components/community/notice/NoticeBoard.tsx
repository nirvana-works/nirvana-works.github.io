'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import type { Notice } from '@/lib/notices';
import { NOTICE_LIMITS } from '@/lib/notices';
import { AdminLogin } from '../AdminLogin';
import { fieldClass, primaryButtonClass, stickerButtonClass } from '../formStyles';
import { Poster } from './Poster';

// 같은 공지는 늘 같은 각도로 붙도록 id에서 기울기를 정한다
function tilt(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 9) - 4) * 0.5; // -2° ~ +2°
}

export function NoticeBoard({ notices, admin }: { notices: Notice[]; admin: boolean }) {
  const router = useRouter();
  const viewRef = useRef<HTMLDialogElement>(null);
  const composeRef = useRef<HTMLDialogElement>(null);
  const loginRef = useRef<HTMLDialogElement>(null);
  const [opened, setOpened] = useState<Notice | null>(null);

  function openView(n: Notice) {
    setOpened(n);
    viewRef.current?.showModal();
  }
  function startCompose() {
    (admin ? composeRef : loginRef).current?.showModal();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button type="button" onClick={startCompose} className={stickerButtonClass}>
          <span aria-hidden>+</span>
          공지 등록하기
        </button>
      </div>

      {/* 게시판: 대자보가 테이프로 붙어 있다. 누르면 커진다 */}
      <div className="rounded-[14px] border-2 border-ink bg-[#2f3631] p-3 sm:p-4">
        {notices.length === 0 ? (
          <p className="py-16 text-center text-[14px] text-white/70">아직 붙은 공지가 없어요.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-5">
            {notices.map((n) => (
              <li key={n.id} style={{ transform: `rotate(${tilt(n.id)}deg)` }}>
                <button
                  type="button"
                  onClick={() => openView(n)}
                  aria-label={`${n.title} 공지 크게 보기`}
                  className="relative block w-full text-left shadow-[0_6px_14px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sticker"
                >
                  <span aria-hidden className="absolute -top-2 left-1/2 z-10 h-4 w-14 -translate-x-1/2 rotate-[-3deg] bg-[#e9dd9a]/85" />
                  <Poster notice={n} fit="thumb" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <dialog
        ref={viewRef}
        onClose={() => setOpened(null)}
        onClick={(e) => e.target === viewRef.current && viewRef.current?.close()}
        className="m-auto max-h-[94vh] w-[min(94vw,560px,calc((94vh_-_56px)/1.414))] overflow-y-auto rounded-[10px] border-2 border-ink bg-[#F4F0E4] p-0 backdrop:bg-ink/65"
      >
        {opened && (
          <ViewNotice
            key={opened.id}
            notice={opened}
            canDelete={admin}
            onClose={() => viewRef.current?.close()}
            onDeleted={() => {
              viewRef.current?.close();
              router.refresh();
            }}
          />
        )}
      </dialog>

      <ComposeDialog dialogRef={composeRef} onDone={() => router.refresh()} />

      <dialog
        ref={loginRef}
        onClick={(e) => e.target === loginRef.current && loginRef.current?.close()}
        className="m-auto w-[min(92vw,380px)] rounded-[14px] border-2 border-ink bg-lime p-0 backdrop:bg-ink/55"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] font-black">공지 등록하기</h2>
            <button type="button" onClick={() => loginRef.current?.close()} aria-label="닫기" className="grid h-11 w-11 place-items-center rounded-full text-[22px]">
              ×
            </button>
          </div>
          <p className="text-[14px] text-inkMuted">공지는 운영자만 올릴 수 있어요. 비밀번호를 넣어 주세요.</p>
          <AdminLogin
            onSuccess={() => {
              loginRef.current?.close();
              composeRef.current?.showModal();
            }}
          />
        </div>
      </dialog>
    </div>
  );
}

function ViewNotice({ notice, canDelete, onClose, onDeleted }: { notice: Notice; canDelete: boolean; onClose: () => void; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function remove() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/notice/${notice.id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? '공지를 내리지 못했어요.');
        return;
      }
      onDeleted();
    } catch {
      setError('네트워크 오류로 내리지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Poster notice={notice} />
      <div className="flex items-center justify-between gap-2 border-t-2 border-ink bg-white px-3 py-1">
        {canDelete ? (
          <button
            type="button"
            onClick={() => (confirming ? remove() : setConfirming(true))}
            disabled={busy}
            className="min-h-[44px] text-[14px] font-bold text-seal underline underline-offset-4 disabled:opacity-50"
          >
            {busy ? '내리는 중…' : confirming ? '정말 내릴까요? 한 번 더 누르세요' : '공지 내리기'}
          </button>
        ) : (
          <span />
        )}
        <button type="button" onClick={onClose} className="min-h-[44px] px-2 text-[14px] font-bold">
          닫기
        </button>
      </div>
      {error && <p className="bg-white px-3 pb-2 text-[13px] text-seal">{error}</p>}
    </div>
  );
}

// 올릴 이미지를 가로 1400px 이하 JPEG로 줄인다 (폰 사진을 그대로 올리면 너무 큼)
async function shrinkImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

function ComposeDialog({ dialogRef, onDone }: { dialogRef: React.RefObject<HTMLDialogElement>; onDone: () => void }) {
  const empty = { title: '', kicker: '', body: '', when_text: '', place: '', urgent: false };
  const [form, setForm] = useState(empty);
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof empty, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function pick(file: File | undefined) {
    if (!file) return;
    setError('');
    try {
      setImage(await shrinkImage(file));
    } catch {
      setError('이미지를 읽지 못했어요. 다른 파일로 다시 골라 주세요.');
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, image }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? '공지를 올리지 못했어요.');
        return;
      }
      setForm(empty);
      setImage('');
      dialogRef.current?.close();
      onDone();
    } catch {
      setError('네트워크 오류로 올리지 못했어요. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
      className="m-auto max-h-[94vh] w-[min(94vw,460px)] overflow-y-auto rounded-[14px] border-2 border-ink bg-lime p-0 backdrop:bg-ink/55"
    >
      <form onSubmit={submit} className="flex flex-col gap-3 p-5" noValidate>
        <div className="flex items-center justify-between">
          <h2 className="text-[22px] font-black">공지 등록하기</h2>
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="닫기" className="grid h-11 w-11 place-items-center rounded-full text-[22px]">
            ×
          </button>
        </div>

        <label className="text-[13px] font-bold">
          포스터 이미지 <span className="font-normal text-inkMuted">(있으면 그대로 붙이고, 없으면 아래 글로 만들어요)</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => pick(e.target.files?.[0])} className="mt-1 block w-full text-[14px]" />
        </label>
        {image && (
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="올릴 포스터 미리보기" className="h-28 w-auto rounded-[6px] border-2 border-ink" />
            <button type="button" onClick={() => setImage('')} className="min-h-[44px] text-[13px] font-bold underline underline-offset-4">
              이미지 빼기
            </button>
          </div>
        )}

        <label className="text-[13px] font-bold">
          제목
          <input value={form.title} maxLength={NOTICE_LIMITS.title} onChange={(e) => set('title', e.target.value)} placeholder="2학기 회기분석 중간고사" className={`${fieldClass} mt-1`} />
        </label>
        {!image && (
          <>
            <label className="text-[13px] font-bold">
              제목 위 작은 글씨 <span className="font-normal text-inkMuted">(선택)</span>
              <input value={form.kicker} maxLength={NOTICE_LIMITS.kicker} onChange={(e) => set('kicker', e.target.value)} placeholder="2학기" className={`${fieldClass} mt-1`} />
            </label>
            <label className="text-[13px] font-bold">
              한마디 <span className="font-normal text-inkMuted">(선택)</span>
              <textarea
                value={form.body}
                maxLength={NOTICE_LIMITS.body}
                onChange={(e) => set('body', e.target.value)}
                rows={3}
                placeholder="답안지는 30분 만에 덮고, 잔은 밤새 채워라!"
                className="mt-1 w-full rounded-[8px] border-2 border-ink bg-white px-3 py-2 text-[16px] focus:border-cube focus:outline-none"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[13px] font-bold">
                일시
                <input value={form.when_text} maxLength={NOTICE_LIMITS.when} onChange={(e) => set('when_text', e.target.value)} placeholder="10/22(목) 저녁" className={`${fieldClass} mt-1`} />
              </label>
              <label className="text-[13px] font-bold">
                장소
                <input value={form.place} maxLength={NOTICE_LIMITS.place} onChange={(e) => set('place', e.target.value)} placeholder="회기동" className={`${fieldClass} mt-1`} />
              </label>
            </div>
          </>
        )}
        <label className="flex min-h-[44px] items-center gap-2 text-[14px] font-bold">
          <input type="checkbox" checked={form.urgent} onChange={(e) => set('urgent', e.target.checked)} className="h-5 w-5" />
          긴급 공지 표시
        </label>

        {error && <p className="text-[14px] text-seal">{error}</p>}
        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {saving ? '붙이는 중…' : '게시판에 붙이기'}
        </button>
      </form>
    </dialog>
  );
}
