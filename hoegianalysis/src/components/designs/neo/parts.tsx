// 네오 브루탈리즘 부품: 판, 알약, 별 터짐, 말풍선, 웃는 꽃, 망점, 아이콘. 그림은 모두 CSS·SVG로 직접 그린다
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { nb, type NbColor } from "./tokens";

// 두꺼운 먹선 + 둥근 모서리 판. 그림자는 없다: 원본 포스터처럼 평평하게, 깊이는 판끼리 겹침과 스티커로 낸다
export function Panel({
  color = "paper",
  className = "",
  style,
  children,
}: {
  color?: NbColor;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[18px] border-[3px] border-[var(--nb-ink)] ${className}`}
      style={{ background: nb(color), ...style }}
    >
      {children}
    </div>
  );
}

// 포스터 틀: 먹색 바탕 위에 크림 종이 한 장. 원본처럼 화면 전체가 포스터 한 장 안에 들어간다
export function Poster({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="bg-[var(--nb-ink)] p-2 sm:p-4">
      <div
        className={`rounded-[22px] border-[3px] border-[var(--nb-ink)] bg-[var(--nb-paper)] sm:rounded-[30px] ${className}`}
        style={paperGrain}
      >
        {children}
      </div>
    </div>
  );
}

// 버튼: 원본의 CONTACT ↗처럼 평평한 알약. 대문자 Archivo, 글씨 옆에 화살표.
// 채운 버튼은 왼쪽에 아이콘(원본의 DESIGN WITHOUT LIMITS), 올리면 먹색으로 뒤집힌다
export function NbButton({
  href,
  color,
  icon,
  size = "md",
  children,
}: {
  href?: string;
  color?: NbColor;
  icon?: ReactNode;
  size?: "md" | "sm";
  children: ReactNode;
}) {
  const className = [
    "group inline-flex items-center gap-2 rounded-full border-[3px] border-[var(--nb-ink)] font-nbBody font-extrabold uppercase tracking-[0.03em]",
    "transition-colors duration-100 hover:!bg-[var(--nb-ink)] hover:text-[var(--nb-paper)] active:scale-[0.97]",
    size === "md" ? "px-5 py-2.5 text-[15px]" : "px-3.5 py-1.5 text-[12px]",
  ].join(" ");
  const inner = (
    <>
      {icon}
      <span>{children}</span>
      {!icon && <Icon name="arrow" size={size === "md" ? 17 : 14} />}
    </>
  );
  const style = { background: color ? nb(color) : "transparent" };
  if (href?.startsWith("/"))
    return (
      <Link href={href} className={className} style={style}>
        {inner}
      </Link>
    );
  if (href)
    return (
      <a href={href} className={className} style={style}>
        {inner}
      </a>
    );
  return (
    <button type="button" className={className} style={style}>
      {inner}
    </button>
  );
}

// 오렌지 동그라미 메뉴 단추 (원본 오른쪽 위)
export function MenuDot() {
  return (
    <span
      aria-hidden
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-[3px] border-[var(--nb-ink)] bg-[var(--nb-orange)]"
    >
      <Icon name="menu" />
    </span>
  );
}

// 웃는 얼굴 스티커
export function Smiley({
  size = 36,
  color = "yellow",
  rotate = 0,
}: {
  size?: number;
  color?: NbColor;
  rotate?: number;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      aria-hidden
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <circle
        cx={20}
        cy={20}
        r={17}
        fill={nb(color)}
        stroke="var(--nb-ink)"
        strokeWidth={2.6}
      />
      <ellipse cx={14.5} cy={16} rx={1.9} ry={3} fill="var(--nb-ink)" />
      <ellipse cx={25.5} cy={16} rx={1.9} ry={3} fill="var(--nb-ink)" />
      <path
        d="M11.5 23 Q20 31 28.5 23"
        fill="none"
        stroke="var(--nb-ink)"
        strokeWidth={2.6}
        strokeLinecap="round"
      />
    </svg>
  );
}

// 반짝이 (네 갈래 별)
export function Sparkle({
  size = 22,
  color = "ink",
}: {
  size?: number;
  color?: NbColor;
}) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        d="M12 1 C13 8 16 11 23 12 C16 13 13 16 12 23 C11 16 8 13 1 12 C8 11 11 8 12 1 Z"
        fill={nb(color)}
        stroke="var(--nb-ink)"
        strokeWidth={color === "ink" ? 0 : 1.8}
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 네모 스티커 (원본의 GOOD VIBES ⚡): 두 줄 대문자 + 오른쪽 아이콘
export function Tag({
  color = "yellow",
  icon,
  rotate = -4,
  children,
}: {
  color?: NbColor;
  icon?: ReactNode;
  rotate?: number;
  children: ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[10px] border-[3px] border-[var(--nb-ink)] px-2.5 py-1 font-nbDisplay text-[13px] uppercase leading-[1.05]"
      style={{ background: nb(color), transform: `rotate(${rotate}deg)` }}
    >
      <span>{children}</span>
      {icon}
    </span>
  );
}

// 먹색 타원 배지 (원본의 NB)
export function InkBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-grid h-9 min-w-[52px] place-items-center rounded-[50%] border-[3px] border-[var(--nb-ink)] bg-[var(--nb-ink)] px-2 font-nbDisplay text-[15px] text-[var(--nb-paper)]">
      {children}
    </span>
  );
}

// 아래 줄 알약 카드: 동그라미 아이콘 + 두 줄 대문자 (원본 맨 아래 네 칸)
export function FeaturePill({
  color,
  icon,
  title,
  sub,
}: {
  color: NbColor;
  icon: ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-[14px] border-[3px] border-[var(--nb-ink)] px-3 py-2"
      style={{ background: nb(color) }}
    >
      <span className="grid h-9 min-w-[36px] shrink-0 place-items-center">{icon}</span>
      <p className="font-nbBody text-[12px] font-extrabold uppercase leading-[1.2] tracking-[0.02em] sm:text-[13px]">
        {title}
        <br />
        {sub}
      </p>
    </div>
  );
}

// 아이콘 달린 알약 라벨
export function Pill({
  color = "yellow",
  icon,
  children,
  className = "",
}: {
  color?: NbColor;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border-[3px] border-[var(--nb-ink)] px-3.5 py-1 font-nbBody text-[13px] font-extrabold uppercase leading-tight tracking-[0.02em] ${className}`}
      style={{ background: nb(color) }}
    >
      {icon}
      <span>{children}</span>
    </span>
  );
}

