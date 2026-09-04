import type { DecisionChoice } from '@/lib/scoring';

export type ApiPlayer = {
  id: string;
  name: string;
  createdAt: string;
};

export type ApiDecision = {
  id: string;
  playerId: string;
  matchId: string;
  windowId: string;
  minute: number;
  choice: DecisionChoice;
  outcome?: DecisionChoice;
  points?: number;
  eventMinute?: number;
  eventType?: string;
  lockedAt: string;
};

export type ApiLeaderboardEntry = {
  rank: number;
  playerId: string;
  name: string;
  iq: number;
  decisions: number;
  accuracy: number;
  provisional: boolean;
};
