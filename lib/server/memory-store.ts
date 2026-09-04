import type { ApiPlayer } from '@/lib/api/types';
import type { Decision } from '@/lib/scoring';
import type { DecisionInput, PlayerWithDecisions, StoredDecision, The12thStore } from './store';

const globalStore = globalThis as typeof globalThis & {
  __the12thPlayers?: Map<string, ApiPlayer>;
  __the12thDecisions?: Map<string, StoredDecision>;
};

const players = globalStore.__the12thPlayers ?? new Map<string, ApiPlayer>();
const decisions = globalStore.__the12thDecisions ?? new Map<string, StoredDecision>();
globalStore.__the12thPlayers = players;
globalStore.__the12thDecisions = decisions;

function key(playerId: string, windowId: string) {
  return `${playerId}:${windowId}`;
}

export const memoryStore: The12thStore = {
  async getPlayer(playerId) {
    return players.get(playerId) ?? null;
  },
  async upsertPlayer(player) {
    const existing = players.get(player.id);
    const next = existing ? { ...existing, name: player.name } : player;
    players.set(player.id, next);
    return next;
  },
  async createDecision(input: DecisionInput) {
    const id = key(input.playerId, input.windowId);
    if (decisions.has(id)) throw new Error('DECISION_ALREADY_EXISTS');
    const decision: StoredDecision = {
      id,
      playerId: input.playerId,
      matchId: input.matchId,
      windowId: input.windowId,
      minute: input.minute,
      choice: input.choice,
      points: 0,
      lockedAt: input.lockedAt,
    } as StoredDecision;
    decisions.set(id, decision);
    return decision;
  },
  async getPlayerDecisions(playerId) {
    return [...decisions.values()].filter((d) => d.playerId === playerId);
  },
  async getPlayersWithDecisions() {
    return [...players.values()].map((player): PlayerWithDecisions => ({
      player,
      decisions: [...decisions.values()].filter((d) => d.playerId === player.id),
    }));
  },
};
