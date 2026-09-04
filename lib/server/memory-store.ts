import type { ApiPlayer } from '@/lib/api/types';
import type { Decision } from '@/lib/scoring';
import type { DecisionWindow, MatchEvent } from '@/lib/match-engine';
import type { FootballMatch } from '@/lib/football/provider';
import type { DecisionInput, MatchEventInput, MatchState, PlayerWithDecisions, StoredDecision, The12thStore, DecisionResolution } from './store';
import { demoEvents, demoWindows, matches } from '@/lib/demo-data';

const globalStore = globalThis as typeof globalThis & {
  __the12thPlayers?: Map<string, ApiPlayer>;
  __the12thDecisions?: Map<string, StoredDecision>;
  __the12thMatches?: Map<string, FootballMatch>;
  __the12thEvents?: Map<string, MatchEvent[]>;
  __the12thWindows?: Map<string, DecisionWindow[]>;
};

const players = globalStore.__the12thPlayers ?? new Map<string, ApiPlayer>();
const decisions = globalStore.__the12thDecisions ?? new Map<string, StoredDecision>();
const matchMap = globalStore.__the12thMatches ?? new Map<string, FootballMatch>(matches.map((m) => [m.id, m]));
const eventsMap = globalStore.__the12thEvents ?? new Map<string, MatchEvent[]>(Object.entries(demoEvents));
const windowsMap = globalStore.__the12thWindows ?? new Map<string, DecisionWindow[]>(Object.entries(demoWindows));
globalStore.__the12thPlayers = players;
globalStore.__the12thDecisions = decisions;
globalStore.__the12thMatches = matchMap;
globalStore.__the12thEvents = eventsMap;
globalStore.__the12thWindows = windowsMap;

function key(playerId: string, windowId: string) { return `${playerId}:${windowId}`; }

export const memoryStore: The12thStore = {
  async getPlayer(playerId) { return players.get(playerId) ?? null; },
  async upsertPlayer(player) {
    const existing = players.get(player.id);
    const next = existing ? { ...existing, name: player.name } : player;
    players.set(player.id, next);
    return next;
  },
  async createDecision(input: DecisionInput) {
    const id = key(input.playerId, input.windowId);
    if (decisions.has(id)) throw new Error('DECISION_ALREADY_EXISTS');
    const decision: StoredDecision = { id, playerId: input.playerId, matchId: input.matchId, windowId: input.windowId, minute: input.minute, choice: input.choice, lockedAt: input.lockedAt };
    decisions.set(id, decision);
    return decision;
  },
  async getPlayerDecisions(playerId) { return [...decisions.values()].filter((d) => d.playerId === playerId); },
  async getMatchDecisions(matchId) { return [...decisions.values()].filter((d) => d.matchId === matchId); },
  async resolveDecision(decisionId: string, resolution: DecisionResolution) {
    const decision = [...decisions.values()].find((d) => d.id === decisionId);
    if (!decision) throw new Error('DECISION_NOT_FOUND');
    const next: StoredDecision = { ...decision, ...resolution };
    decisions.set(decisionId, next);
    return next;
  },
  async getPlayersWithDecisions() {
    return [...players.values()].map((player): PlayerWithDecisions => ({ player, decisions: [...decisions.values()].filter((d) => d.playerId === player.id) }));
  },
  async getMatchState(matchId: string): Promise<MatchState | null> {
    const match = matchMap.get(matchId);
    if (!match) return null;
    return { match, events: eventsMap.get(matchId) ?? [], windows: windowsMap.get(matchId) ?? [] };
  },
  async upsertMatch(match) { matchMap.set(match.id, match); return match; },
  async createMatchEvent(input: MatchEventInput) {
    const event: MatchEvent = { id: input.id, minute: input.minute, type: input.type, team: input.team, title: input.title, description: input.description };
    eventsMap.set(input.matchId, [...(eventsMap.get(input.matchId) ?? []), event]);
    return event;
  },
  async upsertDecisionWindow(matchId: string, window: DecisionWindow) {
    const list = windowsMap.get(matchId) ?? [];
    const next = [...list.filter((item) => item.id !== window.id), window].sort((a, b) => a.minute - b.minute);
    windowsMap.set(matchId, next);
    return window;
  },
  async updateMatchMeta(matchId, patch) {
    const current = matchMap.get(matchId);
    if (!current) throw new Error('MATCH_NOT_FOUND');
    const next = { ...current, ...patch };
    matchMap.set(matchId, next);
    return next;
  },
};
