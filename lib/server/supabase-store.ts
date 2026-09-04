import { createClient } from '@supabase/supabase-js';
import type { ApiPlayer } from '@/lib/api/types';
import type { Decision } from '@/lib/scoring';
import type { DecisionInput, PlayerWithDecisions, StoredDecision, The12thStore, DecisionResolution } from './store';

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_ENV_MISSING');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function mapDecision(row: Record<string, unknown>): StoredDecision {
  return {
    id: String(row.id),
    playerId: String(row.player_id),
    matchId: String(row.match_id),
    windowId: String(row.window_id),
    minute: Number(row.minute),
    choice: row.choice as Decision['choice'],
    outcome: row.outcome as Decision['outcome'] | undefined,
    points: row.points == null ? undefined : Number(row.points),
    eventMinute: row.event_minute == null ? undefined : Number(row.event_minute),
    eventType: row.event_type as Decision['eventType'] | undefined,
    lockedAt: String(row.locked_at),
  };
}

export const supabaseStore: The12thStore = {
  async getPlayer(playerId) {
    const { data, error } = await client().from('players').select('id, display_name, created_at').eq('id', playerId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { id: data.id, name: data.display_name, createdAt: data.created_at };
  },

  async upsertPlayer(player) {
    const { data, error } = await client().from('players').upsert({ id: player.id, display_name: player.name }, { onConflict: 'id' }).select('id, display_name, created_at').single();
    if (error) throw error;
    return { id: data.id, name: data.display_name, createdAt: data.created_at };
  },

  async createDecision(input: DecisionInput) {
    const { data, error } = await client().from('decisions').insert({
      player_id: input.playerId,
      match_id: input.matchId,
      window_id: input.windowId,
      minute: input.minute,
      choice: input.choice,
      locked_at: input.lockedAt,
    }).select('*').single();
    if (error) {
      if (error.code === '23505') throw new Error('DECISION_ALREADY_EXISTS');
      throw error;
    }
    return mapDecision(data);
  },

  async getPlayerDecisions(playerId) {
    const { data, error } = await client().from('decisions').select('*').eq('player_id', playerId).order('locked_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapDecision);
  },

  async getMatchDecisions(matchId) {
    const { data, error } = await client().from('decisions').select('*').eq('match_id', matchId).order('locked_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapDecision);
  },

  async resolveDecision(decisionId, resolution: DecisionResolution) {
    const { data, error } = await client().from('decisions').update({
      outcome: resolution.outcome,
      points: resolution.points,
      event_minute: resolution.eventMinute,
      event_type: resolution.eventType,
      resolved_at: new Date().toISOString(),
    }).eq('id', decisionId).select('*').single();
    if (error) throw error;
    return mapDecision(data);
  },

  async getPlayersWithDecisions() {
    const { data: playerRows, error: playerError } = await client().from('players').select('id, display_name, created_at');
    if (playerError) throw playerError;
    const { data: decisionRows, error: decisionError } = await client().from('decisions').select('*').not('points', 'is', null);
    if (decisionError) throw decisionError;

    const grouped = new Map<string, StoredDecision[]>();
    for (const row of decisionRows ?? []) {
      const decision = mapDecision(row);
      const list = grouped.get(decision.playerId) ?? [];
      list.push(decision);
      grouped.set(decision.playerId, list);
    }

    return (playerRows ?? []).map((row): PlayerWithDecisions => ({
      player: { id: row.id, name: row.display_name, createdAt: row.created_at },
      decisions: grouped.get(row.id) ?? [],
    }));
  },
};
