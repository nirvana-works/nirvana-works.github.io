import Link from 'next/link';
import { Tile } from '@/components/community/lexio/LexioTile';

export const metadata = { title: '렉시오 규칙' };

// 타일 id = 무늬 × 100 + 숫자 (0 구름, 1 별, 2 달, 3 태양)
const t = (suit: number, num: number) => suit * 100 + num;

function Tiles({ ids, w = 40, gap = 'gap-1.5' }: { ids: number[]; w?: number; gap?: string }) {
  return (
    <div className={`flex flex-wrap items-end ${gap}`}>
      {ids.map((id) => (
        <Tile key={id} id={id} w={w} />
      ))}
    </div>
  );
}

function Section({ no, title, children }: { no: string; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-[14px] border-2 border-ink bg-white p-5">
      <h2 className="flex items-center gap-2 text-[20px] font-black">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-ink font-latin text-[14px] text-white">{no}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Example({ label, ids, note }: { label: string; ids: number[]; note?: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[10px] bg-lime/60 p-3">
      <p className="text-[14px] font-black">
        {label}
        {note && <span className="ml-2 text-[12px] font-normal text-inkMuted">{note}</span>}
      </p>
      <Tiles ids={ids} w={36} />
    </div>
  );
}

export default function Page() {
  return (
    <div className="flex flex-col gap-5">
      <Link href="/games/lexio" className="flex min-h-[44px] items-center gap-1.5 text-[14px] font-bold">
        <span aria-hidden>‹</span> 렉시오 홈
      </Link>

      <header className="flex flex-col gap-2">
        <h1 className="text-[32px] font-black leading-tight">렉시오 규칙</h1>
        <p className="text-[15px] leading-relaxed text-inkMuted">
          12장의 타일을 가장 먼저 모두 내려놓으면 이기는 게임이에요. 포커처럼 조합을 만들어 앞 사람보다 센 패를 내요.
        </p>
      </header>

      <Section no="1" title="한눈에 보기">
        <ul className="list-disc pl-5 text-[15px] leading-relaxed">
          <li>
            <b>2~4명</b>이 하고, 봇이 빈 자리를 채울 수 있어요.
          </li>
          <li>
            모두 <b>12장씩</b> 받아요. 내 패는 나만 보이고, 상대 패는 뒷면만 보여요.
          </li>
          <li>내가 낸 패는 가운데에 놓여서 모두가 같이 봐요.</li>
          <li>가장 먼저 패를 모두 낸 사람이 이기고, 나머지 사람의 점수를 가져가요.</li>
        </ul>
      </Section>

      <Section no="2" title="타일과 숫자 범위">
        <p className="text-[15px] leading-relaxed">타일은 4가지 무늬예요. 같은 숫자일 때는 오른쪽 무늬가 더 세요.</p>
        <div className="flex items-end gap-2">
          {[0, 1, 2, 3].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <Tile id={t(s, 7)} w={46} />
                <span className="text-[13px] font-bold">{['구름', '별', '달', '태양'][s]}</span>
              </div>
              {i < 3 && <span className="pb-6 text-[18px] font-black text-inkMuted">&lt;</span>}
            </div>
          ))}
        </div>
        <p className="text-[15px] leading-relaxed">
          쓰는 숫자는 인원에 따라 달라서, 모두 12장씩 나눠 가져요.
        </p>
        <table className="w-full border-collapse text-center text-[14px]">
          <thead>
            <tr className="border-b-2 border-ink">
              <th className="py-1.5">인원</th>
              <th>쓰는 숫자</th>
              <th>전체 타일</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['2명', '1 ~ 6', '24장'],
              ['3명', '1 ~ 9', '36장'],
              ['4명', '1 ~ 12', '48장'],
            ].map(([a, b, c]) => (
              <tr key={a} className="border-b border-ink/15">
                <td className="py-1.5 font-bold">{a}</td>
                <td className="font-latin">{b}</td>
                <td>{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section no="3" title="숫자의 크기 순서">
        <p className="text-[15px] leading-relaxed">
          보통과 달라요! <b>3이 가장 약하고, 1과 2가 가장 세요.</b> 그중에서도 <b>2가 제일 세요.</b>
        </p>
        <div className="flex flex-wrap items-center gap-1 text-[14px]">
          <Tile id={t(1, 3)} w={34} />
          <span className="font-black text-inkMuted">&lt;</span>
          <Tile id={t(1, 4)} w={34} />
          <span className="font-black text-inkMuted">&lt; … &lt;</span>
          <Tile id={t(1, 12)} w={34} />
          <span className="font-black text-inkMuted">&lt;</span>
          <Tile id={t(1, 1)} w={34} />
          <span className="font-black text-inkMuted">&lt;</span>
          <Tile id={t(1, 2)} w={34} />
        </div>
        <p className="text-[13px] text-inkMuted">약함 ← 3, 4, 5 … 마지막 숫자, 1, 2 → 세요</p>
      </Section>

      <Section no="4" title="낼 수 있는 조합">
        <p className="text-[15px] leading-relaxed">같은 장수의 조합끼리만 겨뤄요. 앞 사람이 페어를 냈다면 더 센 페어만 낼 수 있어요.</p>
        <div className="grid gap-2">
          <Example label="싱글 (1장)" ids={[t(0, 3)]} note="숫자가 크면 이겨요" />
          <Example label="페어 (2장)" ids={[t(1, 7), t(2, 7)]} note="같은 숫자 2장" />
          <Example label="트리플 (3장)" ids={[t(0, 9), t(1, 9), t(2, 9)]} note="같은 숫자 3장" />
        </div>
        <p className="mt-1 text-[15px] font-bold">5장 조합 (약한 순서)</p>
        <div className="grid gap-2">
          <Example label="① 스트레이트" ids={[t(0, 5), t(1, 6), t(2, 7), t(0, 8), t(3, 9)]} note="연속된 숫자 5장" />
          <Example label="② 플러시" ids={[t(1, 3), t(1, 5), t(1, 8), t(1, 10), t(1, 12)]} note="같은 무늬 5장" />
          <Example label="③ 풀하우스" ids={[t(0, 5), t(1, 5), t(2, 5), t(0, 9), t(3, 9)]} note="트리플 + 페어" />
          <Example label="④ 포카드" ids={[t(0, 5), t(1, 5), t(2, 5), t(3, 5), t(1, 9)]} note="같은 숫자 4장 + 아무 1장" />
          <Example label="⑤ 스트레이트 플러시" ids={[t(2, 4), t(2, 5), t(2, 6), t(2, 7), t(2, 8)]} note="같은 무늬 연속 5장 (가장 셈!)" />
        </div>
        <ul className="list-disc pl-5 text-[14px] leading-relaxed text-inkMuted">
          <li>5장 조합끼리는 위 번호가 높을수록 세요. 같은 종류면 가장 센 타일로 겨뤄요(풀하우스는 트리플 숫자, 포카드는 4장 숫자).</li>
          <li>스트레이트는 숫자 순서대로 이어야 해요. 예: …, 11, 12, 1, 2 는 되지만 1, 2, 3, 4, 5 는 안 돼요.</li>
        </ul>
      </Section>

      <Section no="5" title="진행 순서">
        <ol className="list-decimal pl-5 text-[15px] leading-relaxed">
          <li>
            <b>첫 판</b>은 구름 3을 가진 사람이 시작해요. 다음 판부터는 지난 판의 승자가 시작해요.
          </li>
          <li>
            내 차례에 낼 타일을 <b>눌러서 고르고</b> &lsquo;내기&rsquo;를 누르면 가운데로 날아가요.
          </li>
          <li>
            앞 사람이 낸 것보다 센 같은 조합을 낼 수 있어요. 낼 수 없거나 아끼고 싶으면 <b>패스</b>해요.
          </li>
          <li>
            나를 뺀 모두가 패스하면 마지막에 낸 사람이 <b>새로 시작</b>해요. 먼저 내는 사람은 패스할 수 없고, 어떤 조합이든 자유롭게 낼 수 있어요.
          </li>
          <li>
            누군가 <b>12장을 모두 내면</b> 그 판이 끝나요.
          </li>
        </ol>
        <p className="rounded-[10px] bg-lime/60 p-3 text-[14px] leading-relaxed">
          <b>시간 초과:</b> 남이 낸 패를 받는 중이면 자동 패스, 먼저 내는 차례면 가장 약한 타일 한 장이 나가요.
        </p>
      </Section>

      <Section no="6" title="점수 계산">
        <p className="text-[15px] leading-relaxed">판이 끝나면 못 이긴 사람은 <b>남은 타일</b>로 벌점을 내고, 이긴 사람이 그 점수를 모두 가져가요.</p>
        <table className="w-full border-collapse text-center text-[14px]">
          <thead>
            <tr className="border-b-2 border-ink">
              <th className="py-1.5">남은 타일</th>
              <th>점수</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['1 ~ 7장', '장수 × 1'],
              ['8 ~ 9장', '장수 × 2'],
              ['10 ~ 12장', '장수 × 3'],
            ].map(([a, b]) => (
              <tr key={a} className="border-b border-ink/15">
                <td className="py-1.5 font-bold">{a}</td>
                <td>{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[14px] leading-relaxed">
          남은 타일에 <b>2</b>가 있으면, 2 하나마다 점수가 <b>다시 2배</b>가 돼요. 마지막까지 센 2를 쥐고 있으면 위험해요!
        </p>
        <div className="rounded-[10px] bg-lime/60 p-3 text-[14px] leading-relaxed">
          <p className="font-black">예시</p>
          <p>
            남은 타일 9장(그중 2가 1장): 9장 × 2 = 18점, 2가 있으니 × 2 = <b>36점</b>을 잃어요.
          </p>
          <p>남은 타일 3장(2 없음): 3점을 잃어요.</p>
        </div>
        <p className="text-[13px] text-inkMuted">점수는 판마다 쌓여요. &lsquo;다음 판&rsquo;을 누르면 누적 점수를 이어서 계속해요.</p>
      </Section>

      <Section no="7" title="이기는 요령">
        <ul className="list-disc pl-5 text-[15px] leading-relaxed">
          <li>약한 타일은 페어나 5장 조합에 섞어 한꺼번에 털어 내세요.</li>
          <li>1과 2는 아껴 뒀다가 상대가 곧 끝나려 할 때 막는 데 쓰세요.</li>
          <li>상대 패 수가 줄면 위험해요. 남은 장수를 꼭 확인하세요.</li>
        </ul>
      </Section>

      <Link href="/games/lexio" className="mx-auto h-12 w-full max-w-[420px] rounded-[10px] border-2 border-ink bg-sticker text-center text-[16px] font-bold leading-[44px] hover:bg-[#e3c900]">
        게임하러 가기
      </Link>
    </div>
  );
}
