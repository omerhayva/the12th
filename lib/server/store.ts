import type { Decision, DecisionChoice } from '@/lib/scoring';
import type { ApiPlayer } from '@/lib/api/types';
import type { DecisionWindow, MatchEvent, MatchEventType } from '@/lib/match-engine';
import type { FootballMatch } from '@/lib/football/provider';

export type StoredDecision = Omit<Decision, 'outcome' | 'points'> & {
  playerId: string;
  matchId: string;
  lockedAt: string;
  outcome?: Decision['outcome'];
  points?: number;
};

export type PlayerWithDecisions = {
  player: ApiPlayer;
  decisions: StoredDecision[];
};

export type DecisionInput = {
  playerId: string;
  matchId: string;
  windowId: string;
  minute: number;
  choice: Decision['choice'];
  lockedAt: string;
};

export type DecisionResolution = {
  outcome: Decision['outcome'];
  points: number;
  label: 'DOĞRU' | 'YANLIŞ';
  eventMinute: number;
  eventType: Decision['eventType'];
};

export type MatchState = {
  match: FootballMatch;
  events: MatchEvent[];
  windows: DecisionWindow[];
};

export type MatchEventInput = {
  id: string;
  matchId: string;
  minute: number;
  type: MatchEventType;
  team?: 'HOME' | 'AWAY';
  title: string;
  description?: string;
};

export type The12thStore = {
  getPlayer(playerId: string): Promise<ApiPlayer | null>;
  upsertPlayer(player: ApiPlayer): Promise<ApiPlayer>;
  createDecision(input: DecisionInput): Promise<StoredDecision>;
  getPlayerDecisions(playerId: string): Promise<StoredDecision[]>;
  getMatchDecisions(matchId: string): Promise<StoredDecision[]>;
  resolveDecision(decisionId: string, resolution: DecisionResolution): Promise<StoredDecision>;
  getPlayersWithDecisions(): Promise<PlayerWithDecisions[]>;
  getMatchState(matchId: string): Promise<MatchState | null>;
  upsertMatch(match: FootballMatch): Promise<FootballMatch>;
  createMatchEvent(input: MatchEventInput): Promise<MatchEvent>;
  upsertDecisionWindow(matchId: string, window: DecisionWindow): Promise<DecisionWindow>;
  updateMatchMeta(matchId: string, patch: Partial<Pick<FootballMatch, 'homeScore' | 'awayScore' | 'minute' | 'status'>>): Promise<FootballMatch>;
};

function configuredForSupabase() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function getStore(): Promise<The12thStore> {
  if (configuredForSupabase()) {
    const { supabaseStore } = await import('./supabase-store');
    return supabaseStore;
  }

  const { memoryStore } = await import('./memory-store');
  return memoryStore;
}

export function storeMode() {
  return configuredForSupabase() ? 'supabase' : 'memory';
}
