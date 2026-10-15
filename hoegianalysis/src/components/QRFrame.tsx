// src/components/QRFrame.tsx 로 저장하세요
export function QRFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-block p-4 rounded-2xl bg-cream border-4 border-neon shadow-[0_0_24px_var(--color-neon-soft)]">
      {children}
    </div>
  );
}
