import type { DecisionWindow, MatchEvent, MatchEventType } from '@/lib/match-engine';
import type { FootballMatch, FootballProvider } from './provider';

const BASE_URL = 'https://sports.bzzoiro.com/api/v2';

type Json = Record<string, unknown>;

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function num(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function team(value: unknown): Json {
  return value && typeof value === 'object' ? value as Json : {};
}

function mapStatus(value: unknown): FootballMatch['status'] {
  const status = text(value).toLowerCase();
  if (status === 'finished' || status === 'ft') return 'FT';
  if (status === 'half_time' || status === 'ht') return 'HT';
  return 'LIVE';
}

function mapMinute(value: unknown) {
  if (typeof value === 'number') return Math.max(0, Math.floor(value));
  const match = text(value).match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function mapMatch(raw: Json): FootballMatch {
  const home = team(raw.home_team ?? raw.home);
  const away = team(raw.away_team ?? raw.away);
  const status = mapStatus(raw.status ?? raw.state);
  return {
    id: String(raw.id ?? raw.event_id),
    home: text(home.name, text(raw.home_name, 'Home')),
    away: text(away.name, text(raw.away_name, 'Away')),
    homeShort: text(home.short_name, text(home.abbreviation, text(raw.home_short, 'HOME'))),
    awayShort: text(away.short_name, text(away.abbreviation, text(raw.away_short, 'AWAY'))),
    homeScore: num(raw.home_score ?? raw.home_goals),
    awayScore: num(raw.away_score ?? raw.away_goals),
    minute: mapMinute(raw.current_minute ?? raw.minute ?? raw.period),
    status,
    homeLogo: text(home.logo_url ?? home.logo),
    awayLogo: text(away.logo_url ?? away.logo),
  };
}

function incidentType(raw: Json): MatchEventType {
  const value = text(raw.type ?? raw.incident_type ?? raw.kind).toLowerCase();
  if (value.includes('goal')) return 'GOAL';
  if (value.includes('sub')) return 'SUBSTITUTION';
  if (value.includes('red')) return 'CARD';
  if (value.includes('yellow') || value.includes('card')) return 'CARD';
  if (value.includes('shot') || value.includes('save') || value.includes('miss')) return 'SHOT';
  if (value.includes('chance')) return 'CHANCE';
  return 'POSSESSION';
}

function mapIncident(raw: Json, index: number): MatchEvent {
  const minute = num(raw.minute ?? raw.period_minute ?? raw.min, 0);
  const side = text(raw.team_side ?? raw.side).toUpperCase();
  const team = side === 'HOME' ? 'HOME' : side === 'AWAY' ? 'AWAY' : undefined;
  const type = incidentType(raw);
  const player = raw.player && typeof raw.player === 'object' ? text((raw.player as Json).name) : text(raw.player_name);
  const title = text(raw.title ?? raw.detail ?? raw.description, player ? `${player} — ${type}` : type);
  return {
    id: String(raw.id ?? raw.incident_id ?? `bsd-${index}-${minute}`),
    minute,
    type,
    team,
    title,
    description: text(raw.description ?? raw.detail),
  };
}

async function bsdFetch(path: string) {
  const token = process.env.BSD_FOOTBALL_API_KEY;
  if (!token) throw new Error('BSD_FOOTBALL_API_KEY_MISSING');
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Token ${token}` },
    next: { revalidate: 10 },
  });
  if (!response.ok) throw new Error(`BSD_HTTP_${response.status}`);
  return response.json() as Promise<Json>;
}

function results(payload: Json) {
  return Array.isArray(payload.results) ? payload.results.filter((item): item is Json => Boolean(item && typeof item === 'object')) : [];
}

export const bsdFootballProvider: FootballProvider = {
  async getLiveMatches() {
    const payload = await bsdFetch('/events/live/');
    return results(payload).map(mapMatch).filter((match) => match.id && match.status !== 'FT');
  },

  async getMatch(matchId) {
    const payload = await bsdFetch(`/events/${encodeURIComponent(matchId)}/`);
    const raw = payload.event && typeof payload.event === 'object' ? payload.event as Json : payload;
    return raw.id || raw.event_id ? mapMatch(raw) : null;
  },

  async getEvents(matchId) {
    const payload = await bsdFetch(`/events/${encodeURIComponent(matchId)}/incidents/`);
    return results(payload).map(mapIncident).sort((a, b) => a.minute - b.minute);
  },

  async getDecisionWindows(matchId) {
    const match = await this.getMatch(matchId);
    if (!match || match.status === 'FT') return [];
    const events = await this.getEvents(matchId);
    const minute = Math.max(1, match.minute);
    const previousWindow = Math.floor(Math.max(1, minute - 1) / 5) * 5;
    const latestEvent = events.filter((event) => event.minute <= minute).at(-1);
    const correctChoice = latestEvent?.type === 'SUBSTITUTION' ? 'CHANGE' : latestEvent?.type === 'CARD' || latestEvent?.type === 'POSSESSION' ? 'DROP' : 'PRESS';
    return [{
      id: `bsd-${matchId}-${previousWindow}`,
      minute: previousWindow,
      question: 'Oyunun bu anında ne yapılmalı?',
      choices: ['PRESS', 'DROP', 'CHANGE'],
      correctChoice,
      resolved: false,
    } as DecisionWindow];
  },
};
