import Link from "next/link";
import { FoodTruck, SkewerCat } from "@/components/designs/neo/illustrations";
import {
  Bubble,
  FeaturePill,
  Flower,
  Icon,
  InkBadge,
  MenuDot,
  NbButton,
  Panel,
  Pill,
  Poster,
  RingBadge,
  Smiley,
  Sparkle,
  Starburst,
  Tag,
  halftone,
} from "@/components/designs/neo/parts";
import { nbVars, type NbColor } from "@/components/designs/neo/tokens";

export const metadata = { title: "데모 · 회기 야시장 · 시안 01 · Hoegilab" };

// 시안 01(네오 브루탈리즘)을 실제 웹페이지에 입혀 본 데모. 행사는 가상이다.
// 원본 포스터처럼: 먹색 바탕 위 크림 종이 한 장, 칸(벤토)으로 나눈 판, 그림자 없이 평평하게, 웃는 스티커와 만화 그림
const LINEUP: {
  tag: string;
  title: string;
  body: string;
  emoji: string;
  color: NbColor;
}[] = [
  {
    tag: "EAT",
    title: "먹거리 골목",
    body: "떡볶이부터 타코까지 노점 24곳. 접시는 다회용, 반납하면 스탬프 하나.",
    emoji: "🌮",
    color: "orange",
  },
  {
    tag: "LISTEN",
    title: "골목 무대",
    body: "동네 밴드 여섯 팀이 30분씩. 마지막 곡은 다 같이 떼창.",
    emoji: "🎸",
    color: "sky",
  },
  {
    tag: "SWAP",
    title: "바꿔 마켓",
    body: "안 입는 옷, 다 읽은 책을 들고 오세요. 돈 대신 물건으로 바꿉니다.",
    emoji: "🧺",
    color: "teal",
  },
];

const TIMETABLE: { time: string; what: string; color: NbColor }[] = [
  { time: "18:00", what: "문 열기 · 먹거리 골목 시작", color: "yellow" },
  { time: "19:00", what: "골목 무대 첫 팀", color: "sky" },
  { time: "20:30", what: "바꿔 마켓 경매 타임", color: "teal" },
  { time: "22:00", what: "불꽃 대신 손전등 떼 퍼포먼스", color: "pink" },
  { time: "24:00", what: "문 닫기 · 쓰레기 같이 줍기", color: "orange" },
];

const FAQ = [
  {
    q: "입장료가 있나요?",
    a: "없어요. 다회용 접시 보증금 2,000원만 받고, 반납하면 돌려드려요.",
  },
  {
    q: "비가 오면요?",
    a: "골목 무대만 실내 강당으로 옮기고 나머지는 천막 아래서 그대로 열어요.",
  },
  {
    q: "노점을 내고 싶어요",
    a: '아래 "Apply now" 버튼으로 4월 30일까지 받습니다. 먹거리 24곳, 마켓 30곳.',
  },
];

const H2 =
  "font-nbDisplay text-[clamp(34px,5vw,56px)] uppercase leading-[0.95]";

