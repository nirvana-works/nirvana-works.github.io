export { api } from '../mafia/storage';

// 방마다 내 토큰을 이 기기에 기억한다
const key = (code: string) => `hl_poker_${code}`;

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
