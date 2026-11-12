'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { BOARD_SIZE, NOTICE_CATEGORIES, NOTICE_LIMITS, type LinkableEvent, type Notice, type NoticeCategory } from '@/lib/noticeTypes';
import { AdminLogin } from '../AdminLogin';
import { fieldClass, primaryButtonClass, stickerButtonClass } from '../formStyles';
import { EnrollButton } from '../schedule/EnrollButton';
import { Poster } from './Poster';

// 한 판에서 한두 장은 삐뚤게, 나머지는 거의 똑바로 붙인다. 판 번호와 자리로 정해서 새로고침해도 같다
function tiltFor(board: number, slot: number): number {
  const first = (board * 3 + 1) % 4;
  const crooked = new Set(board % 2 === 0 ? [first, (first + 2) % 4] : [first]);
  if (crooked.has(slot)) return (slot % 2 === 0 ? -1 : 1) * (5.5 + ((board + slot) % 3) * 1.2);
  return (((board * 7 + slot * 3) % 5) - 2) * 0.3;
}

// 대자보마다 붙이는 방법이 조금씩 다르다: 테이프 / 압정 / 테이프 두 줄 / 테이프+스테이플러 (id로 고정)
function decor(id: string) {
  let h = 7;
  for (const ch of id) h = (h * 33 + ch.charCodeAt(0)) | 0;
  const r = Math.abs(h);
  return { kind: r % 4, tape: r % 3, tape2: (r >> 3) % 3, pin: (r >> 5) % 3, staple: 1 + ((r >> 7) % 2), rot: ((r >> 9) % 9) - 4 };
}

