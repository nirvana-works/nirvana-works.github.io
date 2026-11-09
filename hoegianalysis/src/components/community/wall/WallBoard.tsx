'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { deviceId } from '@/lib/deviceId';
import type { WallPost } from '@/lib/wallPosts';
import { AdminLogin } from '../AdminLogin';
import { fieldClass, stickerButtonClass } from '../formStyles';
import { WALL, WallBackdrop } from './WallBackdrop';
import { PER_SHEET, inkShadow, placeGraffiti, sheetHeight } from './graffiti';

const LIMITS = { nickname: 12, content: 140 };

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 폰은 두 줄, 넓은 화면은 세 줄로 낙서를 붙인다
function useColumns(): number {
  const [cols, setCols] = useState(2);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const update = () => setCols(mq.matches ? 3 : 2);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return cols;
}

// 오래된 순 낙서를 PER_SHEET개씩 낙서장으로 나눈다. 마지막 장이 꽉 찼으면 빈 새 장을 붙인다
function toSheets(posts: WallPost[]): WallPost[][] {
  const sheets: WallPost[][] = [];
  for (let i = 0; i < posts.length; i += PER_SHEET) sheets.push(posts.slice(i, i + PER_SHEET));
  if (sheets.length === 0 || sheets[sheets.length - 1].length === PER_SHEET) sheets.push([]);
  return sheets;
}

