import type { DecisionWindow, MatchEvent } from '@/lib/match-engine';

export type FootballMatchStatus = 'LIVE' | 'HT' | 'FT';

export type FootballMatch = {
  id: string;
  home: string;
  away: string;
  homeShort: string;
  awayShort: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  status: FootballMatchStatus;
  homeLogo?: string;
  awayLogo?: string;
};

export type FootballProvider = {
  getLiveMatches: () => Promise<FootballMatch[]>;
  getMatch: (matchId: string) => Promise<FootballMatch | null>;
  getEvents: (matchId: string) => Promise<MatchEvent[]>;
  getDecisionWindows: (matchId: string) => Promise<DecisionWindow[]>;
};