// 별 터짐 스티커 (뾰족한 다각형 + 가운데 글씨)
export function Starburst({
  size = 110,
  points = 14,
  color = "sky",
  rotate = -10,
  children,
}: {
  size?: number;
  points?: number;
  color?: NbColor;
  rotate?: number;
  children: ReactNode;
}) {
  const pts = Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 === 0 ? 48 : 36;
    const a = (Math.PI * i) / points - Math.PI / 2;
    return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`;
  }).join(" ");
  return (
    <span
      className="relative inline-grid place-items-center"
      style={{ width: size, height: size, transform: `rotate(${rotate}deg)` }}
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <polygon
          points={pts}
          fill={nb(color)}
          stroke="var(--nb-ink)"
          strokeWidth={3}
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="relative text-center font-nbDisplay leading-[0.95]"
        style={{ fontSize: size * 0.17 }}
      >
        {children}
      </span>
    </span>
  );
}

// 둥근 말풍선 (꼬리는 왼쪽 아래)
export function Bubble({
  color = "sky",
  rotate = -6,
  children,
}: {
  color?: NbColor;
  rotate?: number;
  children: ReactNode;
}) {
  return (
    <span
      className="relative inline-block"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <span
        className="relative z-[1] inline-block rounded-[999px] border-[3px] border-[var(--nb-ink)] px-5 py-2 font-nbDisplay text-[26px] leading-none"
        style={{ background: nb(color) }}
      >
        {children}
      </span>
      <svg
        viewBox="0 0 30 24"
        className="absolute -bottom-[14px] left-5 z-0 h-[24px] w-[30px]"
        aria-hidden
      >
        <path
          d="M2 0 L10 22 L22 0"
          fill={nb(color)}
          stroke="var(--nb-ink)"
          strokeWidth={3}
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

// 웃는 꽃 (꽃잎 8장 + 웃는 얼굴)
export function Flower({
  size = 64,
  petal = "pink",
  face = "yellow",
}: {
  size?: number;
  petal?: NbColor;
  face?: NbColor;
}) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (Math.PI * 2 * i) / 8;
        return (
          <circle
            key={i}
            cx={50 + 30 * Math.cos(a)}
            cy={50 + 30 * Math.sin(a)}
            r={17}
            fill={nb(petal)}
            stroke="var(--nb-ink)"
            strokeWidth={3.5}
          />
        );
      })}
      <circle
        cx={50}
        cy={50}
        r={24}
        fill={nb(face)}
        stroke="var(--nb-ink)"
        strokeWidth={3.5}
      />
      <ellipse cx={42} cy={45} rx={3} ry={5} fill="var(--nb-ink)" />
      <ellipse cx={58} cy={45} rx={3} ry={5} fill="var(--nb-ink)" />
      <path
        d="M38 55 Q50 67 62 55"
        fill="none"
        stroke="var(--nb-ink)"
        strokeWidth={3.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

// 둥근 글씨 배지 (원 둘레를 따라 도는 문구 + 가운데 꽃)
export function RingBadge({
  text,
  size = 120,
  color = "teal",
  className,
}: {
  text: string;
  size?: number;
  color?: NbColor;
  className?: string;
}) {
  const id = `ring-${text.replace(/\W/g, "")}`;
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      aria-label={text}
      role="img"
      style={{ transform: "rotate(-12deg)" }}
    >
      <circle
        cx={60}
        cy={60}
        r={56}
        fill={nb(color)}
        stroke="var(--nb-ink)"
        strokeWidth={3}
      />
      <defs>
        <path id={id} d="M60 60 m-41 0 a41 41 0 1 1 82 0 a41 41 0 1 1 -82 0" />
      </defs>
      {/* 문구가 원 둘레에 꼭 맞게 늘이고 줄인다 (길면 겹치고 짧으면 빈다) */}
      <text className="font-nbDisplay" fontSize={13} fill="var(--nb-ink)">
        <textPath
          href={`#${id}`}
          textLength={Math.round(2 * Math.PI * 41) - 2}
          lengthAdjust="spacingAndGlyphs"
        >
          {text}
        </textPath>
      </text>
      <g transform="translate(36 36) scale(0.48)">
        <Flower size={100} />
      </g>
    </svg>
  );
}