export function WallBoard({ initialPosts, canDelete }: { initialPosts: WallPost[]; canDelete: boolean }) {
  const router = useRouter();
  const cols = useColumns();
  const [posts, setPosts] = useState(initialPosts); // 오래된 순
  const [fresh, setFresh] = useState<string | null>(null);
  const [opened, setOpened] = useState<{ post: WallPost; color: string } | null>(null);
  const [erasing, setErasing] = useState(false);
  const [current, setCurrent] = useState(0);
  const composeRef = useRef<HTMLDialogElement>(null);
  const viewRef = useRef<HTMLDialogElement>(null);
  const loginRef = useRef<HTMLDialogElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // 새로고침으로 서버 목록이 바뀌면 따라간다
  useEffect(() => setPosts(initialPosts), [initialPosts]);

  const sheets = toSheets(posts);
  const height = sheetHeight(cols);
  const last = sheets.length - 1;

  function scrollToSheet(i: number, smooth = true) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  }

  // 처음엔 가장 최근 낙서장을 보여준다 (이전 장은 왼쪽으로)
  useEffect(() => {
    scrollToSheet(last, false);
    setCurrent(last);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols]);

  // 벽에 쓰인 그 색 그대로 크게 보여준다 (지우기 모드면 바로 지울지 묻는다)
  function open(post: WallPost, color: string) {
    setOpened({ post, color });
    viewRef.current?.showModal();
  }

  function startErasing() {
    if (erasing) return setErasing(false);
    if (canDelete) return setErasing(true);
    loginRef.current?.showModal();
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 낙서장들을 가로로 이어 붙이고 한 장씩 넘긴다. 양옆 가운데 < > 로도 넘긴다 */}
      <div className="relative -mx-4 sm:mx-0">
        <div
          ref={scrollerRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            setCurrent(Math.round(el.scrollLeft / el.clientWidth));
          }}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] sm:rounded-[14px] [&::-webkit-scrollbar]:hidden"
        >
          {sheets.map((sheet, s) => (
            <section
              key={s}
              aria-label={`낙서장 ${s + 1}`}
              className="relative w-full shrink-0 snap-center overflow-hidden"
              style={{ height }}
            >
              <WallBackdrop />

              {sheet.length === 0 && (
                <p className="absolute inset-x-0 top-24 px-4 text-center font-pen text-[34px] text-white/80">
                  {s === 0 ? '아직 깨끗한 벽이에요. 첫 낙서를 남겨 보세요' : '새 낙서장이에요. 여기부터 채워 주세요'}
                </p>
              )}

              {sheet.map((post, i) => {
                const p = placeGraffiti(post.id, i, cols, height);
                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => open(post, p.color)}
                    aria-label={`${erasing ? '지우기: ' : ''}${post.nickname}의 낙서: ${post.content}`}
                    className={`absolute text-left font-pen leading-[1.05] ${post.id === fresh ? 'graffiti-fresh' : ''}`}
                    style={{
                      left: `${p.left}%`,
                      width: `${p.width}%`,
                      top: p.top,
                      color: p.color,
                      // 진한 펜은 시멘트 결이 비치게 곱하기로, 흰 분필은 그대로
                      mixBlendMode: p.color === '#FFFFFF' || erasing ? undefined : 'multiply',
                      transform: `rotate(${p.rotate}deg)`,
                      ['--r' as string]: `${p.rotate}deg`,
                    }}
                  >
                    {erasing && (
                      <span
                        aria-hidden
                        className="absolute -right-1 -top-4 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-seal font-sign text-[15px] font-black leading-none text-white"
                      >
                        ✕
                      </span>
                    )}
                    <span className="line-clamp-3 break-words text-[25px]">{post.content}</span>
                    <span className="mt-0.5 block text-[17px] opacity-80">- {post.nickname}</span>
                  </button>
                );
              })}

              {/* 왼쪽 아래: 스프레이로 '왔다감'을 쓰다 들킨 넙죽이 */}
              <div aria-hidden className="pointer-events-none absolute bottom-[6px] left-0 h-[320px] w-[300px]">
                <span
                  className="spray-tag absolute bottom-[300px] left-[16px] whitespace-nowrap font-pen text-[38px] leading-none mix-blend-multiply"
                  style={{ transform: 'rotate(-7deg)' }}
                >
                  넙죽이 왔다감
                  {/* 흘러내린 페인트 */}
                  <span className="absolute left-[18px] top-[30px] h-[22px] w-[3px] rounded-b-full bg-gradient-to-b from-[#c8322b] to-transparent" />
                  <span className="absolute left-[86px] top-[28px] h-[34px] w-[3px] rounded-b-full bg-gradient-to-b from-[#c8322b] to-transparent" />
                  <span className="absolute left-[150px] top-[30px] h-[16px] w-[3px] rounded-b-full bg-gradient-to-b from-[#c8322b] to-transparent" />
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/hoegilab/nupjuk-graffiti.webp"
                  alt=""
                  width={250}
                  height={283}
                  loading={s === last ? 'eager' : 'lazy'}
                  className="absolute bottom-0 left-[40px] max-w-none drop-shadow-[0_4px_3px_rgba(0,0,0,0.25)]"
                />
              </div>
            </section>
          ))}
        </div>
        {current > 0 && (
          <button
            type="button"
            onClick={() => scrollToSheet(current - 1)}
            aria-label={`이전 낙서장 (${current} / ${sheets.length})`}
            className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border-2 border-ink bg-white/85 text-[24px] leading-none"
          >
            ‹
          </button>
        )}
        {current < last && (
          <button
            type="button"
            onClick={() => scrollToSheet(current + 1)}
            aria-label={`다음 낙서장 (${current + 2} / ${sheets.length})`}
            className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border-2 border-ink bg-white/85 text-[24px] leading-none"
          >
            ›
          </button>
        )}
      </div>

      {erasing && (
        <p role="status" className="rounded-[8px] bg-seal px-4 py-2.5 text-[14px] font-bold text-white">
          지우기 모드예요. 지울 낙서를 누르세요.
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={startErasing}
          aria-pressed={erasing}
          className={`h-11 rounded-[10px] border-2 border-ink px-4 text-[15px] font-bold ${erasing ? 'bg-ink text-white' : ''}`}
        >
          {erasing ? '지우기 끝내기' : '낙서 지우기'}
        </button>
        <button type="button" onClick={() => composeRef.current?.showModal()} className={stickerButtonClass}>
          <span aria-hidden>✎</span>
          낙서하기
        </button>
      </div>

      <ComposeDialog
        dialogRef={composeRef}
        onPosted={(post) => {
          setPosts((list) => [...list.filter((p) => p.id !== post.id), post]);
          setFresh(post.id);
          setErasing(false);
          // 새 낙서가 붙은 (가장 최근) 낙서장으로 이동
          requestAnimationFrame(() => {
            const el = scrollerRef.current;
            if (el) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
          });
          router.refresh();
        }}
      />

      {/* 낙서 지우기: 운영자 비밀번호 확인 */}
      <dialog
        ref={loginRef}
        onClick={(e) => e.target === loginRef.current && loginRef.current?.close()}
        className="m-auto w-[min(92vw,380px)] rounded-[14px] border-2 border-ink bg-lime p-0 backdrop:bg-ink/55"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] font-black">낙서 지우기</h2>
            <button
              type="button"
              onClick={() => loginRef.current?.close()}
              aria-label="닫기"
              className="grid h-11 w-11 place-items-center rounded-full text-[22px]"
            >
              ×
            </button>
          </div>
          <p className="text-[14px] text-inkMuted">운영자 비밀번호를 넣으면 낙서를 지울 수 있어요.</p>
          <AdminLogin
            onSuccess={() => {
              loginRef.current?.close();
              setErasing(true);
            }}
          />
        </div>
      </dialog>

      <dialog
        ref={viewRef}
        onClose={() => setOpened(null)}
        onClick={(e) => e.target === viewRef.current && viewRef.current?.close()} // 바깥 누르면 닫기
        className="m-auto w-[min(92vw,440px)] overflow-hidden rounded-[14px] border-2 border-ink bg-white p-0 backdrop:bg-ink/55"
      >
        {opened && (
          <ViewGraffiti
            key={opened.post.id}
            post={opened.post}
            color={opened.color}
            canDelete={canDelete || erasing}
            askFirst={erasing}
            onClose={() => viewRef.current?.close()}
            onDeleted={() => {
              setPosts((list) => list.filter((p) => p.id !== opened.post.id));
              viewRef.current?.close();
              router.refresh();
            }}
          />
        )}
      </dialog>
    </div>
  );
}

