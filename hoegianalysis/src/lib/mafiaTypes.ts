// 마피아 게임: 서버와 화면이 함께 쓰는 타입·상수 (서버 전용 코드를 넣지 않는다)
export type Role = 'mafia' | 'citizen' | 'police' | 'doctor';
export type Phase = 'lobby' | 'night' | 'day_talk' | 'day_vote' | 'vote_result' | 'ended';
export type GameMode = 'host_plays' | 'host_moderates';
export type ActionKind = 'mafia' | 'police' | 'doctor' | 'vote';

export const ROLES: Record<Role, { label: string; team: 'mafia' | 'citizen'; desc: string }> = {
  mafia: { label: '마피아', team: 'mafia', desc: '밤마다 동료와 함께 한 명을 골라 처단합니다. 정체를 들키지 마세요.' },
  citizen: { label: '시민', team: 'citizen', desc: '낮에 토론하고 투표해서 마피아를 찾아내세요.' },
  police: { label: '경찰', team: 'citizen', desc: '밤마다 한 명을 조사해 마피아인지 알아냅니다.' },
  doctor: { label: '의사', team: 'citizen', desc: '밤마다 한 명을 지켜 마피아의 공격에서 살립니다. 나 자신도 고를 수 있어요.' },
};

export interface Settings {
  nightSecs: number;
  talkSecs: number;
  voteSecs: number;
  revealRoles: boolean; // 죽은 사람의 직업을 모두에게 공개
}

export const DEFAULT_SETTINGS: Settings = { nightSecs: 40, talkSecs: 180, voteSecs: 40, revealRoles: true };
export const SETTING_LIMITS = { nightSecs: [15, 180], talkSecs: [30, 900], voteSecs: [10, 180] } as const;
export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 20;
export const NAME_LIMIT = 8;
export const RESULT_SECS = 8; // 투표 결과를 보여주는 시간

// 인원수별 마피아 수 (경찰·의사는 각 1명)
export function mafiaCount(n: number): number {
  return n < 7 ? 1 : n < 11 ? 2 : n < 15 ? 3 : 4;
}

export type GameEvent =
  | { type: 'night'; attacked: boolean; killedId: string | null }
  | { type: 'vote'; executedId: string | null; tie: boolean };

export interface ViewPlayer {
  id: string;
  name: string;
  alive: boolean;
  role: Role | null; // 보여도 되는 경우에만 채워진다
  isYou: boolean;
}

export interface MafiaView {
  version: number;
  code: string;
  mode: GameMode;
  phase: Phase;
  phaseEndsAt: number | null;
  now: number; // 서버 시각 (카운트다운 보정용)
  dayNo: number;
  settings: Settings;
  winner: 'mafia' | 'citizen' | null;
  event: GameEvent | null;
  viewer: 'moderator' | 'player';
  isHost: boolean;
  you: { id: string; name: string; alive: boolean; role: Role | null } | null;
  players: ViewPlayer[];
  roleCounts: Record<Role, number> | null; // 시작 후 구성 (모두 공개)
  // 내 밤 행동·투표 (지금 단계)
  myTargetId: string | null;
  // 마피아(와 전광판)만: 밤 투표 현황 { 투표자: 대상 }
  mafiaVotes: Record<string, string> | null;
  // 경찰(과 전광판)만: 조사 결과
  policeResults: { dayNo: number; targetId: string; isMafia: boolean }[] | null;
  // 전광판만: 이번 밤 경찰·의사 행동
  nightActions: { police: string | null; doctor: string | null } | null;
  // 낮 투표 현황 { 투표자: 대상 } (투표 단계부터 공개)
  votes: Record<string, string> | null;
}