// 망점(하프톤) 바탕: 그림 자리나 그림자에
export function halftone(
  color: NbColor = "ink",
  opacity = 0.22,
  gap = 9,
): CSSProperties {
  return {
    backgroundImage: `radial-gradient(color-mix(in srgb, ${nb(color)} ${Math.round(opacity * 100)}%, transparent) 1.6px, transparent 2px)`,
    backgroundSize: `${gap}px ${gap}px`,
  };
}

// 굵은 선 아이콘 몇 개
export function Icon({
  name,
  size = 18,
}: {
  name: "globe" | "spark" | "bolt" | "arrow" | "menu" | "drop";
  size?: number;
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      {name === "globe" && (
        <g {...common}>
          <circle cx={12} cy={12} r={9} />
          <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
        </g>
      )}
      {name === "spark" && (
        <path
          d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z"
          fill="var(--nb-ink)"
        />
      )}
      {name === "bolt" && (
        <path
          d="M13 2 L4 14 H11 L10 22 L20 9 H13 Z"
          fill="var(--nb-yellow)"
          stroke="var(--nb-ink)"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      )}
      {name === "arrow" && <path d="M7 17 L17 7 M9 7 H17 V15" {...common} />}
      {name === "menu" && <path d="M5 8 H19 M5 12 H19 M5 16 H19" {...common} />}
      {name === "drop" && (
        <path
          d="M12 3 C16 9 18 12 18 15 a6 6 0 0 1 -12 0 C6 12 8 9 12 3 Z"
          {...common}
        />
      )}
    </svg>
  );
}

// 종이 질감 (아주 옅은 노이즈를 곱하기로)
export const paperGrain: CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .3 0 0 0 0 .25 0 0 0 0 .15 0 0 0 .18 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
};
