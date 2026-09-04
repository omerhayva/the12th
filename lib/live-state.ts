import type { DecisionChoice } from './scoring';
import { scoreDecision } from './scoring';
import type { DecisionWindow, MatchEvent, MatchEventType } from './match-engine';
import { demoEvents, demoWindows, matches } from './demo-data';

export type LiveDecision = {
  id?: string;
  windowId: string;
  matchId?: string;
  minute: number;
  choice: DecisionChoice;
  lockedAt: number;
  points?: number;
  label?: 'DOĞRU' | 'YANLIŞ' | 'BEKLEMEDE';
  outcome?: DecisionChoice;
  eventMinute?: number;
  eventType?: MatchEventType;
};

export type LiveMatchMeta = {
  minute: number;
  homeScore: number;
  awayScore: number;
  status: 'LIVE' | 'HT' | 'FT';
};

export type LiveMatchState = {
  meta: LiveMatchMeta;
  events: MatchEvent[];
  windows: DecisionWindow[];
  decisions: LiveDecision[];
};

export const LIVE_STATE_PREFIX = 'the12th:live:';

export function getLiveStateKey(matchId: string) { return `${LIVE_STATE_PREFIX}${matchId}`; }

export function getInitialLiveState(matchId: string): LiveMatchState {
  const match = matches.find((item) => item.id === matchId) ?? matches[0];
  return {
    meta: { minute: match.minute, homeScore: match.homeScore, awayScore: match.awayScore, status: match.status as LiveMatchMeta['status'] },
    events: demoEvents[matchId] ?? [],
    windows: demoWindows[matchId] ?? [],
    decisions: [],
  };
}

export function readLiveState(matchId: string): LiveMatchState {
  if (typeof window === 'undefined') return getInitialLiveState(matchId);
  try {
    const raw = window.localStorage.getItem(getLiveStateKey(matchId));
    if (!raw) return getInitialLiveState(matchId);
    const parsed = JSON.parse(raw) as Partial<LiveMatchState>;
    const initial = getInitialLiveState(matchId);
    return {
      meta: parsed.meta ?? initial.meta,
      events: parsed.events ?? initial.events,
      windows: parsed.windows ?? initial.windows,
      decisions: parsed.decisions ?? initial.decisions,
    };
  } catch { return getInitialLiveState(matchId); }
}

export function writeLiveState(matchId: string, state: LiveMatchState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getLiveStateKey(matchId), JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('the12th:live-update', { detail: { matchId } }));
}

export function resetLiveState(matchId: string) {
  if (typeof window === 'undefined') return;
  writeLiveState(matchId, getInitialLiveState(matchId));
}

export function resolveDecision(decision: LiveDecision, event: MatchEvent, fallbackOutcome: DecisionChoice) {
  const outcome = choiceForEvent(event.type) ?? fallbackOutcome;
  const points = scoreDecision(decision.choice, outcome, {
    decisionMinute: decision.minute,
    eventMinute: event.minute,
    eventType: event.type,
  });
  return { outcome, points, label: decision.choice === outcome ? 'DOĞRU' as const : 'YANLIŞ' as const };
}

export function choiceForEvent(type: MatchEventType): DecisionChoice | null {
  if (type === 'GOAL' || type === 'SHOT' || type === 'CHANCE') return 'PRESS';
  if (type === 'SUBSTITUTION') return 'CHANGE';
  if (type === 'CARD' || type === 'POSSESSION') return 'DROP';
  return null;
}
