import type { Decision } from '@/lib/scoring';
import type { ApiPlayer } from '@/lib/api/types';

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

export type The12thStore = {
  getPlayer(playerId: string): Promise<ApiPlayer | null>;
  upsertPlayer(player: ApiPlayer): Promise<ApiPlayer>;
  createDecision(input: DecisionInput): Promise<StoredDecision>;
  getPlayerDecisions(playerId: string): Promise<StoredDecision[]>;
  getMatchDecisions(matchId: string): Promise<StoredDecision[]>;
  resolveDecision(decisionId: string, resolution: DecisionResolution): Promise<StoredDecision>;
  getPlayersWithDecisions(): Promise<PlayerWithDecisions[]>;
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
