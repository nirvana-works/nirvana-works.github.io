import type { Role } from '@/lib/mafiaTypes';

// 역할마다 넙죽이 캐릭터. 역할이 보이는 자리에 같이 놓는다
const SRC: Record<Role, string> = {
  mafia: '/hoegilab/mafia-boss.webp',
  police: '/hoegilab/mafia-police.webp',
  citizen: '/hoegilab/mafia-citizen.webp',
  doctor: '/hoegilab/mafia-doctor.webp',
};

export function RoleAvatar({ role, className }: { role: Role; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={SRC[role]} alt="" aria-hidden width={560} height={700} loading="lazy" className={`max-w-none object-contain ${className ?? ''}`} />;
}
