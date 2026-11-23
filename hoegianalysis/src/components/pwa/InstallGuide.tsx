'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { stickerButtonClass } from '@/components/community/formStyles';
import { AddSquareIcon, KebabIcon, ShareIcon } from './icons';
import { detectPlatform, IN_APP_NAME, openInExternalBrowser, type InstallPromptEvent, type Platform } from './platform';

type Guide = 'ios' | 'android' | 'kakao';

const TABS: { id: Guide; label: string }[] = [
  { id: 'ios', label: '아이폰' },
  { id: 'android', label: '안드로이드' },
  { id: 'kakao', label: '카톡으로 받았을 때' },
];

// 접속한 기기에 맞는 안내를 먼저 펼치고, 다른 기기 안내도 탭으로 볼 수 있게 한다
export function InstallGuide() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [tab, setTab] = useState<Guide>('ios');
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);
    setOrigin(window.location.origin);
    setTab(p.inApp ? 'kakao' : p.os === 'android' ? 'android' : 'ios');
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (platform?.standalone)
    return (
      <Card>
        <div className="flex items-center gap-3">
          <img src="/icons/icon-192.png" alt="" className="h-12 w-12 rounded-[11px] border-2 border-ink" />
          <p className="text-[16px] font-bold">이미 앱으로 열려 있어요. 설치 완료!</p>
        </div>
      </Card>
    );

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  }

  return (
    <div className="space-y-6">
      {platform && !platform.mobile && origin && (
        <Card>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <div className="rounded-[10px] border-2 border-ink bg-white p-3">
              <QRCode value={origin} size={148} />
            </div>
            <div className="space-y-1 text-center sm:text-left">
              <p className="text-[17px] font-black">폰 카메라로 찍어 보세요</p>
              <p className="text-[14px] leading-relaxed text-inkMuted">
                회기랩이 폰 브라우저로 열리면, 아래 방법대로 홈 화면에 추가하면 됩니다.
              </p>
              <p className="font-latin text-[13px] text-ink">{origin.replace(/^https?:\/\//, '')}</p>
            </div>
          </div>
        </Card>
      )}

      <div role="tablist" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`h-10 rounded-full border-2 border-ink px-4 text-[14px] font-bold ${tab === t.id ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-lime'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'ios' && (
        <Card>
          <Steps
            steps={[
              <>
                <b>Safari</b>로 회기랩을 엽니다. (크롬 앱이어도 최신 iOS면 같은 방법으로 돼요)
              </>,
              <>
                화면 아래(또는 주소창 옆) 공유 버튼 <Key><ShareIcon className="h-4 w-4" /></Key> 을 누릅니다.
              </>,
              <>
                목록을 내려서 <Key><AddSquareIcon className="h-4 w-4" /> 홈 화면에 추가</Key> 를 누릅니다.
              </>,
              <>
                오른쪽 위 <b>추가</b>를 누르면 홈 화면에 회기랩 아이콘이 생겨요.
              </>,
            ]}
          />
        </Card>
      )}

      {tab === 'android' && (
        <Card>
          {prompt && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[10px] bg-lime p-3">
              <p className="text-[14px] font-bold">이 폰에서는 바로 설치할 수 있어요</p>
              <button type="button" onClick={install} className={stickerButtonClass}>
                회기랩 설치
              </button>
            </div>
          )}
          <Steps
            steps={[
              <>
                <b>Chrome</b>(또는 삼성 인터넷)으로 회기랩을 엽니다.
              </>,
              <>
                오른쪽 위 메뉴 <Key><KebabIcon className="h-4 w-4" /></Key> 를 누릅니다. 삼성 인터넷은 아래쪽 <b>≡</b> 메뉴예요.
              </>,
              <>
                <Key>앱 설치</Key> 또는 <Key>홈 화면에 추가</Key> 를 누릅니다.
              </>,
              <>
                <b>설치</b>를 누르면 홈 화면과 앱 목록에 회기랩이 생겨요.
              </>,
            ]}
          />
        </Card>
      )}

      {tab === 'kakao' && (
        <Card>
          <p className="mb-4 text-[14px] leading-relaxed text-inkMuted">
            카톡·네이버·인스타 같은 앱 안에서 링크를 열면 그 앱의 작은 브라우저라서 홈 화면 추가가 안 돼요. 먼저 기본 브라우저로 옮겨 주세요.
          </p>
          {platform?.inApp && (platform.inApp === 'kakao' || platform.os === 'android') && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[10px] bg-lime p-3">
              <p className="text-[14px] font-bold">지금 {IN_APP_NAME[platform.inApp]} 안이에요</p>
              <button type="button" onClick={() => openInExternalBrowser(platform)} className={stickerButtonClass}>
                {platform.os === 'ios' ? 'Safari' : 'Chrome'}로 열기
              </button>
            </div>
          )}
          <Steps
            steps={[
              <>
                카톡에서 링크를 연 화면의 오른쪽 아래 <Key>⋯</Key> (안드로이드는 오른쪽 위 <Key><KebabIcon className="h-4 w-4" /></Key>) 를 누릅니다.
              </>,
              <>
                <Key>다른 브라우저로 열기</Key> 를 누릅니다. 아이폰은 Safari, 안드로이드는 Chrome으로 열려요.
              </>,
              <>
                위의 <b>아이폰</b> 또는 <b>안드로이드</b> 방법대로 홈 화면에 추가하면 끝!
              </>,
            ]}
          />
        </Card>
      )}

      <Card>
        <p className="text-[15px] font-black">설치하면 뭐가 좋아요?</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] leading-relaxed text-inkMuted">
          <li>홈 화면 아이콘 한 번이면 바로 열려요. 주소를 기억할 필요가 없어요.</li>
          <li>주소창 없이 화면 전체를 써서 진짜 앱처럼 보여요.</li>
          <li>앱스토어 설치가 아니라 용량도 거의 안 차지하고, 지우고 싶으면 아이콘을 꾹 눌러 삭제하면 돼요.</li>
        </ul>
      </Card>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-[14px] border-2 border-ink bg-white p-4 shadow-[4px_4px_0_#000]">{children}</section>;
}

function Steps({ steps }: { steps: React.ReactNode[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sticker font-latin text-[14px] font-semibold">
            {i + 1}
          </span>
          <p className="pt-0.5 text-[15px] leading-relaxed">{s}</p>
        </li>
      ))}
    </ol>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <span className="mx-0.5 inline-flex items-center gap-1 rounded-[6px] border-2 border-ink bg-lime px-1.5 py-px align-middle text-[13px] font-bold">
      {children}
    </span>
  );
}
