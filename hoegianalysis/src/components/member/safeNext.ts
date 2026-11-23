// 로그인 뒤 돌아갈 주소. 이 사이트 안의 경로만 허용한다 (다른 사이트로 튕기기 방지)
export function safeNext(next: unknown): string {
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/';
}