function PostDecor({ id }: { id: string }) {
  const d = decor(id);
  const img = 'pointer-events-none absolute select-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)]';
  /* eslint-disable @next/next/no-img-element */
  if (d.kind === 1)
    return <img src={`/hoegilab/notice-pin-${d.pin}.webp`} alt="" draggable={false} className={`${img} z-10`} style={{ top: '-5%', left: '43%', width: '13%' }} />;
  if (d.kind === 2)
    return (
      <>
        <img src={`/hoegilab/notice-tape-${d.tape}.webp`} alt="" draggable={false} className={`${img} z-10`} style={{ top: '-1%', left: '-14%', width: '42%', transform: 'rotate(-38deg)' }} />
        <img src={`/hoegilab/notice-tape-${d.tape2}.webp`} alt="" draggable={false} className={`${img} z-10`} style={{ top: '-1%', right: '-14%', width: '42%', transform: 'rotate(38deg)' }} />
      </>
    );
  return (
    <>
      <img src={`/hoegilab/notice-tape-${d.tape}.webp`} alt="" draggable={false} className={`${img} z-10`} style={{ top: '-3%', left: '22%', width: '56%', transform: `rotate(${d.rot * 0.7}deg)` }} />
      {d.kind === 3 && <img src={`/hoegilab/notice-staple-${d.staple}.webp`} alt="" draggable={false} className={`${img} z-10`} style={{ bottom: '4%', left: '7%', width: '13%' }} />}
    </>
  );
  /* eslint-enable @next/next/no-img-element */
}

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
function dateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${m}/${d}(${WEEK[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]})`;
}

// 켜고 끄는 스위치 한 줄 (등록 창의 수강신청 받기, 도장 찍기)
function SwitchRow({ on, onChange, title, hint }: { on: boolean; onChange: (v: boolean) => void; title: string; hint: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`flex w-full items-center gap-3 rounded-[10px] border-2 border-ink px-3 py-2 text-left ${on ? 'bg-[#fff6c2]' : 'bg-white'}`}
    >
      <span aria-hidden className={`relative h-6 w-11 shrink-0 rounded-full border-2 border-ink ${on ? 'bg-cube' : 'bg-white'}`}>
        <span className={`absolute top-[1px] h-[18px] w-[18px] rounded-full border-2 border-ink bg-white transition-all ${on ? 'left-[21px]' : 'left-[1px]'}`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-black">{title}</span>
        <span className="block text-[12px] leading-snug text-inkMuted">{hint}</span>
      </span>
    </button>
  );
}

export function NoticeBoard({ notices, counts, linkable, admin, board, total }: { notices: Notice[]; counts: Record<string, number>; linkable: LinkableEvent[]; admin: boolean; board: number; total: number }) {
  const router = useRouter();
  const viewRef = useRef<HTMLDialogElement>(null);
  const composeRef = useRef<HTMLDialogElement>(null);
  const loginRef = useRef<HTMLDialogElement>(null);
  const [opened, setOpened] = useState<Notice | null>(null);
  const latest = board === total;
  const slots: (Notice | null)[] = Array.from({ length: BOARD_SIZE }, (_, i) => notices[i] ?? null);
  const href = (n: number) => (n === total ? '/notice' : `/notice?board=${n}`);

  function openView(n: Notice) {
    setOpened(n);
    viewRef.current?.showModal();
  }
  function startCompose() {
    (admin ? composeRef : loginRef).current?.showModal();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] font-bold">
          {latest ? '이번 게시판' : '지난 게시판'} <span className="font-latin text-inkMuted">{board} / {total}</span>
        </p>
        <button type="button" onClick={startCompose} className={stickerButtonClass}>
          <span aria-hidden>+</span>
          공지 등록하기
        </button>
      </div>

      {/* 게시판: 인쇄물 같은 파란 틀 게시판에 대자보를 붙인다. 한두 장은 삐뚤게. 누르면 커진다 */}
      <div className="relative mx-auto aspect-[1100/1548] w-full max-w-[640px] overflow-hidden rounded-[4px] border-2 border-ink shadow-[0_6px_16px_rgba(0,0,0,0.3)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hoegilab/notice-board.webp" alt="" aria-hidden draggable={false} className="absolute inset-0 h-full w-full select-none object-cover" />
        <ul className="absolute grid grid-cols-2 grid-rows-2 items-start gap-x-[3.5%] gap-y-[2.5%]" style={{ left: '14.5%', right: '13%', top: '11.6%', bottom: '11.5%' }}>
          {slots.map((n, i) =>
            n ? (
              <li key={n.id} style={{ transform: `rotate(${tiltFor(board, i)}deg)` }}>
                <button
                  type="button"
                  onClick={() => openView(n)}
                  aria-label={`${n.title} 공지 크게 보기`}
                  className="relative block w-full text-left shadow-[0_6px_12px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sticker"
                >
                  <Poster notice={n} fit="thumb" />
                  <PostDecor id={n.id} />
                  {n.event_id && (
                    <span className="absolute bottom-1 left-1 z-10 rounded-[3px] border-2 border-ink bg-sticker px-1 py-[1px] text-[9px] font-black leading-tight sm:text-[11px]">
                      ✍ 수강신청 {counts[n.event_id] ?? 0}명
                    </span>
                  )}
                </button>
              </li>
            ) : (
              <li key={`empty-${i}`} aria-hidden className="grid aspect-[1/1.414] place-items-center border border-dashed border-white/25 text-[11px] font-bold text-white/30" style={{ transform: `rotate(${tiltFor(board, i)}deg)` }}>
                빈 자리
              </li>
            ),
          )}
        </ul>
      </div>

      {/* 지난 게시판 넘겨 보기 */}
      {total > 1 && (
        <nav aria-label="게시판 넘기기" className="flex items-center justify-between gap-2">
          {board > 1 ? (
            <Link href={href(board - 1)} scroll={false} className="flex min-h-[44px] items-center gap-1 text-[14px] font-bold">
              <span aria-hidden>‹</span> 지난 게시판
            </Link>
          ) : (
            <span className="min-h-[44px] w-[88px]" />
          )}
          <ul className="flex flex-wrap items-center justify-center gap-1.5">
            {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
              <li key={n}>
                <Link
                  href={href(n)}
                  scroll={false}
                  aria-current={n === board ? 'page' : undefined}
                  className={`grid h-9 min-w-9 place-items-center rounded-full border-2 border-ink px-2 font-latin text-[14px] font-semibold ${n === board ? 'bg-ink text-white' : 'bg-white'}`}
                >
                  {n}
                </Link>
              </li>
            ))}
          </ul>
          {board < total ? (
            <Link href={href(board + 1)} scroll={false} className="flex min-h-[44px] items-center justify-end gap-1 text-[14px] font-bold">
              다음 <span aria-hidden>›</span>
            </Link>
          ) : (
            <span className="min-h-[44px] w-[88px]" />
          )}
        </nav>
      )}

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
            enrollCount={opened.event_id ? counts[opened.event_id] ?? 0 : null}
            onClose={() => viewRef.current?.close()}
            onDeleted={() => {
              viewRef.current?.close();
              router.refresh();
            }}
          />
        )}
      </dialog>

      <ComposeDialog dialogRef={composeRef} linkable={linkable} onDone={() => router.refresh()} />

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

function ViewNotice({ notice, canDelete, enrollCount, onClose, onDeleted }: { notice: Notice; canDelete: boolean; enrollCount: number | null; onClose: () => void; onDeleted: () => void }) {
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
      {notice.event_id && enrollCount !== null && (
        <div className="flex items-center justify-between gap-3 border-t-2 border-ink bg-lime px-3 py-2">
          <p className="text-[13px] font-bold leading-snug">★ 회기분석 수강신청을 받고 있어요</p>
          <EnrollButton eventId={notice.event_id} title={notice.title} count={enrollCount} isAdmin={canDelete} />
        </div>
      )}
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

function ComposeDialog({ dialogRef, linkable, onDone }: { dialogRef: React.RefObject<HTMLDialogElement>; linkable: LinkableEvent[]; onDone: () => void }) {
  const empty = { title: '', kicker: '', body: '', when_text: '', place: '', urgent: false, event_id: '', enroll: false, category: 'school' as NoticeCategory, stamp: true };
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
    if (form.enroll && !form.event_id) return setError('수강신청을 받을 수업을 골라 주세요.');
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

        <fieldset className="flex flex-col gap-1">
          <legend className="text-[13px] font-bold">분류 <span className="font-normal text-inkMuted">(분류에 따라 도장이 달라져요)</span></legend>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {NOTICE_CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                aria-pressed={form.category === c.key}
                onClick={() => setForm((f) => ({ ...f, category: c.key }))}
                className={`h-11 rounded-[8px] border-2 border-ink text-[14px] font-bold ${form.category === c.key ? 'bg-sticker' : 'bg-white'}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-inkMuted">{form.category === 'council' ? '학생회장 인 도장이 찍혀요.' : '회기분석 교수 인 도장이 찍혀요.'}</p>
        </fieldset>

        <div className="flex flex-col gap-2">
          <SwitchRow
            on={form.enroll}
            onChange={(v) => setForm((f) => ({ ...f, enroll: v, event_id: v ? f.event_id : '' }))}
            title="✍ 수강신청 받기"
            hint="학교 일정의 회기분석 수업과 이어요. 공지에서도, 일정에서도 신청할 수 있고 명단은 같아요."
          />
          {form.enroll &&
            (linkable.length > 0 ? (
              <label className="text-[13px] font-bold">
                어느 날 수업인가요?
                <select
                  value={form.event_id}
                  onChange={(e) => {
                    const id = e.target.value;
                    const ev = linkable.find((x) => x.id === id);
                    setForm((f) => ({ ...f, event_id: id, title: !f.title && ev ? ev.title : f.title }));
                  }}
                  className="mt-1 h-12 w-full rounded-[8px] border-2 border-ink bg-white px-2 text-[16px] font-normal"
                >
                  <option value="">수업을 골라 주세요</option>
                  {linkable.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {dateLabel(ev.start_date)} {ev.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="rounded-[8px] bg-white/70 px-3 py-2 text-[13px] text-seal">이어 붙일 회기분석 수업이 없어요. 학교 일정에 회기분석 수업을 먼저 등록해 주세요.</p>
            ))}
          <SwitchRow on={form.stamp} onChange={(v) => set('stamp', v)} title="도장 찍기" hint="분류에 맞는 도장이 찍혀요. 포스터에 이미 도장이 있으면 끄세요." />
        </div>

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
