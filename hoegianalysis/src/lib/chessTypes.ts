// 넙죽이 체스 방: 브라우저와 서버가 함께 쓰는 값 (서버 전용 코드를 끌어오지 않도록 따로 둔다)
export const CHESS_NAME_LIMIT = 10;

export interface RoomInfo {
  seat: 0 | 1 | null;
  host_name: string;
  guest_name: string | null;
  target: number; // 0 랜덤 · 1 방장 백 · 2 방장 흑
  hasOffer: boolean;
  hasAnswer: boolean;
  offer?: string;
  answer?: string;
}
