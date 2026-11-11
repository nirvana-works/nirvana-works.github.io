import { GamesChrome } from '@/components/community/games/GamesChrome';

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <GamesChrome />
      {children}
    </div>
  );
}