export default function NightMarketDemo() {
  return (
    <div
      className="min-h-screen bg-[var(--nb-ink)] font-nbBody text-[var(--nb-ink)]"
      style={nbVars}
    >
      {/* 데모 표시 띠 */}
      <p className="px-4 pt-2 text-center text-[12px] font-extrabold text-[var(--nb-paper)] sm:pt-3">
        디자인 시안 01 데모 · 가상의 행사입니다 ·{" "}
        <Link
          href="/designs/neo-brutalism"
          className="underline underline-offset-2"
        >
          견본으로 돌아가기
        </Link>
      </p>

      <Poster className="mx-auto max-w-[1240px] overflow-hidden p-3 sm:p-5">
        {/* 메뉴: 지구 동그라미, 가는 글씨 메뉴, 테두리 알약, 오렌지 동그라미 */}
        <nav className="flex items-center gap-3 border-b-[3px] border-[var(--nb-ink)] pb-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-[3px] border-[var(--nb-ink)]">
            <Icon name="globe" />
          </span>
          <span className="hidden flex-1 justify-around text-[12px] font-bold uppercase tracking-[0.06em] md:flex">
            <a href="#lineup">Lineup</a>
            <a href="#time">Timetable</a>
            <a href="#faq">FAQ</a>
            <a href="#apply">Stalls</a>
          </span>
          <span className="flex-1 md:hidden" />
          <NbButton href="#apply" size="sm">
            Apply
          </NbButton>
          <MenuDot />
        </nav>

        {/* 첫 판: 큰 제목 + 고리 배지 + 소개 카드 */}
        <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="relative">
            <h1 className="font-nbDisplay text-[clamp(58px,12.5vw,156px)] uppercase leading-[0.84] tracking-[-0.03em]">
              Night
              <br />
              Market
            </h1>
            <span className="absolute -top-1 right-0 sm:right-[4%] lg:right-[2%]">
              <span className="block w-[96px] sm:w-[132px]">
                <RingBadge
                  text="HAVE A GOOD NIGHT • HAVE A GOOD NIGHT • "
                  size={132}
                  color="teal"
                  className="h-auto w-full"
                />
              </span>
            </span>
          </div>
          <Panel className="flex flex-col p-5">
            <p className="font-nbDisplay text-[22px] uppercase leading-[1.05]">
              Eat.
              <br />
              Listen.
              <br />
              Swap.
            </p>
            <span className="my-3 block h-[3px] bg-[var(--nb-ink)]" />
            <p className="text-[14px] font-medium leading-[1.6]">
              회기역 2번 출구 골목이 2027년 5월 15일 토요일 밤, 여섯 시간 동안
              시장이 됩니다. 먹고, 듣고, 바꾸고, 같이 치우고 가요.
            </p>
            <span className="mt-auto pt-4">
              <NbButton
                href="#apply"
                color="yellow"
                size="sm"
                icon={<Icon name="bolt" size={15} />}
              >
                Book a stall
              </NbButton>
            </span>
          </Panel>
        </section>

        {/* 둘째 판: 큰 그림 칸 + 오른쪽 두 칸 */}
        <section className="mt-4 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
          <Panel color="pink" className="min-h-[300px] sm:min-h-[380px]">
            <div
              className="absolute inset-0"
              style={halftone("ink", 0.14, 9)}
            />
            <FoodTruck className="absolute bottom-2 left-1/2 h-[84%] max-w-[94%] -translate-x-1/2" />
            <span className="absolute left-3 top-3 sm:left-5 sm:top-5">
              <Starburst color="sky" size={104} rotate={-12}>
                LET&apos;S
                <br />
                GO!
              </Starburst>
              <span className="absolute -bottom-1 right-0">
                <Smiley size={30} />
              </span>
            </span>
            <span className="absolute right-4 top-5 sm:right-8 sm:top-8">
              <Bubble color="sky" rotate={-4}>
                YUM!
              </Bubble>
              <span className="absolute -right-4 -top-4">
                <Sparkle size={22} color="paper" />
              </span>
            </span>
            <span className="absolute bottom-4 left-4">
              <Tag icon={<Icon name="bolt" size={16} />}>
                Good
                <br />
                vibes
              </Tag>
            </span>
          </Panel>

          <div className="grid gap-4">
            <Panel
              color="teal"
              className="flex items-center justify-between gap-3 px-5 py-4"
            >
              <p className="font-nbDisplay text-[clamp(28px,3.4vw,40px)] uppercase leading-[0.92]">
                Stay
                <br />
                Late
              </p>
              <Flower size={68} />
            </Panel>
            <Panel color="orange" className="min-h-[230px]">
              <div
                className="absolute inset-0"
                style={halftone("ink", 0.16, 8)}
              />
              <SkewerCat className="absolute bottom-1 right-3 h-[92%] max-h-[250px]" />
              <span className="absolute left-3 top-3">
                <Starburst color="ink" size={88} rotate={8}>
                  <span className="text-[var(--nb-paper)]">COOL</span>
                </Starburst>
              </span>
              <span className="absolute right-4 top-4">
                <Smiley size={34} rotate={12} />
              </span>
              <span className="absolute bottom-6 left-8">
                <Sparkle size={26} />
              </span>
            </Panel>
          </div>
        </section>

        {/* 셋째 줄: 알약 카드 넷 */}
        <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FeaturePill
            color="orange"
            icon={<Icon name="globe" size={24} />}
            title="Night market"
            sub="딱 하루 밤"
          />
          <FeaturePill
            color="sky"
            icon={<Sparkle size={22} />}
            title="54 stalls"
            sub="노점·마켓 자리"
          />
          <FeaturePill
            color="pink"
            icon={<Icon name="drop" size={24} />}
            title="Zero waste"
            sub="다회용 접시만"
          />
          <FeaturePill
            color="yellow"
            icon={<InkBadge>HG</InkBadge>}
            title="Eat. Listen."
            sub="Swap. Repeat."
          />
        </section>

        {/* 라인업 */}
        <section id="lineup" className="mt-14 scroll-mt-4">
          <div className="flex items-end justify-between gap-4 border-b-[3px] border-[var(--nb-ink)] pb-3">
            <h2 className={H2}>What&apos;s on</h2>
            <Smiley size={40} color="pink" rotate={-10} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {LINEUP.map((l) => (
              <Panel key={l.tag} color={l.color} className="flex flex-col p-5">
                <div className="flex items-start justify-between">
                  <Pill color="paper">{l.tag}</Pill>
                  <span className="grid h-[68px] w-[68px] place-items-center rounded-full border-[3px] border-[var(--nb-ink)] bg-[var(--nb-paper)] text-[36px] leading-none">
                    {l.emoji}
                  </span>
                </div>
                <h3 className="mt-4 font-nbDisplay text-[28px] leading-[1.1]">
                  {l.title}
                </h3>
                <p className="mt-2 text-[15px] font-medium leading-[1.65]">
                  {l.body}
                </p>
              </Panel>
            ))}
          </div>
        </section>

        {/* 시간표 + 자주 묻는 질문: 두 칸 벤토 */}
        <section className="mt-14 grid gap-4 lg:grid-cols-2">
          <Panel className="p-5 sm:p-6">
            <div id="time" className="flex items-center justify-between gap-3">
              <h2 className={H2}>Timetable</h2>
              <Tag color="sky" rotate={5}>
                May
                <br />
                15
              </Tag>
            </div>
            <ol className="mt-4 flex flex-col">
              {TIMETABLE.map((t) => (
                <li
                  key={t.time}
                  className="flex items-center gap-4 border-t-[3px] border-[var(--nb-ink)] py-2.5 first:border-t-0"
                >
                  <span
                    className="shrink-0 rounded-full border-[3px] border-[var(--nb-ink)] px-3 py-0.5 font-nbDisplay text-[17px] sm:text-[19px]"
                    style={{ background: `var(--nb-${t.color})` }}
                  >
                    {t.time}
                  </span>
                  <span className="text-[15px] font-extrabold sm:text-[17px]">
                    {t.what}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel color="sky" className="p-5 sm:p-6">
            <div id="faq" className="flex items-center justify-between gap-3">
              <h2 className={H2}>FAQ</h2>
              <Smiley size={40} rotate={8} />
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {FAQ.map((f, i) => (
                <details
                  key={f.q}
                  open={i === 0}
                  className="group rounded-[14px] border-[3px] border-[var(--nb-ink)] bg-[var(--nb-paper)]"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-[16px] font-extrabold [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span
                      aria-hidden
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-[3px] border-[var(--nb-ink)] bg-[var(--nb-yellow)] font-nbDisplay text-[18px] transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="px-4 pb-4 text-[15px] font-medium leading-[1.65]">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </Panel>
        </section>

        {/* 신청 */}
        <section id="apply" className="mt-4 scroll-mt-4">
          <Panel color="orange" className="px-6 py-10 sm:px-12 sm:py-12">
            <div
              className="absolute inset-0"
              style={halftone("ink", 0.16, 9)}
            />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-nbDisplay text-[clamp(38px,6vw,68px)] uppercase leading-[0.92]">
                  Bring your
                  <br />
                  stall
                </h2>
                <p className="mt-3 text-[17px] font-extrabold">
                  노점·마켓 자리 신청은 4월 30일까지
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 lg:items-end">
                <NbButton color="paper">Apply now · 데모</NbButton>
                <Pill color="yellow" icon={<Icon name="bolt" size={14} />}>
                  선착순 54자리
                </Pill>
              </div>
            </div>
            <span className="absolute left-[46%] top-5 hidden lg:block">
              <Starburst color="pink" size={116} rotate={14}>
                LAST
                <br />
                CALL!
              </Starburst>
            </span>
            <span className="absolute bottom-5 right-6 hidden sm:block lg:right-auto lg:left-[40%]">
              <Smiley size={38} rotate={-14} />
            </span>
          </Panel>
        </section>

        <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t-[3px] border-[var(--nb-ink)] pt-3 text-[12px] font-bold uppercase tracking-[0.04em]">
          <span>Hoegi night market · 디자인 시안 데모를 위한 가상의 행사</span>
          <span className="flex items-center gap-2">
            <Sparkle size={16} /> Hoegilab 포트폴리오
          </span>
        </footer>
      </Poster>
      <div className="h-2 sm:h-4" />
    </div>
  );
}
