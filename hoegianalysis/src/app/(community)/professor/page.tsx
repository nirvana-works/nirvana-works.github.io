import { SubHeader } from '@/components/community/SubHeader';
import { PROFESSOR } from '@/components/community/professor/profile';
import { ProfessorPhoto } from '@/components/community/professor/ProfessorPhoto';

export const metadata = { title: '교수 소개' };

export default function ProfessorPage() {
  const p = PROFESSOR;
  const rows: [string, React.ReactNode][] = [
    ['Office.', p.contact.office],
    ['Tel.', p.contact.tel],
    ['E-mail.', p.contact.email],
    [
      'Homepage/Lab.',
      <a key="hp" href={p.contact.homepage} className="break-all font-bold text-cube underline underline-offset-4">
        {p.contact.homepage.replace(/^https?:\/\//, '')}
      </a>,
    ],
  ];

  return (
    <div className="flex flex-col gap-8">
      <SubHeader title="교수 소개" blurb="회기분석을 이끄는 교수님을 소개합니다" backHref="/portal" backLabel="학사포탈" />

      {/* 프로필 카드: 사진 + 이름 + 연락처 + 연구 분야 */}
      <article className="overflow-hidden rounded-[14px] border-2 border-ink bg-white">
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-col items-center gap-4 bg-[#EEF0F4] p-5 sm:w-[280px] sm:shrink-0">
            <ProfessorPhoto src={p.photo} name={p.name} />
            {/* 학위와 경력: 사진 바로 아래 */}
            <div className="w-full max-w-[250px]">
              <p className="font-latin text-[18px] font-black leading-tight text-cube">{p.degree}</p>
              <h3 className="mt-3 border-b border-ink/25 pb-1 text-[13px] font-black">경력</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {p.career.map((c) => (
                  <li key={c.what} className="leading-snug">
                    <span className="block font-latin text-[12px] font-semibold text-inkMuted">{c.period}</span>
                    <span className="block text-[14px] font-bold">{c.what}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="min-w-0 flex-1 p-5">
            <h2 className="text-[26px] font-black leading-tight">
              {p.name} <span className="text-[16px] font-bold text-inkMuted">{p.title}</span>
            </h2>
            <p className="mt-0.5 text-[13px] text-inkMuted">{p.department}</p>

            <h3 className="mt-5 border-b border-ink/25 pb-2 text-[16px] font-bold text-cube">Contact Information</h3>
            <dl className="mt-3 grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-2 text-[15px] leading-snug">
              {rows.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className={label === 'Homepage/Lab.' ? 'text-cube' : ''}>{label}</dt>
                  <dd className="min-w-0">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 grid grid-cols-[7.5rem_1fr] gap-x-3 border-t border-ink/25 pt-4">
              <h3 className="text-[15px] font-black text-cube">Research Areas</h3>
              <ul className="flex flex-wrap gap-1.5">
                {p.areas.map((a) => (
                  <li key={a} className="rounded-full border-2 border-ink bg-sticker px-2.5 py-[2px] text-[13px] font-bold">
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </article>

      {/* Overview */}
      <section>
        <h2 className="text-[28px] font-black leading-tight text-cube">Overview</h2>
        <div className="mt-2 border-t-2 border-dashed border-cube/50 pt-5">
          <div className="flex flex-col gap-4 text-[15px] leading-[1.85]">
            {p.overview.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
