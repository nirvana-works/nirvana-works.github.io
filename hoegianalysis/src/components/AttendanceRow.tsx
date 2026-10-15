// src/components/AttendanceRow.tsx 로 저장하세요
export function AttendanceRow({ name, time }: { name: string; time: string }) {
  return (
    <li className="flex items-center justify-between border-b border-cream/10 py-3">
      <div className="flex items-center gap-3">
        <span className="w-6 h-6 rounded-full border-2 border-stamp flex items-center justify-center text-stamp text-xs -rotate-6">
          ●
        </span>
        <span className="text-cream">{name}</span>
      </div>
      <span className="text-cream/40 text-sm">{time}</span>
    </li>
  );
}
