import Link from 'next/link';
import { FoodTruck, SkewerCat } from '@/components/designs/neo/illustrations';
import { Bubble, FeaturePill, Flower, Icon, InkBadge, MenuDot, NbButton, Panel, Poster, RingBadge, Smiley, Sparkle, Starburst, Tag, halftone } from '@/components/designs/neo/parts';

// 견본 맨 위 표지: 원본 포스터의 짜임을 그대로 옮긴 한 장.
// 먹색 바탕 위 크림 종이, 메뉴 줄, 큰 제목 + 고리 배지 + 소개 카드, 큰 그림 칸 + 오른쪽 두 칸, 아래 알약 넷
export function CoverPoster() {
  return (
    <section aria-label="표지 견본" className="-mx-4 sm:mx-0">
      <Poster className="p-3 sm:p-5">
        <nav className="flex items-center gap-3 border-b-[3px] border-[var(--nb-ink)] pb-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-[3px] border-[var(--nb-ink)]">
            <Icon name="globe" />
          </span>
          <span className="hidden flex-1 justify-around text-[12px] font-bold uppercase tracking-[0.06em] sm:flex">
            <a href="#colors">Colors</a>
            <a href="#type">Type</a>
            <a href="#parts">Parts</a>
            <a href="#rules">Rules</a>
            <Link href="/designs/neo-brutalism/demo">Demo</Link>
          </span>
          <span className="flex-1 sm:hidden" />
          <NbButton href="/portfolio/designs" size="sm">
            보관함
          </NbButton>
          <MenuDot />
        </nav>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="relative">
            <p className="mb-1 text-[13px] font-extrabold uppercase tracking-[0.12em]">Design draft 01 · 네오 브루탈리즘</p>
            <h1 className="font-nbDisplay text-[clamp(50px,10.5vw,138px)] uppercase leading-[0.84] tracking-[-0.03em]">
              Neo
              <br />
              Brutalism
            </h1>
            <span className="absolute right-0 top-0 block w-[84px] sm:w-[124px] lg:right-[2%]">
              <RingBadge text="HAVE A GOOD DAY • HAVE A GOOD DAY • " size={124} className="h-auto w-full" />
            </span>
          </div>
          <Panel className="flex flex-col p-5">
            <p className="font-nbDisplay text-[22px] uppercase leading-[1.05]">
              Bold.
              <br />
              Playful.
              <br />
              Unapologetic.
            </p>
            <span className="my-3 block h-[3px] bg-[var(--nb-ink)]" />
            <p className="text-[14px] font-medium leading-[1.6]">두꺼운 먹선과 원색 판, 만화 스티커로 말하는 디자인. 레트로 코믹의 에너지를 지금 화면에 옮깁니다.</p>
            <span className="mt-auto pt-4">
              <NbButton href="#parts" color="yellow" size="sm" icon={<Icon name="bolt" size={15} />}>
                Design without limits
              </NbButton>
            </span>
          </Panel>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
          <Panel color="pink" className="min-h-[300px] sm:min-h-[360px]">
            <div className="absolute inset-0" style={halftone('ink', 0.14, 9)} />
            <FoodTruck className="absolute bottom-2 left-1/2 h-[84%] max-w-[94%] -translate-x-1/2" />
            <span className="absolute left-3 top-3">
              <Starburst color="sky" size={100}>
                LET&apos;S
                <br />
                GO!
              </Starburst>
              <span className="absolute -bottom-1 right-0">
                <Smiley size={28} />
              </span>
            </span>
            <span className="absolute right-5 top-6">
              <Bubble color="sky">OMG!</Bubble>
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
            <Panel color="teal" className="flex items-center justify-between gap-3 px-5 py-4">
              <p className="font-nbDisplay text-[clamp(28px,3.4vw,40px)] uppercase leading-[0.92]">
                Stay
                <br />
                positive
              </p>
              <Flower size={68} />
            </Panel>
            <Panel color="orange" className="min-h-[220px]">
              <div className="absolute inset-0" style={halftone('ink', 0.16, 8)} />
              <SkewerCat className="absolute bottom-1 right-3 h-[92%] max-h-[240px]" />
              <span className="absolute left-3 top-3">
                <Starburst color="ink" size={86} rotate={8}>
                  <span className="text-[var(--nb-paper)]">COOL</span>
                </Starburst>
              </span>
              <span className="absolute right-4 top-4">
                <Smiley size={32} rotate={12} />
              </span>
            </Panel>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FeaturePill color="orange" icon={<Icon name="globe" size={24} />} title="Neo brutalism" sub="Design with attitude" />
          <FeaturePill color="sky" icon={<Sparkle size={22} />} title="Bold colors" sub="Bigger impact" />
          <FeaturePill color="pink" icon={<Icon name="drop" size={24} />} title="Retro feel" sub="Modern edge" />
          <FeaturePill color="yellow" icon={<InkBadge>NB</InkBadge>} title="Fun. Graphic." sub="Collectible." />
        </div>
      </Poster>
    </section>
  );
}
