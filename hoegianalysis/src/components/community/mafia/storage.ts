// 방마다 내 토큰을 이 기기에 기억한다 (새로고침해도 같은 사람으로 돌아온다)
const key = (code: string) => `hl_mafia_${code}`;

export function loadToken(code: string): string | null {
  try {
    return localStorage.getItem(key(code));
  } catch {
    return null;
  }
}

export function saveToken(code: string, token: string): void {
  try {
    localStorage.setItem(key(code), token);
  } catch {
    // 저장이 막힌 브라우저면 이번 방문 동안만
  }
}

export async function api<T = Record<string, unknown>>(
  path: string,
  body: unknown,
  token?: string | null,
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'x-mafia-token': token } : {}) },
      body: JSON.stringify(body ?? {}),
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? '문제가 생겼어요.', status: res.status };
    return { ok: true, data };
  } catch {
    return { ok: false, error: '네트워크 오류예요. 다시 시도해 주세요.', status: 0 };
  }
}
