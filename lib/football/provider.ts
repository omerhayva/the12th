import type { DecisionWindow, MatchEvent } from '@/lib/match-engine';
import type { matches } from '@/lib/demo-data';

export type FootballMatch = (typeof matches)[number];

export type FootballProvider = {
  getLiveMatches: () => Promise<FootballMatch[]>;
  getMatch: (matchId: string) => Promise<FootballMatch | null>;
  getEvents: (matchId: string) => Promise<MatchEvent[]>;
  getDecisionWindows: (matchId: string) => Promise<DecisionWindow[]>;
};
