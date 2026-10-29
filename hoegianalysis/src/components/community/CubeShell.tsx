'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CubeFace } from './CubeFace';
import { MENUS } from './sections';

// 면 i를 큐브 위치에 붙이는 변환 (앞·오른쪽·뒤·왼쪽·위·아래)
const PLACE = ['rotateY(0deg)', 'rotateY(90deg)', 'rotateY(180deg)', 'rotateY(-90deg)', 'rotateX(90deg)', 'rotateX(-90deg)'];
// 위 배치에서 각 면이 바라보는 방향 (x 오른쪽, y 아래, z 화면 밖)
const NORMALS: [number, number, number][] = [
  [0, 0, 1],
  [1, 0, 0],
  [0, 0, -1],
  [-1, 0, 0],
  [0, -1, 0],
  [0, 1, 0],
];
// 면 i를 정면으로 가져오는 큐브 회전 (x, y)
const VIEW: [number, number][] = [
  [0, 0],
  [0, -90],
  [0, -180],
  [0, 90],
  [-90, 0],
  [90, 0],
];
const DRAG_SPEED = 0.5; // 1px 끌 때 몇 도 도는지

// 지금 각도에서 가장 짧게 도는 쪽으로 목표 각도를 맞춘다
function nearest(target: number, current: number): number {
  return target + 360 * Math.round((current - target) / 360);
}

const snap = (deg: number) => Math.round(deg / 90) * 90;

// rotateX(ax) rotateY(ay)로 돌린 큐브에서 화면 쪽(z)을 가장 많이 보는 면
function frontFace(ax: number, ay: number): number {
  const [rx, ry] = [(ax * Math.PI) / 180, (ay * Math.PI) / 180];
  let best = 0;
  let bestZ = -Infinity;
  NORMALS.forEach(([x, y, z], i) => {
    // rotateY 먼저, 그다음 rotateX (CSS 변환 목록은 오른쪽부터 적용)
    const z1 = -x * Math.sin(ry) + z * Math.cos(ry);
    const z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
    if (z2 > bestZ) [best, bestZ] = [i, z2];
  });
  return best;
}

function menuIndexOf(pathname: string): number {
  return MENUS.findIndex((m) => pathname === m.href || pathname.startsWith(`${m.href}/`));
}