function ViewGraffiti({
  post,
  color,
  canDelete,
  askFirst,
  onClose,
  onDeleted,
}: {
  post: WallPost;
  color: string;
  canDelete: boolean;
  askFirst: boolean; // 지우기 모드에서 열면 바로 '정말 지우기'
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(askFirst);
  const [error, setError] = useState('');

  async function remove() {
    setError('');
    const res = await fetch(`/api/wall/${post.id}`, { method: 'DELETE' }).catch(() => null);
    if (res && (res.ok || res.status === 404)) return onDeleted();
    setError('낙서를 지우지 못했어요. 다시 시도해 주세요.');
  }

  return (
    <div>
      {/* 벽 한 조각을 떼어 온 듯한 바탕에 크게 */}
      <div className="px-6 py-8" style={{ background: WALL.teal }}>
        <p
          className="whitespace-pre-wrap break-words font-pen text-[36px] leading-[1.1]"
          style={{ color, textShadow: inkShadow(color) }}
        >
          {post.content}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold">{post.nickname}</p>
          <p className="text-[13px] text-inkMuted">{formatWhen(post.created_at)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canDelete &&
            (confirming ? (
              <button type="button" onClick={remove} className="h-11 rounded-[8px] bg-seal px-3 text-[14px] font-bold text-white">
                정말 지우기
              </button>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className="h-11 px-3 text-[14px] font-bold text-seal">
                지우기
              </button>
            ))}
          <button type="button" onClick={onClose} className="h-11 rounded-[8px] border-2 border-ink px-4 text-[14px] font-bold">
            닫기
          </button>
        </div>
      </div>
      {error && <p className="px-5 pb-4 text-[14px] text-seal">{error}</p>}
    </div>
  );
}

function ComposeDialog({
  dialogRef,
  onPosted,
}: {
  dialogRef: React.RefObject<HTMLDialogElement>;
  onPosted: (post: WallPost) => void;
}) {
  const [nickname, setNickname] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 지난번 별명 기억
  useEffect(() => {
    try {
      setNickname(localStorage.getItem('hl_nick') ?? '');
    } catch {
      // 저장소를 못 쓰는 브라우저면 매번 입력
    }
  }, []);

  const count = (s: string) => [...s].length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname.trim()) return setError('별명을 입력하세요.');
    if (!content.trim()) return setError('낙서할 내용을 입력하세요.');

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/wall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, content, deviceId: deviceId() }),
      });
      const data = (await res.json()) as { post?: WallPost; error?: string };
      if (!res.ok || !data.post) {
        setError(data.error ?? '낙서를 남기지 못했어요.');
        return;
      }
      try {
        localStorage.setItem('hl_nick', nickname.trim());
      } catch {
        // 무시
      }
      setContent('');
      dialogRef.current?.close();
      onPosted(data.post);
    } catch {
      setError('네트워크 오류로 남기지 못했어요. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
      className="m-auto w-[min(92vw,440px)] rounded-[14px] border-2 border-ink bg-lime p-0 backdrop:bg-ink/55"
    >
      <form onSubmit={submit} className="flex flex-col gap-4 p-5" noValidate>
        <div className="flex items-center justify-between">
          <h2 className="text-[22px] font-black">낙서하기</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="닫기"
            className="grid h-11 w-11 place-items-center rounded-full text-[22px]"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor="wall-nick" className="text-[14px] font-bold">
              별명
            </label>
            <span className="text-[12px] text-inkMuted">
              {count(nickname)}/{LIMITS.nickname}
            </span>
          </div>
          <input
            id="wall-nick"
            value={nickname}
            maxLength={LIMITS.nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setError('');
            }}
            placeholder="넙죽이"
            className={fieldClass}
          />
          <p className="text-[12px] text-inkMuted">실명 대신 별명을 써 주세요.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor="wall-content" className="text-[14px] font-bold">
              낙서
            </label>
            <span className={`text-[12px] ${count(content) > LIMITS.content ? 'text-seal' : 'text-inkMuted'}`}>
              {count(content)}/{LIMITS.content}
            </span>
          </div>
          {/* 쓰는 동안에도 벽에 쓰는 글씨체로 보여준다 */}
          <textarea
            id="wall-content"
            value={content}
            maxLength={LIMITS.content}
            rows={4}
            onChange={(e) => {
              setContent(e.target.value);
              setError('');
            }}
            placeholder="회기역 파전집 또 가자"
            className="w-full rounded-[8px] border-2 border-ink px-3 py-2 font-pen text-[26px] leading-[1.15] text-white placeholder:text-white/60 focus:outline-none"
            style={{ background: WALL.teal }}
          />
        </div>

        {error && <p className="text-[14px] text-seal">{error}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={loading} className={stickerButtonClass}>
            {loading ? '쓰는 중…' : '벽에 쓰기'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
