import { KingBoard } from '@/components/community/kingmaker/KingBoard';
import { KingLogin } from '@/components/community/kingmaker/KingLogin';
import { isKing, kingConfigured } from '@/lib/kingAuth';
import { getMeta, listPeople } from '@/lib/kingmaker';

// 비밀 페이지: 메뉴 어디에도 링크가 없고, 검색 엔진에도 올리지 않는다
export const metadata = { title: '킹메이커', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function KingmakerPage() {
  const ok = isKing();
  const [people, meta] = ok ? await Promise.all([listPeople(), getMeta()]) : [[], null];
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-[28px] font-black leading-tight">킹메이커</h1>
        <p className="text-[14px] text-inkMuted">{ok && meta ? `${meta.candidate || '우리 후보'} 원우회장 만들기. 누가 지지하고, 누가 망설이고, 누가 반대하는지 한눈에.` : '들어오려면 암호가 필요해요.'}</p>
      </header>
      {ok && meta ? <KingBoard initialPeople={people} initialMeta={meta} /> : <KingLogin configured={kingConfigured()} />}
    </div>
  );
}
