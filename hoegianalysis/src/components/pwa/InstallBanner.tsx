'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AddSquareIcon, KebabIcon, ShareIcon } from './icons';
import { detectPlatform, IN_APP_NAME, openInExternalBrowser, type InstallPromptEvent, type Platform } from './platform';

const DISMISS_KEY = 'hl-install-dismissed';
const DISMISS_DAYS = 14;

function dismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

function rememberDismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* 비공개 모드 등에서는 기억하지 못해도 괜찮다 */
  }
}

// 폰으로 처음 들어온 사람에게 "회기랩을 앱처럼 쓰세요"를 아래쪽에 띄운다.
// 안드로이드는 [설치] 버튼, 아이폰은 공유 → 홈 화면에 추가 안내, 카톡 안이면 기본 브라우저로 다시 열기.
// 이미 앱으로 열었거나 닫은 지 14일이 안 됐으면 띄우지 않는다.
export function InstallBanner() {
  const pathname = usePathname();
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);
    if (!p.mobile || p.standalone || dismissedRecently()) return;
    const t = window.setTimeout(() => setOpen(true), 1200);

    const onPrompt = (e: Event) => {
      e.preventDefault(); // 크롬 기본 미니 안내 대신 우리 배너의 [설치] 버튼으로 띄운다
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setOpen(false);
      rememberDismiss();
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!open || !platform || pathname === '/install') return null;

  const close = () => {
    setOpen(false);
    rememberDismiss();
  };

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    setPrompt(null);
    if (outcome === 'accepted') close();
  }

  const canReopen = platform.inApp === 'kakao' || (platform.os === 'android' && platform.inApp);

  let title = '회기랩을 앱처럼 쓰세요';
  let body: React.ReactNode;
  let action: React.ReactNode = null;

  if (platform.inApp) {
    const appName = IN_APP_NAME[platform.inApp];
    const browser = platform.os === 'ios' ? 'Safari' : 'Chrome';
    title = `${appName} 안에서는 설치가 안 돼요`;
    body = canReopen ? (
      <>{browser}에서 열면 홈 화면에 회기랩 아이콘을 만들 수 있어요.</>
    ) : (
      <>
        오른쪽 아래 <b>⋯</b> 또는 공유 버튼을 누르고 <b>&lsquo;Safari로 열기&rsquo;</b>를 골라 주세요.
      </>
    );
    if (canReopen)
      action = (
        <button type="button" onClick={() => openInExternalBrowser(platform)} className={stickerBtn}>
          {browser}로 열기
        </button>
      );
  } else if (platform.os === 'android') {
    body = prompt ? (
      <>홈 화면에 아이콘이 생기고, 주소창 없이 바로 열려요.</>
    ) : (
      <>
        Chrome 메뉴 <KebabIcon className="inline h-4 w-4 align-[-2px]" /> 에서 <b>&lsquo;앱 설치&rsquo;</b> 또는 <b>&lsquo;홈 화면에 추가&rsquo;</b>를 눌러 주세요.
      </>
    );
    if (prompt)
      action = (
        <button type="button" onClick={install} className={stickerBtn}>
          설치
        </button>
      );
  } else {
    body = (
      <>
        아래 공유 버튼 <ShareIcon className="inline h-4 w-4 align-[-2px]" /> → <b>홈 화면에 추가</b> <AddSquareIcon className="inline h-4 w-4 align-[-2px]" /> 를 눌러 주세요.
      </>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="회기랩 앱 설치 안내"
      className="fixed inset-x-0 bottom-0 z-50 px-3"
      style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="mx-auto flex max-w-2xl items-start gap-3 rounded-[14px] border-2 border-ink bg-white p-3 shadow-[4px_4px_0_#000]">
        <img src="/icons/icon-192.png" alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-[11px] border-2 border-ink" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-black leading-snug">{title}</p>
          <p className="mt-0.5 text-[13px] leading-snug text-inkMuted">{body}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {action}
            <Link href="/install" onClick={() => setOpen(false)} className="inline-flex h-9 items-center text-[13px] font-bold underline underline-offset-2">
              설치 방법 자세히
            </Link>
          </div>
        </div>
        <button type="button" onClick={close} aria-label="닫기" className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[20px] leading-none hover:bg-lime">
          ×
        </button>
      </div>
    </div>
  );
}

const stickerBtn =
  'inline-flex h-9 items-center justify-center rounded-[10px] border-2 border-ink bg-sticker px-4 text-[14px] font-bold text-ink hover:bg-[#e3c900]';
