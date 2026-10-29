'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { deviceId } from '@/lib/deviceId';
import type { WallPost } from '@/lib/wallPosts';
import { fieldClass, stickerButtonClass } from '../formStyles';
import { WALL, WallBackdrop } from './WallBackdrop';
import { inkShadow, placeGraffiti, wallHeight } from './graffiti';

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

export function WallBoard({ initialPosts, canDelete }: { initialPosts: WallPost[]; canDelete: boolean }) {
  const router = useRouter();
  const cols = useColumns();
  const [posts, setPosts] = useState(initialPosts);
  const [fresh, setFresh] = useState<string | null>(null);
  const [opened, setOpened] = useState<{ post: WallPost; color: string } | null>(null);
  const composeRef = useRef<HTMLDialogElement>(null);
  const viewRef = useRef<HTMLDialogElement>(null);

  // 새로고침으로 서버 목록이 바뀌면 따라간다
  useEffect(() => setPosts(initialPosts), [initialPosts]);

  const height = wallHeight(posts.length, cols);

  // 벽에 쓰인 그 색 그대로 크게 보여준다
  function open(post: WallPost, color: string) {
    setOpened({ post, color });
    viewRef.current?.showModal();
  }

  return (
    <div className="flex flex-col gap-5">
      <section
        aria-label="낙서 벽"
        className="relative -mx-4 overflow-hidden sm:mx-0 sm:rounded-[14px]"
        style={{ height }}
      >
        <WallBackdrop />

        {posts.length === 0 && (
          <p className="absolute inset-x-0 top-24 text-center font-pen text-[34px] text-white/80">
            아직 깨끗한 벽이에요. 첫 낙서를 남겨 보세요
          </p>
        )}

        {posts.map((post, i) => {
          const p = placeGraffiti(post.id, i, cols, height);
          return (
            <button
              key={post.id}
              type="button"
              onClick={() => open(post, p.color)}
              aria-label={`${post.nickname}의 낙서: ${post.content}`}
              className={`absolute text-left font-pen leading-[1.05] ${post.id === fresh ? 'graffiti-fresh' : ''}`}
              style={{
                left: `${p.left}%`,
                width: `${p.width}%`,
                top: p.top,
                color: p.color,
                // 진한 펜은 시멘트 결이 비치게 곱하기로, 흰 분필은 그대로
                mixBlendMode: p.color === '#FFFFFF' ? undefined : 'multiply',
                transform: `rotate(${p.rotate}deg)`,
                ['--r' as string]: `${p.rotate}deg`,
              }}
            >
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
            className="absolute bottom-0 left-[40px] max-w-none drop-shadow-[0_4px_3px_rgba(0,0,0,0.25)]"
          />
        </div>
      </section>

      <div className="flex justify-end">
        <button type="button" onClick={() => composeRef.current?.showModal()} className={stickerButtonClass}>
          <span aria-hidden>✎</span>
          낙서하기
        </button>
      </div>

      <ComposeDialog
        dialogRef={composeRef}
        onPosted={(post) => {
          setPosts((list) => [post, ...list.filter((p) => p.id !== post.id)]);
          setFresh(post.id);
          router.refresh();
        }}
      />

      <dialog
        ref={viewRef}
        onClose={() => setOpened(null)}
        onClick={(e) => e.target === viewRef.current && viewRef.current?.close()} // 바깥 누르면 닫기
        className="m-auto w-[min(92vw,440px)] overflow-hidden rounded-[14px] border-2 border-ink bg-white p-0 backdrop:bg-ink/55"
      >
        {opened && (
          <ViewGraffiti
            post={opened.post}
            color={opened.color}
            canDelete={canDelete}
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
  onClose,
  onDeleted,
}: {
  post: WallPost;
  color: string;
  canDelete: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
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
