// 기기 구분용 임의 ID (인증 아님, 연속 작성 막기용). 브라우저에서만 부른다.
// 저장이 막힌 브라우저면 이번 방문 동안만 쓴다
let memoryDeviceId: string | null = null;

export function deviceId(): string {
  try {
    const saved = localStorage.getItem('hl_device');
    if (saved) return saved;
    const id = crypto.randomUUID();
    localStorage.setItem('hl_device', id);
    return id;
  } catch {
    memoryDeviceId ??= crypto.randomUUID();
    return memoryDeviceId;
  }
}
