// 오늘 날짜(YYYY-MM-DD)를 기기 현지 시간 기준으로. toISOString()은 UTC라서
// 한국 오전 9시 전에는 어제 날짜가 나옴
export function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
