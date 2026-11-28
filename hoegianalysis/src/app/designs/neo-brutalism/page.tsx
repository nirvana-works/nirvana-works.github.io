import Link from "next/link";
import { FoodTruck } from "@/components/designs/neo/illustrations";
import {
  Bubble,
  FeaturePill,
  Flower,
  Icon,
  InkBadge,
  Panel,
  NbButton,
  Pill,
  RingBadge,
  Smiley,
  Sparkle,
  Starburst,
  Tag,
  halftone,
  paperGrain,
} from "@/components/designs/neo/parts";
import { NB_COLORS, nbVars } from "@/components/designs/neo/tokens";
import { CoverPoster } from "./CoverPoster";

export const metadata = { title: "시안 01 · 네오 브루탈리즘 · Hoegilab" };

// 디자인 시안 01 견본: 맨 위는 이 스타일로 만든 표지 한 장, 아래는 색·글꼴·부품·규칙
export default function NeoBrutalismSpecimen() {
  return (
    <div
      className="min-h-screen bg-[var(--nb-paper)] font-nbBody text-[var(--nb-ink)]"
      style={{ ...nbVars, ...paperGrain }}
    >
      <div className="mx-auto flex max-w-[1200px] flex-col gap-16 px-4 py-6 sm:px-8 sm:py-10">
        <Cover />
        <Colors />
        <Type />
        <Parts />
        <Rules />
        <Link
          href="/designs/neo-brutalism/demo"
          className="flex items-center justify-between gap-4 rounded-[18px] border-[3px] border-[var(--nb-ink)] bg-[var(--nb-pink)] px-6 py-5 transition-colors hover:bg-[var(--nb-orange)]"
        >
          <span>
            <span className="block text-[12px] font-extrabold uppercase tracking-[0.1em]">
              Demo page
            </span>
            <span className="font-nbDisplay text-[26px] leading-tight">
              이 시안으로 만든 웹페이지 보기
            </span>
          </span>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-[3px] border-[var(--nb-ink)] bg-[var(--nb-paper)]">
            <Icon name="arrow" size={22} />
          </span>
        </Link>
        <p className="pb-6 text-center text-[13px] font-bold">
          <Link
            href="/portfolio/designs"
            className="underline underline-offset-4"
          >
            ‹ 디자인 시안 보관함
          </Link>
        </p>
      </div>
    </div>
  );
}

/* ───────────── 표지 (이 스타일로 만든 웹 첫 화면 한 장) ───────────── */

function Cover() {
  return <CoverPoster />;
}

/* ───────────── 견본 섹션 공통 머리 ───────────── */

function SectionHead({
  id,
  no,
  title,
  sub,
}: {
  id: string;
  no: string;
  title: string;
  sub: string;
}) {
  return (
    <header
      id={id}
      className="mb-6 flex flex-wrap items-end gap-x-4 gap-y-1 border-b-[3px] border-[var(--nb-ink)] pb-3"
    >
      <span className="rounded-full border-[3px] border-[var(--nb-ink)] bg-[var(--nb-yellow)] px-3 py-0.5 font-nbDisplay text-[16px]">
        {no}
      </span>
      <h2 className="font-nbDisplay text-[40px] uppercase leading-none">
        {title}
      </h2>
      <p className="text-[14px] font-bold">{sub}</p>
    </header>
  );
}

/* ───────────── 색 ───────────── */

function Colors() {
  return (
    <section>
      <SectionHead
        id="colors"
        no="01"
        title="Colors"
        sub="크림 종이 + 먹 + 원색 여섯. 한 판에는 원색 하나만"
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {NB_COLORS.map((c) => (
          <Panel key={c.key} className="overflow-hidden">
            <div
              className="h-[92px] border-b-[3px] border-[var(--nb-ink)]"
              style={{ background: c.hex }}
            />
            <div className="p-3">
              <p className="text-[16px] font-black">{c.name}</p>
              <p className="font-nbBody text-[13px] font-extrabold">{c.hex}</p>
              <p className="mt-1 text-[12px] font-medium leading-snug">
                {c.use}
              </p>
            </div>
          </Panel>
        ))}
      </div>
    </section>
  );
}

