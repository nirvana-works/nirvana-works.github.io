// 넙죽이 배구 방: 브라우저와 서버가 함께 쓰는 값 (서버 전용 코드를 끌어오지 않도록 따로 둔다)
export const VOLLEY_NAME_LIMIT = 10;
export const VOLLEY_TARGETS = [7, 11, 15] as const;

export interface RoomInfo {
  seat: 0 | 1 | null;
  host_name: string;
  guest_name: string | null;
  target: number;
  hasOffer: boolean;
  hasAnswer: boolean;
  offer?: string;
  answer?: string;
}