// 커뮤니티 모든 화면 위쪽. 레이아웃에 있어서 화면을 옮겨도 큐브가 그대로 살아 있고,
// 홈에선 포스터 가운데에 크게, 다른 화면에선 오른쪽 위 칸 안에 작게 들어간다 (그 사이를 애니메이션)
export function CubeShell() {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === '/';
  const pageIndex = menuIndexOf(pathname);

  const [index, setIndex] = useState(Math.max(0, pageIndex));
  // 홈으로 처음 들어오면 3/4 바퀴 돌아간 상태에서 시작해 한 번 돌며 첫 면에 멈춘다
  const [angle, setAngle] = useState<[number, number]>(() => (isHome ? [0, 270] : VIEW[Math.max(0, pageIndex)]));
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; px: number; py: number; ax: number; ay: number; moved: boolean } | null>(null);

  function turnTo(next: number) {
    const i = (next + MENUS.length) % MENUS.length;
    const [tx, ty] = VIEW[i];
    setAngle(([x, y]) => [nearest(tx, x), nearest(ty, y)]);
    setIndex(i);
  }

  useEffect(() => {
    if (!isHome) return;
    const id = requestAnimationFrame(() => setAngle(VIEW[0]));
    return () => cancelAnimationFrame(id);
    // 첫 진입 때만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 다른 화면으로 가면 그 메뉴 면이 앞에 오도록 돌린다 (칸 안의 작은 큐브도 지금 위치를 보여준다)
  useEffect(() => {
    if (pageIndex >= 0 && pageIndex !== index) turnTo(pageIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex]);

  // 끄는 동안은 손을 그대로 따라 돌고, 놓으면 가장 가까운 면에 딱 맞춘다
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!isHome || drag.current) return; // 두 번째 손가락은 무시
    drag.current = { id: e.pointerId, px: e.clientX, py: e.clientY, ax: angle[0], ay: angle[1], moved: false };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return; // 끌기를 시작한 포인터만 따른다
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (!d.moved && Math.hypot(dx, dy) < 6) return; // 살짝 떨린 건 누르기로 본다
    if (!d.moved) {
      // 실제로 끌기 시작했을 때만 포인터를 붙잡는다. 누르자마자 잡으면 면 버튼 클릭이 큐브 쪽으로 넘어간다
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // 붙잡기에 실패해도(이미 끝난 포인터 등) 회전은 계속한다
      }
      setDragging(true);
    }
    d.moved = true;
    setAngle([d.ax - dy * DRAG_SPEED, d.ay + dx * DRAG_SPEED]);
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (d && e.pointerId !== d.id) return;
    if (d?.moved) {
      // 가장 가까운 면을 고른 뒤, 그 면이 똑바로 선 자세로 맞춘다 (뒤집히거나 옆으로 누운 그림 방지)
      const i = frontFace(snap(angle[0]), snap(angle[1]));
      const [tx, ty] = VIEW[i];
      setDragging(false);
      setAngle([nearest(tx, angle[0]), nearest(ty, angle[1])]);
      setIndex(i);
    }
    setTimeout(() => (drag.current = null), 0); // 뒤따르는 클릭 이벤트가 끝난 뒤에 초기화
  }

  function onFace(i: number) {
    if (drag.current?.moved) return; // 돌리고 난 손 떼기는 누르기가 아니다
    if (i === index) router.push(MENUS[i].href); // 경로가 바뀌면 큐브가 오른쪽 위 칸으로 들어간다
    else turnTo(i);
  }

  const current = MENUS[index];

  return (
    <div className="cube-shell relative mx-auto w-full max-w-2xl px-4 pt-5">
      <div className="flex h-[72px] items-start justify-between">
        <div>
          <Link href="/" className="font-latin text-[22px] font-semibold leading-none tracking-[-0.02em]">
            Hoegilab.
          </Link>
          <span aria-hidden className="mt-4 block h-[2px] w-[72px] bg-ink" />
        </div>
        {/* 오른쪽 위 꺾쇠 칸: 다른 화면에선 작은 큐브가 들어와 앉고, 누르면 홈으로 돌아가며 다시 커진다 */}
        <Link
          href="/"
          aria-label="홈으로, 큐브 펼치기"
          tabIndex={isHome ? -1 : 0}
          className={`relative block h-[72px] w-[72px] shrink-0 ${isHome ? 'pointer-events-none' : ''}`}
        >
          <span aria-hidden className="absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2 border-ink" />
          <span aria-hidden className="absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2 border-ink" />
          <span aria-hidden className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-ink" />
          <span aria-hidden className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-ink" />
        </Link>
      </div>

      <div className="cube-stage mt-2" data-collapsed={!isHome} />

      <div
        className={`cube-mount select-none ${isHome ? 'cursor-grab touch-none active:cursor-grabbing' : ''}`}
        data-mode={isHome ? 'poster' : 'docked'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        // 끌기 전에 큐브 밖으로 나가 놓으면 놓기 이벤트가 안 오므로 여기서 정리
        onPointerLeave={(e) => {
          if (drag.current && !drag.current.moved && e.pointerId === drag.current.id) drag.current = null;
        }}
        // 키보드: 방향키로 돌리고 Enter로 앞면 열기
        tabIndex={isHome ? 0 : -1}
        role={isHome ? 'group' : undefined}
        aria-label={isHome ? `메뉴 큐브. 지금 앞면은 ${current.name}. 방향키로 돌리고 Enter로 열기` : undefined}
        onKeyDown={(e) => {
          if (!isHome) return;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') turnTo(index + 1);
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') turnTo(index - 1);
          else if (e.key === 'Enter') router.push(current.href);
          else return;
          e.preventDefault();
        }}
      >
        <div className="cube-tilt">
          <div
            className="cube"
            data-dragging={dragging}
            style={{ transform: `rotateX(${angle[0]}deg) rotateY(${angle[1]}deg)` }}
          >
            {MENUS.map((m, i) => (
              <button
                key={m.href}
                type="button"
                onClick={() => onFace(i)}
                tabIndex={-1}
                aria-hidden
                className="cube-face"
                style={{ transform: `${PLACE[i]} translateZ(calc(var(--s) / 2))` }}
              >
                {/* size는 스티커 간격·모서리 계산용. 실제 크기는 면(--s)을 꽉 채운다 */}
                <CubeFace menu={m} size={208} className="!h-full !w-full" />
              </button>
            ))}
          </div>
        </div>
        {isHome && (
          <>
            {/* 포스터의 십자 조준선 */}
            <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-9 w-[2px] -translate-x-1/2 -translate-y-1/2 bg-white" />
            <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[2px] w-9 -translate-x-1/2 -translate-y-1/2 bg-white" />
          </>
        )}
      </div>

      {isHome && (
        <>
          <span aria-hidden className="dot-cluster pointer-events-none absolute left-4 top-[150px] h-[27px] w-[36px]" />
          <span aria-hidden className="dot-cluster pointer-events-none absolute right-4 top-[330px] h-[36px] w-[27px]" />

          {/* 지금 앞에 있는 면 이름. 눌러도 그 화면으로 간다 (큐브 앞면 누르기와 같음) */}
          <Link
            href={current.href}
            aria-live="polite"
            className="mt-14 block py-2 text-center text-[28px] font-black leading-tight"
          >
            {current.name}
          </Link>
        </>
      )}
    </div>
  );
}