/* ───────────── 글꼴 ───────────── */

function Type() {
  return (
    <section>
      <SectionHead
        id="type"
        no="02"
        title="Type"
        sub="헤드라인은 아주 굵게 대문자로, 본문은 단단한 산세리프"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-6">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.1em]">
            Display · Archivo Black / 블랙한산스
          </p>
          <p className="mt-2 font-nbDisplay text-[96px] leading-[0.9]">Aa 가</p>
          <p className="mt-4 font-nbDisplay text-[44px] uppercase leading-[0.95]">
            Big headline
          </p>
          <p className="font-nbDisplay text-[32px] leading-[1.1]">
            현금흐름 파이프라인
          </p>
          <p className="mt-2 font-nbDisplay text-[20px] uppercase">
            Section label · 소제목
          </p>
        </Panel>
        <Panel className="p-6">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.1em]">
            Body · Archivo / Gothic A1
          </p>
          <p className="mt-3 text-[22px] font-extrabold leading-snug">
            굵은 본문 22 — 카드 제목과 강조 문장
          </p>
          <p className="mt-2 text-[16px] font-medium leading-[1.7]">
            본문 16 — 시세차익이 아니라 현금흐름에 베팅합니다. 문장은 짧게,
            숫자는 크게. 긴 설명은 판 하나에 세 줄을 넘기지 않습니다.
          </p>
          <p className="mt-3 text-[12px] font-extrabold uppercase tracking-[0.08em]">
            Caption 12 · uppercase label · 캡션
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[12px] font-extrabold">
            {[
              "96 display",
              "44 headline",
              "32 ko headline",
              "22 strong",
              "16 body",
              "12 label",
            ].map((s) => (
              <span
                key={s}
                className="rounded-full border-[3px] border-[var(--nb-ink)] px-2.5 py-0.5"
              >
                {s}
              </span>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}

/* ───────────── 부품 ───────────── */

function Parts() {
  const cell =
    "flex flex-col items-center justify-center gap-3 p-5 min-h-[170px]";
  const label = "text-[12px] font-extrabold uppercase tracking-[0.08em]";
  return (
    <section>
      <SectionHead
        id="parts"
        no="03"
        title="Parts"
        sub="모든 부품은 먹선 3px, 모서리 18px, 그림자 없이 평평하게"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Panel className={cell}>
          <div className="flex flex-wrap justify-center gap-3">
            <NbButton>Contact</NbButton>
            <NbButton color="yellow" icon={<Icon name="bolt" size={16} />}>
              Design without limits
            </NbButton>
            <NbButton color="pink">Join</NbButton>
          </div>
          <p className={label}>
            Button · 평평한 알약 + 화살표, 올리면 먹색으로 뒤집힌다
          </p>
        </Panel>
        <Panel className={cell}>
          <div className="flex flex-wrap justify-center gap-2">
            <Pill color="yellow" icon={<Icon name="bolt" size={14} />}>
              Good vibes
            </Pill>
            <Pill color="sky" icon={<Icon name="spark" size={14} />}>
              New
            </Pill>
            <Pill color="pink">추후 공개</Pill>
            <Pill color="teal" icon={<Icon name="globe" size={14} />}>
              Global
            </Pill>
          </div>
          <p className={label}>Pill · 아이콘 + 대문자 라벨</p>
        </Panel>
        <Panel className={cell}>
          <div className="flex items-center gap-2">
            <Starburst color="yellow" size={96}>
              WOW
            </Starburst>
            <Starburst color="pink" size={96} points={10} rotate={12}>
              NEW!
            </Starburst>
          </div>
          <p className={label}>Starburst · 꼭짓점 10~14개</p>
        </Panel>
        <Panel className={cell}>
          <div className="flex items-center gap-4 pb-3">
            <Bubble color="sky">OMG!</Bubble>
            <Bubble color="paper" rotate={5}>
              좋아요
            </Bubble>
          </div>
          <p className={label}>Bubble · 꼬리는 왼쪽 아래</p>
        </Panel>
        <Panel className={cell}>
          <div className="flex items-center gap-3">
            <Flower size={72} />
            <Flower size={56} petal="sky" face="paper" />
            <RingBadge text="HOEGILAB • DRAFT 01 • " size={96} color="yellow" />
          </div>
          <p className={label}>Flower · Ring badge</p>
        </Panel>
        <Panel className={cell}>
          <div className="grid w-full grid-cols-3 gap-2">
            {(["pink", "orange", "teal"] as const).map((c) => (
              <div
                key={c}
                className="relative h-[72px] overflow-hidden rounded-[12px] border-[3px] border-[var(--nb-ink)]"
                style={{ background: `var(--nb-${c})` }}
              >
                <div
                  className="absolute inset-0"
                  style={halftone("ink", 0.25, 8)}
                />
              </div>
            ))}
          </div>
          <p className={label}>Halftone · 그림 자리와 그림자 채우기</p>
        </Panel>
        <Panel className={cell}>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Smiley size={44} />
            <Smiley size={36} color="pink" rotate={-12} />
            <Sparkle size={28} />
            <Sparkle size={28} color="yellow" />
            <Tag icon={<Icon name="bolt" size={16} />}>
              Good
              <br />
              vibes
            </Tag>
            <InkBadge>NB</InkBadge>
          </div>
          <p className={label}>Smiley · Sparkle · Tag · Ink badge</p>
        </Panel>
        <Panel color="pink" className="min-h-[170px] pb-8">
          <div className="absolute inset-0" style={halftone("ink", 0.14, 9)} />
          <FoodTruck className="relative mx-auto block w-[80%]" />
          <p
            className={`${label} absolute bottom-2 left-0 right-0 text-center`}
          >
            Illustration · 직접 그린 만화 그림
          </p>
        </Panel>
        <Panel className={cell}>
          <div className="w-full max-w-[280px]">
            <FeaturePill
              color="sky"
              icon={<Sparkle size={22} />}
              title="Bold colors"
              sub="Bigger impact"
            />
          </div>
          <p className={label}>Feature pill · 아이콘 + 두 줄 대문자</p>
        </Panel>
      </div>
    </section>
  );
}

/* ───────────── 규칙 ───────────── */

function Rules() {
  const rules = [
    {
      ok: true,
      t: "판 하나에 원색 하나",
      d: "판을 여러 색으로 나누지 않는다. 색은 판끼리 대비로 쓴다",
    },
    {
      ok: true,
      t: "먹선은 모두 같은 두께",
      d: "3px. 얇은 선이 섞이면 만화 느낌이 무너진다",
    },
    {
      ok: true,
      t: "그림자 없이 평평하게",
      d: "깊이는 판끼리 겹침, 비스듬한 스티커, 망점으로 낸다",
    },
    {
      ok: true,
      t: "화면 전체가 포스터 한 장",
      d: "먹색 바탕 위 크림 종이 한 장, 그 안을 크고 작은 칸으로 나눈다",
    },
    {
      ok: true,
      t: "칸마다 스티커 하나",
      d: "웃는 얼굴, 반짝이, 별 터짐을 칸 모서리에 비스듬히 붙인다",
    },
    {
      ok: false,
      t: "그라데이션·흐림·유리 효과",
      d: "평평한 원색과 망점만 쓴다",
    },
    {
      ok: false,
      t: "남의 일러스트 그대로 쓰기",
      d: "그림 자리는 직접 그린 그림이나 넙죽이로 채운다",
    },
  ];
  return (
    <section>
      <SectionHead
        id="rules"
        no="04"
        title="Rules"
        sub="이 시안을 꺼내 쓸 때 지킬 것"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rules.map((r) => (
          <Panel
            key={r.t}
            color={r.ok ? "paper" : "pink"}
            className="flex gap-3 p-4"
          >
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-[3px] border-[var(--nb-ink)] font-nbDisplay text-[16px] ${r.ok ? "bg-[var(--nb-teal)]" : "bg-[var(--nb-red)] text-[var(--nb-paper)]"}`}
            >
              {r.ok ? "DO" : "✕"}
            </span>
            <div>
              <p className="text-[16px] font-black">{r.t}</p>
              <p className="mt-1 text-[13px] font-medium leading-snug">{r.d}</p>
            </div>
          </Panel>
        ))}
      </div>
    </section>
  );
}
