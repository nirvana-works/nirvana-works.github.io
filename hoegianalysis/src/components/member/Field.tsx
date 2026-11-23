import { fieldClass } from '@/components/community/formStyles';

// 회원 폼의 이름표 + 입력칸 + 도움말
export function Field({
  label,
  hint,
  ...input
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[14px] font-bold">{label}</span>
      <input {...input} className={fieldClass} />
      {hint && <span className="text-[12px] text-inkMuted">{hint}</span>}
    </label>
  );
}
