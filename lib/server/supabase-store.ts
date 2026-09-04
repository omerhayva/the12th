import { createClient } from '@supabase/supabase-js';
import type { ApiPlayer } from '@/lib/api/types';
import type { Decision } from '@/lib/scoring';
import type { DecisionWindow, MatchEvent } from '@/lib/match-engine';
import type { DecisionInput, MatchEventInput, MatchState, PlayerWithDecisions, StoredDecision, The12thStore, DecisionResolution } from './store';
import type { FootballMatch } from '@/lib/football/provider';

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_ENV_MISSING');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function mapDecision(row: Record<string, unknown>): StoredDecision {
  return { id: String(row.id), playerId: String(row.player_id), matchId: String(row.match_id), windowId: String(row.window_id), minute: Number(row.minute), choice: row.choice as Decision['choice'], outcome: row.outcome as Decision['outcome'] | undefined, points: row.points == null ? undefined : Number(row.points), eventMinute: row.event_minute == null ? undefined : Number(row.event_minute), eventType: row.event_type as Decision['eventType'] | undefined, lockedAt: String(row.locked_at) };
}

function mapMatch(row: Record<string, unknown>): FootballMatch {
  return {
    id: String(row.id), home: String(row.home_team), away: String(row.away_team), homeShort: String(row.home_short ?? String(row.home_team).slice(0, 3).toUpperCase()), awayShort: String(row.away_short ?? String(row.away_team).slice(0, 3).toUpperCase()),
    homeScore: Number(row.home_score), awayScore: Number(row.away_score), minute: Number(row.minute), status: String(row.status) as FootballMatch['status'],
    homeLogo: row.home_logo ? String(row.home_logo) : undefined, awayLogo: row.away_logo ? String(row.away_logo) : undefined,
  } as FootballMatch;
}

function mapEvent(row: Record<string, unknown>): MatchEvent {
  return { id: String(row.id), minute: Number(row.minute), type: row.type as MatchEvent['type'], team: row.team as MatchEvent['team'] | undefined, title: String(row.title), description: row.description ? String(row.description) : undefined };
}

function mapWindow(row: Record<string, unknown>): DecisionWindow {
  return { id: String(row.id), minute: Number(row.minute), question: String(row.question), choices: (row.choices ?? []) as DecisionWindow['choices'], correctChoice: row.correct_choice as DecisionWindow['correctChoice'], resolved: Boolean(row.resolved), resolvedByEventId: row.resolved_by_event_id ? String(row.resolved_by_event_id) : undefined };
}

export const supabaseStore: The12thStore = {
  async getPlayer(playerId) {
    const { data, error } = await client().from('players').select('id, display_name, created_at').eq('id', playerId).maybeSingle();
    if (error) throw error; if (!data) return null;
    return { id: data.id, name: data.display_name, createdAt: data.created_at };
  },
  async upsertPlayer(player) {
    const { data, error } = await client().from('players').upsert({ id: player.id, display_name: player.name }, { onConflict: 'id' }).select('id, display_name, created_at').single();
    if (error) throw error; return { id: data.id, name: data.display_name, createdAt: data.created_at };
  },
  async createDecision(input) {
    const { data, error } = await client().from('decisions').insert({ player_id: input.playerId, match_id: input.matchId, window_id: input.windowId, minute: input.minute, choice: input.choice, locked_at: input.lockedAt }).select('*').single();
    if (error) { if (error.code === '23505') throw new Error('DECISION_ALREADY_EXISTS'); throw error; }
    return mapDecision(data);
  },
  async getPlayerDecisions(playerId) {
    const { data, error } = await client().from('decisions').select('*').eq('player_id', playerId).order('locked_at', { ascending: false });
    if (error) throw error; return (data ?? []).map(mapDecision);
  },
  async getMatchDecisions(matchId) {
    const { data, error } = await client().from('decisions').select('*').eq('match_id', matchId).order('locked_at', { ascending: true });
    if (error) throw error; return (data ?? []).map(mapDecision);
  },
  async resolveDecision(decisionId, resolution) {
    const { data, error } = await client().from('decisions').update({ outcome: resolution.outcome, points: resolution.points, event_minute: resolution.eventMinute, event_type: resolution.eventType, resolved_at: new Date().toISOString() }).eq('id', decisionId).select('*').single();
    if (error) throw error; return mapDecision(data);
  },
  async getPlayersWithDecisions() {
    const { data: playerRows, error: playerError } = await client().from('players').select('id, display_name, created_at');
    if (playerError) throw playerError;
    const { data: decisionRows, error: decisionError } = await client().from('decisions').select('*').not('points', 'is', null);
    if (decisionError) throw decisionError;
    const grouped = new Map<string, StoredDecision[]>();
    for (const row of decisionRows ?? []) { const decision = mapDecision(row); grouped.set(decision.playerId, [...(grouped.get(decision.playerId) ?? []), decision]); }
    return (playerRows ?? []).map((row): PlayerWithDecisions => ({ player: { id: row.id, name: row.display_name, createdAt: row.created_at }, decisions: grouped.get(row.id) ?? [] }));
  },
  async getMatchState(matchId): Promise<MatchState | null> {
    const db = client();
    const [{ data: match, error: matchError }, { data: events, error: eventsError }, { data: windows, error: windowsError }] = await Promise.all([
      db.from('matches').select('*').eq('id', matchId).maybeSingle(),
      db.from('match_events').select('*').eq('match_id', matchId).order('minute', { ascending: true }),
      db.from('decision_windows').select('*').eq('match_id', matchId).order('minute', { ascending: true }),
    ]);
    if (matchError) throw matchError; if (eventsError) throw eventsError; if (windowsError) throw windowsError;
    if (!match) return null;
    return { match: mapMatch(match), events: (events ?? []).map(mapEvent), windows: (windows ?? []).map(mapWindow) };
  },
  async upsertMatch(match) {
    const { data, error } = await client().from('matches').upsert({ id: match.id, home_team: match.home, away_team: match.away, home_short: match.homeShort, away_short: match.awayShort, home_score: match.homeScore, away_score: match.awayScore, minute: match.minute, status: match.status, home_logo: match.homeLogo, away_logo: match.awayLogo }, { onConflict: 'id' }).select('*').single();
    if (error) throw error; return mapMatch(data);
  },
  async createMatchEvent(input) {
    const { data, error } = await client().from('match_events').insert({ id: input.id, match_id: input.matchId, minute: input.minute, type: input.type, team: input.team, title: input.title, description: input.description }).select('*').single();
    if (error) throw error; return mapEvent(data);
  },
  async upsertDecisionWindow(matchId, window) {
    const { data, error } = await client().from('decision_windows').upsert({ id: window.id, match_id: matchId, minute: window.minute, question: window.question, choices: window.choices, correct_choice: window.correctChoice, resolved: window.resolved, resolved_by_event_id: window.resolvedByEventId ?? null }, { onConflict: 'id' }).select('*').single();
    if (error) throw error; return mapWindow(data);
  },
  async updateMatchMeta(matchId, patch) {
    const { data, error } = await client().from('matches').update({ ...(patch.homeScore !== undefined ? { home_score: patch.homeScore } : {}), ...(patch.awayScore !== undefined ? { away_score: patch.awayScore } : {}), ...(patch.minute !== undefined ? { minute: patch.minute } : {}), ...(patch.status !== undefined ? { status: patch.status } : {}) }).eq('id', matchId).select('*').single();
    if (error) throw error; return mapMatch(data);
  },
};
